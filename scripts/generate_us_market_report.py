#!/usr/bin/env python3
"""
Generate US market closing daily report (Chinese) and write to reports/YYYY-MM-DD.md.
Designed for GitHub Actions; uses yfinance for market data.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd
import pytz
import yfinance as yf

try:
    import pandas_market_calendars as mcal
except ImportError:
    mcal = None

REPO_ROOT = Path(__file__).resolve().parents[1]
REPORTS_DIR = REPO_ROOT / "reports"

# Indices & benchmarks
INDICES = {
    "Dow Jones": "^DJI",
    "S&P 500": "^GSPC",
    "Nasdaq Composite": "^IXIC",
    "Nasdaq 100": "^NDX",
    "Russell 2000": "^RUT",
    "SOX": "^SOX",
    "VIX": "^VIX",
}

ETFS = {
    "SPY": "SPY",
    "QQQ": "QQQ",
    "IWM": "IWM",
    "SMH": "SMH",
    "IGV": "IGV",
}

SECTOR_ETFS = [
    ("信息技术", "XLK"),
    ("通信服务", "XLC"),
    ("可选消费", "XLY"),
    ("金融", "XLF"),
    ("工业", "XLI"),
    ("医疗保健", "XLV"),
    ("必需消费", "XLP"),
    ("能源", "XLE"),
    ("公用事业", "XLU"),
    ("材料", "XLB"),
    ("房地产", "XLRE"),
]

THEME_ETFS = [
    ("半导体", "SMH"),
    ("软件", "IGV"),
    ("小盘成长", "IWO"),
    ("小盘价值", "IWN"),
    ("等权标普", "RSP"),
]

MAG7 = [
    ("NVDA", "NVDA"),
    ("MSFT", "MSFT"),
    ("AAPL", "AAPL"),
    ("GOOGL", "GOOGL"),
    ("AMZN", "AMZN"),
    ("META", "META"),
    ("TSLA", "TSLA"),
]

WATCHLIST = [
    ("NVDA", "NVDA"),
    ("AMD", "AMD"),
    ("AVGO", "AVGO"),
    ("MRVL", "MRVL"),
    ("GOOGL", "GOOGL"),
    ("MSFT", "MSFT"),
    ("META", "META"),
    ("AMZN", "AMZN"),
    ("ORCL", "ORCL"),
    ("CRM", "CRM"),
    ("NOW", "NOW"),
    ("SNOW", "SNOW"),
    ("ADBE", "ADBE"),
    ("PANW", "PANW"),
    ("CRWD", "CRWD"),
    ("PLTR", "PLTR"),
    ("DDOG", "DDOG"),
    ("NET", "NET"),
    ("LITE", "LITE"),
    ("COHR", "COHR"),
    ("AAOI", "AAOI"),
    ("NOK", "NOK"),
    ("ANET", "ANET"),
    ("FLNC", "FLNC"),
    ("OKLO", "OKLO"),
    ("VST", "VST"),
    ("CEG", "CEG"),
    ("ETN", "ETN"),
    ("VRT", "VRT"),
    ("PWR", "PWR"),
    ("GEV", "GEV"),
    ("APLD", "APLD"),
    ("IREN", "IREN"),
]

YIELD_TICKERS = {
    "2Y": "^IRX",
    "5Y": "^FVX",
    "10Y": "^TNX",
    "30Y": "^TYX",
}

CROSS_ASSETS = {
    "DXY": "DX-Y.NYB",
    "黄金": "GC=F",
    "WTI": "CL=F",
    "Brent": "BZ=F",
    "比特币": "BTC-USD",
}


def last_nyse_session(as_of: date | None = None) -> date:
    """Return the most recent NYSE trading session on or before as_of (US/Eastern)."""
    et = pytz.timezone("America/New_York")
    if as_of is None:
        as_of = datetime.now(et).date()

    if mcal is not None:
        nyse = mcal.get_calendar("NYSE")
        start = as_of - timedelta(days=14)
        schedule = nyse.schedule(start_date=start, end_date=as_of)
        if schedule.empty:
            return as_of - timedelta(days=1)
        return schedule.index[-1].date()

    # Fallback: walk back weekdays
    d = as_of
    for _ in range(10):
        if d.weekday() < 5:
            return d
        d -= timedelta(days=1)
    return as_of


def fetch_history(
    tickers: list[str], session: date, lookback_days: int = 30
) -> dict[str, pd.DataFrame]:
    end = session + timedelta(days=1)
    start = session - timedelta(days=lookback_days)
    data = yf.download(
        tickers,
        start=start.isoformat(),
        end=end.isoformat(),
        group_by="ticker",
        auto_adjust=True,
        progress=False,
        threads=True,
    )
    result: dict[str, pd.DataFrame] = {}
    if len(tickers) == 1:
        t = tickers[0]
        if not data.empty:
            result[t] = data.copy()
        return result

    for t in tickers:
        try:
            df = data[t].dropna(how="all")
            if not df.empty:
                result[t] = df
        except (KeyError, TypeError):
            continue
    return result


def row_for_date(df: pd.DataFrame, session: date) -> pd.Series | None:
    if df is None or df.empty:
        return None
    idx = pd.to_datetime(df.index)
    if idx.tz is not None:
        idx = idx.tz_convert("America/New_York").tz_localize(None)
    df = df.copy()
    df.index = idx.normalize()
    target = pd.Timestamp(session)
    if target in df.index:
        return df.loc[target]
    # nearest prior
    prior = df.index[df.index <= target]
    if len(prior) == 0:
        return None
    return df.loc[prior[-1]]


def pct_change(session: date, df: pd.DataFrame) -> float | None:
    if df is None or df.empty:
        return None
    idx = pd.to_datetime(df.index).normalize()
    df = df.copy()
    df.index = idx
    target = pd.Timestamp(session)
    rows = df.index[df.index <= target]
    if len(rows) < 2:
        return None
    cur = df.loc[rows[-1], "Close"]
    prev = df.loc[rows[-2], "Close"]
    if prev and prev != 0:
        return (float(cur) / float(prev) - 1.0) * 100.0
    return None


def fmt_price(v: Any, decimals: int = 2) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "暂无可靠数据"
    return f"{float(v):,.{decimals}f}"


def fmt_pct(v: float | None) -> str:
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "暂无可靠数据"
    sign = "+" if v >= 0 else ""
    return f"{sign}{v:.2f}%"


def trend_tag(pct: float | None) -> str:
    if pct is None:
        return "需要观察"
    if pct >= 3:
        return "继续强势"
    if pct >= 1:
        return "高位震荡"
    if pct <= -3:
        return "破位风险"
    if pct <= -1:
        return "回踩支撑"
    return "需要观察"


def build_report(session: date, generated_at: datetime) -> str:
    all_tickers = list(
        dict.fromkeys(
            list(INDICES.values())
            + list(ETFS.values())
            + [s[1] for s in SECTOR_ETFS]
            + [s[1] for s in THEME_ETFS]
            + [s[1] for s in MAG7]
            + [s[1] for s in WATCHLIST]
            + list(YIELD_TICKERS.values())
            + list(CROSS_ASSETS.values())
        )
    )
    hist = fetch_history(all_tickers, session, lookback_days=45)

    beijing = pytz.timezone("Asia/Shanghai")
    gen_bj = generated_at.astimezone(beijing).strftime("%Y-%m-%d %H:%M %Z")

    lines: list[str] = []
    lines.append(f"# 美股收盘日报｜{session.isoformat()}")
    lines.append("")
    lines.append(
        f"**数据截至：** {session.isoformat()} 美股常规时段收盘（自动抓取）  "
    )
    lines.append(f"**生成时间：** {gen_bj}  ")
    lines.append(
        "**说明：** 本报告由 GitHub Actions 定时任务自动生成，数据来自 Yahoo Finance。"
        "部分宏观/宽度/新闻字段需人工或后续版本补充。不构成投资建议。"
    )
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 0. 今日一句话总结")
    lines.append("")

    sp = hist.get("^GSPC")
    sp_pct = pct_change(session, sp) if sp is not None else None
    vix_df = hist.get("^VIX")
    vix_row = row_for_date(vix_df, session) if vix_df is not None else None
    vix_pct = pct_change(session, vix_df) if vix_df is not None else None

    if sp_pct is not None:
        direction = "上涨" if sp_pct > 0 else ("下跌" if sp_pct < 0 else "震荡")
        lines.append(
            f"- **大盘：** 标普500 前一交易日收盘变动约 **{fmt_pct(sp_pct)}**，整体偏 **{direction}**。"
        )
    else:
        lines.append("- **大盘：** 暂无可靠数据。")

    if vix_pct is not None and vix_row is not None:
        vix_level = float(vix_row["Close"])
        risk = "risk-on" if vix_pct < 0 and vix_level < 20 else "需观察"
        lines.append(
            f"- **波动率：** VIX 约 **{vix_level:.2f}**（日变动 {fmt_pct(vix_pct)}），风险偏好 **{risk}**。"
        )

    lines.append(
        "- **完整深度复盘（财报叙事、机构观点等）** 可在 Cursor 中按需触发人工/Agent 增强版。"
    )
    lines.append("")
    lines.append(
        f"**今日市场状态（自动摘要）：** "
        f"指数{('偏强' if sp_pct and sp_pct > 0 else '偏弱' if sp_pct and sp_pct < 0 else '中性')}；"
        "详见下方数据表。"
    )
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 1. 大盘表现总览")
    lines.append("")
    lines.append(
        "| 指数 / 指标 | 收盘 | 日涨跌 | 备注 |"
    )
    lines.append("|---|---|---|---|")

    for name, ticker in INDICES.items():
        df = hist.get(ticker)
        row = row_for_date(df, session) if df is not None else None
        chg = pct_change(session, df) if df is not None else None
        close = fmt_price(row["Close"]) if row is not None else "暂无可靠数据"
        lines.append(f"| {name} | {close} | {fmt_pct(chg)} | {ticker} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 3. 宏观环境（自动抓取部分）")
    lines.append("")
    lines.append("### 3.1 美债收益率（^TNX 等为收益率×1 的指数近似）")
    lines.append("")
    lines.append("| 期限 | 代理标的 | 最新 | 日变化 |")
    lines.append("|---|---|---|---|")
    for label, ticker in YIELD_TICKERS.items():
        df = hist.get(ticker)
        row = row_for_date(df, session) if df is not None else None
        chg = pct_change(session, df) if df is not None else None
        # ^TNX is already in percent terms (e.g. 4.56)
        val = fmt_price(row["Close"]) if row is not None else "暂无可靠数据"
        lines.append(f"| {label} | {ticker} | {val} | {fmt_pct(chg)} |")

    lines.append("")
    lines.append("### 3.3 美元、商品、加密货币")
    lines.append("")
    lines.append("| 资产 | 标的 | 最新 | 日涨跌 |")
    lines.append("|---|---|---|---|")
    for name, ticker in CROSS_ASSETS.items():
        df = hist.get(ticker)
        row = row_for_date(df, session) if df is not None else None
        chg = pct_change(session, df) if df is not None else None
        close = fmt_price(row["Close"]) if row is not None else "暂无可靠数据"
        lines.append(f"| {name} | {ticker} | {close} | {fmt_pct(chg)} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 4. 板块表现（SPDR 行业 ETF）")
    lines.append("")
    lines.append("| 板块 | ETF | 日涨跌 |")
    lines.append("|---|---|---|")

    sector_changes: list[tuple[str, str, float]] = []
    for name, ticker in SECTOR_ETFS:
        df = hist.get(ticker)
        chg = pct_change(session, df) if df is not None else None
        lines.append(f"| {name} | {ticker} | {fmt_pct(chg)} |")
        if chg is not None:
            sector_changes.append((name, ticker, chg))

    if sector_changes:
        best = max(sector_changes, key=lambda x: x[2])
        worst = min(sector_changes, key=lambda x: x[2])
        lines.append("")
        lines.append(
            f"**当日最强板块：** {best[0]}（{best[1]} {fmt_pct(best[2])}）  "
        )
        lines.append(
            f"**当日最弱板块：** {worst[0]}（{worst[1]} {fmt_pct(worst[2])}）"
        )

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 5. 主题与风格 ETF")
    lines.append("")
    lines.append("| 主题 | ETF | 日涨跌 |")
    lines.append("|---|---|---|")
    for name, ticker in THEME_ETFS:
        df = hist.get(ticker)
        chg = pct_change(session, df) if df is not None else None
        lines.append(f"| {name} | {ticker} | {fmt_pct(chg)} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 8. 大型科技七巨头")
    lines.append("")
    lines.append("| 股票 | 日涨跌 | 收盘 | 自动判断 |")
    lines.append("|---|---|---|---|")
    for name, ticker in MAG7:
        df = hist.get(ticker)
        chg = pct_change(session, df) if df is not None else None
        row = row_for_date(df, session) if df is not None else None
        close = fmt_price(row["Close"]) if row is not None else "暂无可靠数据"
        tag = trend_tag(chg)
        lines.append(f"| {name} | {fmt_pct(chg)} | {close} | {tag} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 12. 重点关注股观察")
    lines.append("")
    lines.append("| 股票 | 日涨跌 | 收盘 | 我的判断 |")
    lines.append("|---|---|---|---|")
    for name, ticker in WATCHLIST:
        df = hist.get(ticker)
        chg = pct_change(session, df) if df is not None else None
        row = row_for_date(df, session) if df is not None else None
        close = fmt_price(row["Close"]) if row is not None else "暂无可靠数据"
        tag = trend_tag(chg)
        lines.append(f"| {name} | {fmt_pct(chg)} | {close} | {tag} |")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append("## 15. 最终结论（自动生成）")
    lines.append("")
    lines.append("本段为规则摘要，非深度研报。")
    lines.append("")
    if sp_pct is not None:
        if sp_pct > 0.3:
            phase = "偏强趋势 / 高位震荡（需结合宽度与宏观）"
        elif sp_pct < -0.3:
            phase = "偏弱或健康回调"
        else:
            phase = "窄幅震荡"
        lines.append(f"- **指数日变动：** {fmt_pct(sp_pct)} → **阶段判断：** {phase}")
    lines.append(
        "- **操作倾向（观察）：** 自动报告仅作数据复盘；重大财报、地缘与 Fed 信息请结合人工版日报。"
    )
    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append(
        "*由 [`scripts/generate_us_market_report.py`](../scripts/generate_us_market_report.py) "
        "生成 · [GitHub Actions 工作流](../.github/workflows/us-market-daily.yml)*"
    )

    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--date",
        help="NYSE session date YYYY-MM-DD (default: last NYSE session)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print report path only, do not write file",
    )
    args = parser.parse_args()

    if args.date:
        session = date.fromisoformat(args.date)
    else:
        session = last_nyse_session()

    et = pytz.timezone("America/New_York")
    generated_at = datetime.now(et)

    report = build_report(session, generated_at)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = REPORTS_DIR / f"{session.isoformat()}.md"

    if args.dry_run:
        print(out_path)
        print(report[:2000])
        return 0

    out_path.write_text(report, encoding="utf-8")
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
