#!/usr/bin/env python3
"""
Generate the full 15-section Chinese US market daily report (Cursor parity)
using structured market data + optional web context + OpenAI API.
"""

from __future__ import annotations

import json
import os
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_market_data import build_data, last_nyse_session

REPO_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = REPO_ROOT / "reports"
SPEC_PATH = REPO_ROOT / "templates" / "REPORT_SPEC_zh.md"
STYLE_PATH = REPO_ROOT / "templates" / "STYLE_REFERENCE_zh.md"

WATCHLIST_JUDGMENT_TAGS = [
    "继续强势",
    "高位震荡",
    "短线过热",
    "回踩支撑",
    "破位风险",
    "等财报催化",
    "利好兑现",
    "低位修复",
    "需要观察",
]

MARKET_PHASES = [
    "强趋势上涨",
    "高位震荡",
    "健康回调",
    "板块轮动",
    "风险偏好下降",
    "普跌恐慌",
    "超跌反弹",
]

ROTATION_STATES = [
    "AI 硬件主升浪",
    "AI 硬件高位震荡",
    "AI 硬件利好钝化",
    "软件补涨 / 估值修复",
    "高切低",
    "风险资产全面 risk-on",
    "防御性 risk-off",
    "宽度扩散",
    "指数强、内部弱",
    "普跌恐慌",
    "超跌反弹",
]


def load_text(path: Path) -> str:
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def build_system_prompt() -> str:
    return """你是一名专业的美股市场日报分析师、宏观策略分析师和科技成长股研究员。
你将根据用户提供的 REPORT_SPEC（章节结构）与 DATA_JSON（已抓取数据）撰写完整《美股收盘日报》。

硬性规则：
1. 章节 0–15、表格列名、排版层级必须与 REPORT_SPEC 及 STYLE_REFERENCE 一致。
2. 所有数字必须来自 DATA_JSON 或 WEB_CONTEXT；禁止编造。缺失写「暂无可靠数据」。
3. 关键数据标注来源（优先 DATA_JSON.sources 与条目内 source/link）。
4. 判断类型标注：【事实】【推断】【判断】【待观察】。
5. 不构成投资建议；「我的操作倾向」「我的判断」仅用观察与风险控制表述。
6. 关注池股票必须全部出现在第 12 节；NOK 等须在 8.2/8.5 有异动时写明催化。
7. 全文中文，专业、数据驱动，与 Cursor 手动生成的完整日报同等详细度（非摘要版）。
"""


def build_user_prompt(session: date, spec: str, style: str, data: dict) -> str:
    data_str = json.dumps(data, ensure_ascii=False, indent=2)
    # Trim extremely large payloads for token safety (keep all watchlist keys)
    if len(data_str) > 120_000:
        data_str = data_str[:120_000] + "\n... [DATA_JSON truncated for token limit]"

    return f"""请生成：美股收盘日报｜{session.isoformat()}

北京时间生成时间（来自数据包）：{data.get("generated_at_beijing")}

=== REPORT_SPEC ===
{spec}

=== STYLE_REFERENCE（排版与叙述深度参考，数据以 DATA_JSON 为准）===
{style}

=== DATA_JSON ===
{data_str}

=== 固定股票池（第 12 节必须逐只覆盖）===
核心科技/AI：NVDA、AMD、AVGO、MRVL、GOOGL、MSFT、META、AMZN、ORCL
软件：CRM、NOW、SNOW、ADBE、PANW、CRWD、PLTR、DDOG、NET
光通信：LITE、COHR、AAOI、TSEM、NOK、MRVL、AVGO、ANET
电力/数据中心：FLNC、OKLO、VST、CEG、ETN、VRT、PWR、GEV、APLD、IREN

「我的判断」只能使用：{", ".join(WATCHLIST_JUDGMENT_TAGS)}
「当前市场阶段」只能选：{", ".join(MARKET_PHASES)}
第 11 节轮动状态从此列表选择并说明理由：{", ".join(ROTATION_STATES)}

请输出完整 Markdown，不要省略章节，不要用「详见上文」代替表格。"""


def call_openai(system: str, user: str) -> str:
    api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError(
            "未配置 OPENAI_API_KEY。完整日报与 Cursor 手动版一致需 LLM 生成；"
            "请在 GitHub → Settings → Secrets → Actions 添加 OPENAI_API_KEY。"
        )

    model = os.environ.get("OPENAI_MODEL", "gpt-4o").strip()
    base_url = os.environ.get("OPENAI_BASE_URL", "").strip() or None

    try:
        from openai import OpenAI
    except ImportError as e:
        raise RuntimeError("请安装 openai 包") from e

    client = OpenAI(api_key=api_key, base_url=base_url)
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.35,
        max_tokens=int(os.environ.get("OPENAI_MAX_TOKENS", "16000")),
    )
    content = resp.choices[0].message.content
    if not content:
        raise RuntimeError("OpenAI 返回空内容")
    return content.strip()


def strip_code_fence(text: str) -> str:
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        return "\n".join(lines).strip()
    return text


def main() -> int:
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--date")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    session = date.fromisoformat(args.date) if args.date else last_nyse_session()
    spec = load_text(SPEC_PATH)
    style = load_text(STYLE_PATH)
    if not spec:
        raise RuntimeError(f"缺少模板文件: {SPEC_PATH}")

    data = build_data(session)
    system = build_system_prompt()
    user = build_user_prompt(session, spec, style, data)

    if args.dry_run:
        print(f"session={session} user_chars={len(user)}")
        return 0

    report = strip_code_fence(call_openai(system, user))

    footer = (
        f"\n\n---\n\n*自动生成 · 数据包截至 {session.isoformat()} · "
        f"[工作流](.github/workflows/us-market-daily.yml) · "
        "与 Cursor 手动版同规范（需 OPENAI_API_KEY + 可选 FRED/SERPER）*"
    )
    if footer.strip() not in report:
        report += footer

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out = REPORTS_DIR / f"{session.isoformat()}.md"
    out.write_text(report, encoding="utf-8")
    print(f"Wrote {out} ({len(report)} chars)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
