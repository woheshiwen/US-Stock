#!/usr/bin/env python3
"""Collect multi-source market data for the full US daily report."""

from __future__ import annotations

import json
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any

import pandas as pd
import pytz
import requests
import yfinance as yf

try:
    import pandas_market_calendars as mcal
except ImportError:
    mcal = None

REPO_ROOT = Path(__file__).resolve().parents[1]

INDICES = {
    "Dow Jones": "^DJI",
    "S&P 500": "^GSPC",
    "Nasdaq Composite": "^IXIC",
    "Nasdaq 100": "^NDX",
    "Russell 2000": "^RUT",
    "SOX": "^SOX",
    "VIX": "^VIX",
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
    ("网络安全", "CIBR"),
    ("云计算", "WCLD"),
    ("AI/自动化", "BOTZ"),
    ("小盘成长", "IWO"),
    ("小盘价值", "IWN"),
    ("等权标普", "RSP"),
    ("大盘成长", "QQQ"),
    ("大盘价值", "VTV"),
]

MAG7 = ["NVDA", "MSFT", "AAPL", "GOOGL", "AMZN", "META", "TSLA"]

WATCHLIST = [
    "NVDA", "AMD", "AVGO", "MRVL", "GOOGL", "MSFT", "META", "AMZN", "ORCL",
    "CRM", "NOW", "SNOW", "ADBE", "PANW", "CRWD", "PLTR", "DDOG", "NET",
    "LITE", "COHR", "AAOI", "TSEM", "NOK", "ANET",
    "FLNC", "OKLO", "VST", "CEG", "ETN", "VRT", "PWR", "GEV", "APLD", "IREN",
]

AI_HW = [
    "NVDA", "AMD", "AVGO", "MRVL", "MU", "TSM", "ASML", "ARM", "INTC", "QCOM",
    "SMCI", "DELL", "HPE", "ANET", "VRT", "COHR", "LITE", "AAOI", "TSEM",
]

SOFTWARE = [
    "CRM", "NOW", "SNOW", "ORCL", "ADBE", "PANW", "CRWD", "DDOG", "NET",
    "MDB", "PLTR", "WDAY", "INTU", "SHOP",
]

POWER = [
    "CEG", "VST", "NRG", "ETN", "PWR", "GEV", "VRT", "FLNC", "OKLO", "NEE",
]

FRED_SERIES = {
    "UMCSENT": "密歇根消费者信心指数",
    "DGS2": "2年期美债收益率",
    "DGS10": "10年期美债收益率",
    "DGS30": "30年期美债收益率",
    "T10Y2Y": "10年-2年利差",
}

CROSS = {
    "DXY": "DX-Y.NYB",
    "黄金": "GC=F",
    "WTI": "CL=F",
    "Brent": "BZ=F",
    "比特币": "BTC-USD",
    "以太坊": "ETH-USD",
}

TECH_TICKERS = ["SPY", "QQQ", "IWM", "SMH", "IGV", "XLK", "XLC", "XLY"]


def last_nyse_session(as_of: date | None = None) -> date:
    et = pytz.timezone("America/New_York")
    if as_of is None:
        as_of = datetime.now(et).date()
    if mcal is not None:
        nyse = mcal.get_calendar("NYSE")
        start = as_of - timedelta(days=14)
        schedule = nyse.schedule(start_date=start, end_date=as_of)
        if not schedule.empty:
            return schedule.index[-1].date()
    d = as_of
    for _ in range(10):
        if d.weekday() < 5:
            return d
        d -= timedelta(days=1)
    return as_of


def _normalize_df(df: pd.DataFrame) -> pd.DataFrame:
    idx = pd.to_datetime(df.index)
    if idx.tz is not None:
        idx = idx.tz_convert("America/New_York").tz_localize(None)
    out = df.copy()
    out.index = idx.normalize()
    return out


def download(tickers: list[str], start: date, end: date) -> dict[str, pd.DataFrame]:
    unique = list(dict.fromkeys(tickers))
    raw = yf.download(
        unique,
        start=start.isoformat(),
        end=(end + timedelta(days=1)).isoformat(),
        group_by="ticker",
        auto_adjust=True,
        progress=False,
        threads=True,
    )
    out: dict[str, pd.DataFrame] = {}
    if len(unique) == 1:
        t = unique[0]
        if not raw.empty:
            out[t] = _normalize_df(raw)
        return out
    for t in unique:
        try:
            sub = raw[t].dropna(how="all")
            if not sub.empty:
                out[t] = _normalize_df(sub)
        except (KeyError, TypeError):
            continue
    return out


def row_on(df: pd.DataFrame, session: date) -> pd.Series | None:
    if df is None or df.empty:
        return None
    df = _normalize_df(df)
    ts = pd.Timestamp(session)
    if ts in df.index:
        return df.loc[ts]
    prior = df.index[df.index <= ts]
    return df.loc[prior[-1]] if len(prior) else None


def pct_between(df: pd.DataFrame, session: date, offset_days: int) -> float | None:
    if df is None or df.empty:
        return None
    df = _normalize_df(df)
    ts = pd.Timestamp(session)
    rows = df.index[df.index <= ts]
    if len(rows) <= offset_days:
        return None
    cur = float(df.loc[rows[-1], "Close"])
    prev = float(df.loc[rows[-1 - offset_days], "Close"])
    if prev == 0:
        return None
    return (cur / prev - 1.0) * 100.0


def compute_rsi(close: pd.Series, period: int = 14) -> float | None:
    if close is None or len(close) < period + 1:
        return None
    delta = close.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.rolling(period).mean()
    avg_loss = loss.rolling(period).mean()
    rs = avg_gain / avg_loss.replace(0, pd.NA)
    rsi = 100 - (100 / (1 + rs))
    val = rsi.iloc[-1]
    return float(val) if pd.notna(val) else None


def quote_payload(ticker: str, df: pd.DataFrame, session: date) -> dict[str, Any]:
    row = row_on(df, session)
    if row is None:
        return {"ticker": ticker, "error": "no_data"}
    prev_row = None
    dfn = _normalize_df(df)
    rows = dfn.index[dfn.index <= pd.Timestamp(session)]
    if len(rows) >= 2:
        prev_row = dfn.loc[rows[-2]]
    close = float(row["Close"])
    chg_pct = None
    if prev_row is not None:
        p = float(prev_row["Close"])
        if p:
            chg_pct = (close / p - 1.0) * 100.0
    vol = row.get("Volume")
    vol_prev = prev_row.get("Volume") if prev_row is not None else None
    vol_chg = None
    if vol is not None and vol_prev not in (None, 0) and not pd.isna(vol_prev):
        try:
            vol_chg = (float(vol) / float(vol_prev) - 1.0) * 100.0
        except (TypeError, ValueError):
            pass
    return {
        "ticker": ticker,
        "close": close,
        "open": float(row["Open"]) if "Open" in row else None,
        "high": float(row["High"]) if "High" in row else None,
        "low": float(row["Low"]) if "Low" in row else None,
        "change_pct": chg_pct,
        "change_5d_pct": pct_between(df, session, 5),
        "change_1m_pct": pct_between(df, session, 21),
        "volume": int(vol) if vol is not None and not pd.isna(vol) else None,
        "volume_change_pct": vol_chg,
        "rsi14": compute_rsi(dfn["Close"].loc[dfn.index <= pd.Timestamp(session)]),
        "source": f"https://finance.yahoo.com/quote/{ticker}",
    }


def fetch_fred(api_key: str, session: date) -> dict[str, Any]:
    base = "https://api.stlouisfed.org/fred/series/observations"
    out: dict[str, Any] = {}
    for sid, label in FRED_SERIES.items():
        try:
            r = requests.get(
                base,
                params={
                    "series_id": sid,
                    "api_key": api_key,
                    "file_type": "json",
                    "sort_order": "desc",
                    "limit": 5,
                },
                timeout=20,
            )
            r.raise_for_status()
            obs = r.json().get("observations", [])
            cleaned = [
                {"date": o["date"], "value": o["value"]}
                for o in obs
                if o.get("value") not in (".", None, "")
            ]
            out[sid] = {
                "label": label,
                "observations": cleaned,
                "source": f"https://fred.stlouisfed.org/series/{sid}",
            }
        except Exception as e:
            out[sid] = {"label": label, "error": str(e)}
    return out


def fetch_yf_news(tickers: list[str], limit: int = 3) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for t in tickers[:12]:
        try:
            news = yf.Ticker(t).news or []
            for n in news[:limit]:
                items.append(
                    {
                        "ticker": t,
                        "title": n.get("title"),
                        "publisher": n.get("publisher"),
                        "link": n.get("link"),
                        "published": n.get("providerPublishTime"),
                    }
                )
        except Exception:
            continue
    return items


def fetch_serper_context(query: str, api_key: str) -> list[dict[str, Any]]:
    try:
        r = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": query, "num": 8},
            timeout=25,
        )
        r.raise_for_status()
        data = r.json()
        results = []
        for item in data.get("news", [])[:5] + data.get("organic", [])[:5]:
            results.append(
                {
                    "title": item.get("title"),
                    "snippet": item.get("snippet"),
                    "link": item.get("link"),
                    "date": item.get("date"),
                    "source": item.get("source"),
                }
            )
        return results
    except Exception:
        return []


def build_data(session: date) -> dict[str, Any]:
    start = session - timedelta(days=120)
    all_tickers = list(
        dict.fromkeys(
            list(INDICES.values())
            + list(CROSS.values())
            + [s[1] for s in SECTOR_ETFS]
            + [s[1] for s in THEME_ETFS]
            + MAG7
            + WATCHLIST
            + AI_HW
            + SOFTWARE
            + POWER
            + TECH_TICKERS
        )
    )
    hist = download(all_tickers, start, session)

    et = pytz.timezone("America/New_York")
    bj = pytz.timezone("Asia/Shanghai")
    now_et = datetime.now(et)
    now_bj = datetime.now(bj)

    sp = hist.get("^GSPC")
    sp_chg = None
    if sp is not None:
        r = row_on(sp, session)
        q = quote_payload("^GSPC", sp, session)
        sp_chg = q.get("change_pct")

    payload: dict[str, Any] = {
        "session_date": session.isoformat(),
        "generated_at_et": now_et.isoformat(),
        "generated_at_beijing": now_bj.strftime("%Y-%m-%d %H:%M %Z"),
        "indices": {
            name: quote_payload(t, hist.get(t), session) for name, t in INDICES.items()
        },
        "sectors": [
            {"name": n, "etf": t, **quote_payload(t, hist.get(t), session)}
            for n, t in SECTOR_ETFS
        ],
        "themes": [
            {"name": n, "etf": t, **quote_payload(t, hist.get(t), session)}
            for n, t in THEME_ETFS
        ],
        "mag7": {t: quote_payload(t, hist.get(t), session) for t in MAG7},
        "watchlist": {t: quote_payload(t, hist.get(t), session) for t in WATCHLIST},
        "ai_hardware": {t: quote_payload(t, hist.get(t), session) for t in AI_HW},
        "software": {t: quote_payload(t, hist.get(t), session) for t in SOFTWARE},
        "power_infra": {t: quote_payload(t, hist.get(t), session) for t in POWER},
        "technicals": {t: quote_payload(t, hist.get(t), session) for t in TECH_TICKERS},
        "cross_assets": {
            name: quote_payload(t, hist.get(t), session) for name, t in CROSS.items()
        },
        "macro": {},
        "news": fetch_yf_news(MAG7 + ["^GSPC", "NVDA", "NOK", "DELL"]),
        "web_context": [],
        "breadth": {
            "note": "NYSE/Nasdaq 涨跌家数、新高新低、McClellan 等需 Serper/付费数据源；未配置时报告须写暂无可靠数据",
        },
        "fed_watch": {
            "note": "请结合 web_context 中 CME FedWatch / Investing.com 信息；无则写暂无可靠数据",
        },
        "sources": [
            {"name": "Yahoo Finance", "url": "https://finance.yahoo.com/"},
            {"name": "FRED", "url": "https://fred.stlouisfed.org/"},
            {"name": "CNBC", "url": "https://www.cnbc.com/"},
            {"name": "Reuters", "url": "https://www.reuters.com/markets/"},
            {"name": "MarketWatch", "url": "https://www.marketwatch.com/"},
            {"name": "密歇根大学消费者调查", "url": "https://www.sca.isr.umich.edu/"},
            {"name": "CME FedWatch", "url": "https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html"},
            {"name": "Cboe VIX", "url": "https://www.cboe.com/tradable_products/vix/"},
        ],
        "sp500_change_pct": sp_chg,
    }

    fred_key = os.environ.get("FRED_API_KEY", "").strip()
    if fred_key:
        payload["macro"]["fred"] = fetch_fred(fred_key, session)
    else:
        payload["macro"]["fred"] = {
            "note": "未配置 FRED_API_KEY，美债/密歇根等请用 Yahoo 代理或 web_context"
        }
        for label, t in [("2Y", "^IRX"), ("5Y", "^FVX"), ("10Y", "^TNX"), ("30Y", "^TYX")]:
            payload["macro"][f"yield_proxy_{label}"] = quote_payload(t, hist.get(t), session)

    serper_key = os.environ.get("SERPER_API_KEY", "").strip()
    if serper_key:
        q = (
            f"US stock market recap {session.isoformat()} "
            "site:cnbc.com OR site:reuters.com OR site:investopedia.com OR site:marketwatch.com"
        )
        payload["web_context"] = fetch_serper_context(q, serper_key)
        payload["web_context"] += fetch_serper_context(
            f"CME FedWatch Fed rate probability {session.isoformat()}", serper_key
        )
        payload["web_context"] += fetch_serper_context(
            f"University of Michigan consumer sentiment {session.isoformat()}", serper_key
        )

    return payload


def main() -> int:
    import argparse

    p = argparse.ArgumentParser()
    p.add_argument("--date")
    p.add_argument("--out", default="")
    args = p.parse_args()
    session = date.fromisoformat(args.date) if args.date else last_nyse_session()
    data = build_data(session)
    text = json.dumps(data, ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(args.out)
    else:
        print(text)
    return 0


if __name__ == "__main__":
    sys.exit(main())
