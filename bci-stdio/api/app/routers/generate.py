from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel, Field

from app.auth import AuthUser, CurrentUser
from app.db import connect, dumps, new_id, now, row_to_dict
from app.services.generate import GenerationError, generate_image

router = APIRouter(prefix="/generate", tags=["generate"])


class GenerateBody(BaseModel):
    project_id: str
    prompt: str = Field(min_length=1, max_length=4000)
    tool: str = "inspire"
    style_hint: str = ""
    negative_prompt: str = ""


def _run_generation(generation_id: str, prompt: str, style_hint: str) -> None:
    try:
        import asyncio

        result = asyncio.run(generate_image(prompt=prompt, generation_id=generation_id, style_hint=style_hint))
        with connect() as conn:
            conn.execute(
                """
                UPDATE generations
                SET status = 'succeeded', provider = ?, model = ?, image_path = ?, meta_json = ?, error = NULL
                WHERE id = ?
                """,
                (
                    result["provider"],
                    result["model"],
                    result["image_path"],
                    dumps({"relative_url": result["relative_url"]}),
                    generation_id,
                ),
            )
            conn.commit()
    except GenerationError as exc:
        with connect() as conn:
            conn.execute(
                "UPDATE generations SET status = 'failed', error = ? WHERE id = ?",
                (str(exc), generation_id),
            )
            conn.commit()
    except Exception as exc:  # noqa: BLE001
        with connect() as conn:
            conn.execute(
                "UPDATE generations SET status = 'failed', error = ? WHERE id = ?",
                (f"unexpected: {exc}", generation_id),
            )
            conn.commit()


@router.post("")
def create_generation(
    body: GenerateBody,
    background: BackgroundTasks,
    user: AuthUser = CurrentUser,
):
    with connect() as conn:
        proj = conn.execute(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (body.project_id, user.id),
        ).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="project not found")

        gid = new_id("g_")
        conn.execute(
            """
            INSERT INTO generations
              (id, project_id, user_id, tool, prompt, negative_prompt, status, created_at)
            VALUES (?,?,?,?,?,?,?,?)
            """,
            (
                gid,
                body.project_id,
                user.id,
                body.tool,
                body.prompt,
                body.negative_prompt,
                "running",
                now(),
            ),
        )
        conn.execute(
            "UPDATE projects SET updated_at = ? WHERE id = ?",
            (now(), body.project_id),
        )
        conn.commit()

    background.add_task(_run_generation, gid, body.prompt, body.style_hint)
    return {"id": gid, "status": "running"}


@router.get("/{generation_id}")
def get_generation(generation_id: str, user: AuthUser = CurrentUser):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM generations WHERE id = ? AND user_id = ?",
            (generation_id, user.id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="generation not found")
    item = row_to_dict(row)
    assert item
    if item.get("image_path"):
        name = item["image_path"].rsplit("/", 1)[-1]
        item["image_url"] = f"/outputs/{name}"
    return item
