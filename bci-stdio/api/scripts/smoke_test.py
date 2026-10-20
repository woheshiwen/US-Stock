#!/usr/bin/env python3
"""API smoke test for Belt Collins Stdio (dev auth)."""

from __future__ import annotations

import json
import sys
import time

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8200"


def main() -> int:
    c = httpx.Client(base_url=BASE, timeout=30.0)
    checks: list[tuple[str, bool, str]] = []

    def ok(name: str, cond: bool, detail: str = "") -> None:
        checks.append((name, cond, detail))
        print(("PASS" if cond else "FAIL"), name, detail[:160])

    r = c.get("/health")
    ok("health", r.status_code == 200 and r.json().get("status") == "ok", r.text)

    r = c.post("/auth/dev", json={"email": "qa@beltcollins.local", "name": "QA"})
    ok("dev login", r.status_code == 200 and "access_token" in r.json(), r.text)
    token = r.json().get("access_token", "")
    headers = {"Authorization": f"Bearer {token}"}

    r = c.get("/auth/me", headers=headers)
    ok("me", r.status_code == 200 and r.json().get("email") == "qa@beltcollins.local", r.text)

    r = c.post("/projects", headers=headers, json={"title": "Smoke Project", "brief": "test"})
    ok("create project", r.status_code == 200 and "id" in r.json(), r.text)
    pid = r.json().get("id")

    r = c.post(
        f"/projects/{pid}/agent",
        headers=headers,
        json={"message": "滨水度假夜景灯光怎么做"},
    )
    ok("agent", r.status_code == 200 and "reply" in r.json(), r.text[:200])

    r = c.post(
        "/generate",
        headers=headers,
        json={"project_id": pid, "prompt": "tropical resort arrival court", "tool": "inspire"},
    )
    ok("generate enqueue", r.status_code == 200 and r.json().get("status") == "running", r.text)
    gid = r.json().get("id")

    final = None
    for _ in range(40):
        time.sleep(1.5)
        g = c.get(f"/generate/{gid}", headers=headers)
        final = g.json()
        if final.get("status") in {"succeeded", "failed"}:
            break
    ok(
        "generate settle",
        bool(final) and final.get("status") in {"succeeded", "failed"},
        json.dumps(final, ensure_ascii=False)[:240] if final else "",
    )
    # Without OPENAI_API_KEY expect failed with clear message; with key expect succeeded.
    if final and final.get("status") == "failed":
        ok("generate error message", "OPENAI_API_KEY" in (final.get("error") or ""), final.get("error", ""))
    elif final and final.get("status") == "succeeded":
        ok("generate image url", bool(final.get("image_url")), str(final.get("image_url")))

    failed = [x for x in checks if not x[1]]
    print(json.dumps({"passed": len(checks) - len(failed), "failed": len(failed)}))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
