#!/usr/bin/env python3
"""Local static server with /api/price proxy (mirrors Netlify function)."""
from __future__ import annotations

import json
import statistics
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent
PORT = 4173
UA = "etf-flow-terminal-local/1.0"


def fetch_json(url: str, timeout: float = 4.5):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def median(vals):
    vals = [v for v in vals if v is not None and v == v and v > 0]
    if not vals:
        return None
    return float(statistics.median(vals))


def assemble(samples):
    prices = [s["price"] for s in samples]
    changes = [s["change_24h"] for s in samples if s.get("change_24h") is not None]
    price = median(prices)
    if price is None:
        return None
    max_dev = max(abs(p - price) / price * 100 for p in prices)
    return {
        "price": round(price, 1 if price >= 1000 else 2),
        "change_24h": None if not changes else round(median(changes), 3),
        "confidence": "high" if len(samples) >= 3 else ("medium" if len(samples) == 2 else "single"),
        "source_count": len(samples),
        "sources": [s["name"] for s in samples],
        "max_deviation_pct": round(max_dev, 4),
    }


def build_price_payload():
    by = {"BTC": [], "ETH": []}

    try:
        rows = fetch_json(
            "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%5D"
        )
        for row in rows or []:
            sym = row.get("symbol")
            asset = "BTC" if sym == "BTCUSDT" else ("ETH" if sym == "ETHUSDT" else None)
            if asset:
                by[asset].append(
                    {
                        "name": "Binance",
                        "price": float(row["lastPrice"]),
                        "change_24h": float(row["priceChangePercent"]),
                    }
                )
    except Exception:
        pass

    for base in ("BTC", "ETH"):
        try:
            px = fetch_json(f"https://api.exchange.coinbase.com/products/{base}-USD/ticker")
            stats = fetch_json(f"https://api.exchange.coinbase.com/products/{base}-USD/stats")
            price = float(px["price"])
            open_ = float(stats.get("open") or 0)
            chg = ((price - open_) / open_ * 100) if open_ > 0 else None
            by[base].append({"name": "Coinbase", "price": price, "change_24h": chg})
        except Exception:
            pass

    try:
        j = fetch_json("https://api.kraken.com/0/public/Ticker?pair=XBTUSD,ETHUSD")
        r = j.get("result") or {}

        def pick(*keys):
            for k in keys:
                if k in r:
                    return r[k]
            return None

        def one(row):
            if not row:
                return None
            price = float(row["c"][0])
            open_ = float(row["o"])
            return {
                "price": price,
                "change_24h": ((price - open_) / open_ * 100) if open_ > 0 else None,
            }

        b, e = one(pick("XXBTZUSD", "XBTUSD")), one(pick("XETHZUSD", "ETHUSD"))
        if b:
            by["BTC"].append({"name": "Kraken", **b})
        if e:
            by["ETH"].append({"name": "Kraken", **e})
    except Exception:
        pass

    assets = {}
    for k, samples in by.items():
        row = assemble(samples)
        if row:
            assets[k] = row
    return {"as_of": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "assets": assets}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/api/price", "/.netlify/functions/price"):
            try:
                payload = build_price_payload()
                body = json.dumps(payload).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            except Exception as exc:
                body = json.dumps({"error": str(exc)}).encode("utf-8")
                self.send_response(502)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"ETF Flow Terminal → http://127.0.0.1:{PORT}/")
    print(f"Price API         → http://127.0.0.1:{PORT}/api/price")
    server.serve_forever()


if __name__ == "__main__":
    main()
