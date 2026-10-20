from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.auth import AuthUser, CurrentUser
from app.db import connect, dumps, new_id, now, row_to_dict

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    brief: str = ""


class ProjectUpdate(BaseModel):
    title: str | None = None
    brief: str | None = None


class AgentAsk(BaseModel):
    message: str = Field(min_length=1)


@router.get("")
def list_projects(user: AuthUser = CurrentUser):
    with connect() as conn:
        rows = conn.execute(
            """
            SELECT p.*,
              (SELECT COUNT(*) FROM generations g WHERE g.project_id = p.id) AS generation_count
            FROM projects p
            WHERE p.user_id = ?
            ORDER BY p.updated_at DESC
            """,
            (user.id,),
        ).fetchall()
    return {"projects": [dict(r) for r in rows]}


@router.post("")
def create_project(body: ProjectCreate, user: AuthUser = CurrentUser):
    pid = new_id("p_")
    ts = now()
    with connect() as conn:
        conn.execute(
            "INSERT INTO projects (id, user_id, title, brief, created_at, updated_at) VALUES (?,?,?,?,?,?)",
            (pid, user.id, body.title, body.brief, ts, ts),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (pid,)).fetchone()
    return row_to_dict(row)


@router.get("/{project_id}")
def get_project(project_id: str, user: AuthUser = CurrentUser):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user.id),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="project not found")
    return row_to_dict(row)


@router.patch("/{project_id}")
def update_project(project_id: str, body: ProjectUpdate, user: AuthUser = CurrentUser):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user.id),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="project not found")
        title = body.title if body.title is not None else row["title"]
        brief = body.brief if body.brief is not None else row["brief"]
        conn.execute(
            "UPDATE projects SET title = ?, brief = ?, updated_at = ? WHERE id = ?",
            (title, brief, now(), project_id),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (project_id,)).fetchone()
    return row_to_dict(row)


@router.get("/{project_id}/generations")
def list_generations(project_id: str, user: AuthUser = CurrentUser):
    with connect() as conn:
        proj = conn.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user.id),
        ).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="project not found")
        rows = conn.execute(
            """
            SELECT id, project_id, tool, prompt, status, provider, model,
                   image_path, error, meta_json, created_at
            FROM generations
            WHERE project_id = ?
            ORDER BY created_at DESC
            LIMIT 100
            """,
            (project_id,),
        ).fetchall()
    items = []
    for r in rows:
        item = dict(r)
        if item.get("image_path"):
            name = item["image_path"].rsplit("/", 1)[-1]
            item["image_url"] = f"/outputs/{name}"
        items.append(item)
    return {"generations": items}


@router.get("/{project_id}/agent")
def list_agent_messages(project_id: str, user: AuthUser = CurrentUser):
    with connect() as conn:
        proj = conn.execute(
            "SELECT id FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user.id),
        ).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="project not found")
        rows = conn.execute(
            """
            SELECT id, role, content, created_at
            FROM agent_messages
            WHERE project_id = ?
            ORDER BY created_at ASC
            LIMIT 200
            """,
            (project_id,),
        ).fetchall()
    return {"messages": [dict(r) for r in rows]}


@router.post("/{project_id}/agent")
def ask_agent(project_id: str, body: AgentAsk, user: AuthUser = CurrentUser):
    with connect() as conn:
        proj = conn.execute(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?",
            (project_id, user.id),
        ).fetchone()
        if not proj:
            raise HTTPException(status_code=404, detail="project not found")

        uid_msg = new_id("m_")
        ts = now()
        conn.execute(
            "INSERT INTO agent_messages (id, project_id, user_id, role, content, created_at) VALUES (?,?,?,?,?,?)",
            (uid_msg, project_id, user.id, "user", body.message, ts),
        )

        # Landscape-specialist heuristic reply (Phase B). Can later forward to LLM.
        reply = _landscape_agent_reply(body.message, proj["title"], proj["brief"] or "")
        aid = new_id("m_")
        conn.execute(
            "INSERT INTO agent_messages (id, project_id, user_id, role, content, created_at) VALUES (?,?,?,?,?,?)",
            (aid, project_id, user.id, "assistant", reply, now()),
        )
        conn.execute("UPDATE projects SET updated_at = ? WHERE id = ?", (now(), project_id))
        conn.commit()

    return {"reply": reply, "user_message_id": uid_msg, "assistant_message_id": aid}


def _landscape_agent_reply(message: str, title: str, brief: str) -> str:
    lower = message.lower()
    tips = []
    if any(k in lower for k in ["水", "water", "湖", "池", "fountain"]):
        tips.append("强化水体层次：近岸浅滩种植 + 中景倒影面 + 远景天际线，避免单一镜面水池。")
    if any(k in lower for k in ["夜", "night", "灯光", "light"]):
        tips.append("夜景建议暖白主光 + 低位灌木洗墙，少用高杆泛光，突出树冠剪影。")
    if any(k in lower for k in ["热带", "resort", "度假", "palm"]):
        tips.append("度假向：棕榈科作竖向节奏，地被用大色块，硬质控制在米白/砂岩，减少高对比花色。")
    if any(k in lower for k in ["社区", "residential", "居住", "归家"]):
        tips.append("归家动线：入口仪式感乔木对景 → 林荫慢行 → 宅间花园，分级减少车行视觉干扰。")
    if not tips:
        tips.append("先定场地气质（度假 / 都市社区 / 滨水公园），再选种植结构与硬质比例。")
        tips.append("出图时可在提示词写清：季节、日照、相机高度（人视/航拍）、材料（石材/木材/金属）。")

    ctx = f"项目「{title}」"
    if brief:
        ctx += f"（{brief[:80]}）"
    return (
        f"{ctx}｜景观设计助手建议：\n"
        + "\n".join(f"- {t}" for t in tips)
        + "\n\n可直接把上面方向粘贴到 Inspire 提示词，或告诉我场地照片里要改的区域。"
    )
