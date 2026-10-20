"""Real image generation providers (OpenAI primary, fal.ai optional)."""

from __future__ import annotations

import base64
from pathlib import Path

import httpx

from app.config import settings
from app.db import OUTPUT_DIR


class GenerationError(RuntimeError):
    pass


async def generate_image(*, prompt: str, generation_id: str, style_hint: str = "") -> dict:
    provider = (settings.image_provider or "openai").lower()
    full_prompt = _landscape_prompt(prompt, style_hint)

    if provider == "fal":
        return await _generate_fal(full_prompt, generation_id)
    return await _generate_openai(full_prompt, generation_id)


def _landscape_prompt(prompt: str, style_hint: str) -> str:
    base = (
        "Professional landscape architecture visualization for Belt Collins. "
        "Photoreal site design render, coherent planting, materials, topography, and lighting. "
        "No text overlays, no watermarks, no UI chrome."
    )
    parts = [base, prompt.strip()]
    if style_hint.strip():
        parts.append(f"Style direction: {style_hint.strip()}")
    return " ".join(parts)


async def _generate_openai(prompt: str, generation_id: str) -> dict:
    if not settings.openai_api_key:
        raise GenerationError(
            "OPENAI_API_KEY is not set. Add it to bci-stdio/api/.env to enable real generation."
        )

    model = settings.openai_image_model or "dall-e-3"
    size = settings.openai_image_size or "1024x1024"

    # dall-e-3 uses the Images API; dall-e-3 also supported.
    payload = {
        "model": model,
        "prompt": prompt,
        "size": size,
        "n": 1,
    }
    # Response format differs slightly by model family.
    if model.startswith("dall-e"):
        payload["response_format"] = "b64_json"

    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/images/generations",
            headers={
                "Authorization": f"Bearer {settings.openai_api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
        )

    if resp.status_code >= 400:
        raise GenerationError(f"OpenAI error {resp.status_code}: {resp.text[:500]}")

    data = resp.json()
    item = (data.get("data") or [None])[0]
    if not item:
        raise GenerationError("OpenAI returned empty image data")

    out_path = OUTPUT_DIR / f"{generation_id}.png"
    if item.get("b64_json"):
        out_path.write_bytes(base64.b64decode(item["b64_json"]))
    elif item.get("url"):
        async with httpx.AsyncClient(timeout=120.0) as client:
            img = await client.get(item["url"])
        if img.status_code >= 400:
            raise GenerationError("Failed to download OpenAI image URL")
        out_path.write_bytes(img.content)
    else:
        raise GenerationError("OpenAI response missing b64_json/url")

    return {
        "provider": "openai",
        "model": model,
        "image_path": str(out_path),
        "relative_url": f"/outputs/{out_path.name}",
    }


async def _generate_fal(prompt: str, generation_id: str) -> dict:
    if not settings.fal_key:
        raise GenerationError("FAL_KEY is not set")

    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(
            "https://fal.run/fal-ai/flux/dev",
            headers={
                "Authorization": f"Key {settings.fal_key}",
                "Content-Type": "application/json",
            },
            json={"prompt": prompt, "image_size": "square_hd", "num_images": 1},
        )
    if resp.status_code >= 400:
        raise GenerationError(f"fal.ai error {resp.status_code}: {resp.text[:500]}")
    data = resp.json()
    images = data.get("images") or []
    if not images:
        raise GenerationError("fal.ai returned no images")
    url = images[0].get("url")
    if not url:
        raise GenerationError("fal.ai image missing url")

    out_path = OUTPUT_DIR / f"{generation_id}.png"
    async with httpx.AsyncClient(timeout=120.0) as client:
        img = await client.get(url)
    out_path.write_bytes(img.content)
    return {
        "provider": "fal",
        "model": "flux/dev",
        "image_path": str(out_path),
        "relative_url": f"/outputs/{out_path.name}",
    }


def absolute_output(path: str | None) -> Path | None:
    if not path:
        return None
    return Path(path)
