#!/usr/bin/env python3
"""Smoke-test all API Router Server endpoints against a running server."""

from __future__ import annotations

import json
import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8100"
TOKEN = "dev-internal-token"


def main() -> int:
    c = httpx.Client(base_url=BASE, timeout=10.0)
    checks: list[tuple[str, bool, str]] = []

    def ok(name: str, cond: bool, detail: str = "") -> None:
        checks.append((name, cond, detail))
        mark = "PASS" if cond else "FAIL"
        print(f"[{mark}] {name}" + (f" — {detail}" if detail else ""))

    r = c.get("/")
    ok("GET /", r.status_code == 200 and "routers" in r.json(), r.text[:120])

    r = c.get("/health")
    ok("GET /health", r.status_code == 200 and r.json().get("status") == "ok", r.text[:120])

    r = c.get("/users")
    ok("GET /users", r.status_code == 200 and r.json().get("count", 0) >= 8, r.text[:120])

    r = c.get("/clients")
    ok("GET /clients", r.status_code == 200 and r.json().get("count", 0) >= 1, r.text[:160])

    r = c.post(
        "/clients",
        json={
            "company_name": "测试撞单客户A",
            "track": "产业园区",
            "level": "L1",
            "city": "广州",
            "assigned_to": 2,
        },
    )
    ok("POST /clients create", r.status_code == 200 and r.json().get("created") is True, r.text[:160])
    client_id = r.json().get("client", {}).get("id")

    r = c.post(
        "/clients",
        json={"company_name": "测试撞单客户A", "track": "产业园区", "assigned_to": 3},
    )
    ok("POST /clients collision", r.status_code == 200 and r.json().get("warning") == "撞单预警", r.text[:160])

    r = c.post(
        "/interactions",
        json={
            "client_id": client_id,
            "user_id": 2,
            "summary": "电话沟通，对方关注专项债政策",
            "interaction_type": "电话",
            "next_action": "发案例册",
        },
    )
    ok("POST /interactions", r.status_code == 200 and r.json().get("created") is True, r.text[:160])

    r = c.get(f"/clients/{client_id}/timeline")
    ok(
        "GET /clients/{id}/timeline",
        r.status_code == 200 and len(r.json().get("interactions", [])) >= 1,
        r.text[:160],
    )

    r = c.get("/leads")
    ok("GET /leads", r.status_code == 200 and r.json().get("count", 0) >= 1, r.text[:160])

    r = c.get("/wecom/callback", params={"echostr": "ping-echo"})
    ok("GET /wecom/callback", r.status_code == 200 and r.text == "ping-echo", r.text[:80])

    r = c.get("/internal/clients", headers={"X-Internal-Token": TOKEN}, params={"user_id": 8})
    ok("GET /internal/clients", r.status_code == 200 and "clients" in r.json(), r.text[:160])

    r = c.get("/internal/clients")
    ok("GET /internal/clients unauthorized", r.status_code == 401, r.text[:80])

    r = c.post("/ai/ask", json={"question": "华润", "user_id": 8})
    ok("POST /ai/ask", r.status_code == 200 and "answer" in r.json(), r.text[:200])

    failed = [c for c in checks if not c[1]]
    print(json.dumps({"passed": len(checks) - len(failed), "failed": len(failed)}, ensure_ascii=False))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
