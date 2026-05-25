#!/usr/bin/env python3
"""DEPRECATED: Use scripts/generate_full_daily_report.py for Cursor-parity reports."""
import sys
print(
    "generate_us_market_report.py 已弃用。\n"
    "请使用: python3 scripts/generate_full_daily_report.py\n"
    "并配置 OPENAI_API_KEY。",
    file=sys.stderr,
)
sys.exit(1)
