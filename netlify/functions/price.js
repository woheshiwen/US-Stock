/**
 * Aggregated BTC/ETH spot price endpoint (Netlify Function).
 * Mirrors kzgflow.com /api/price: median of Binance / Coinbase / Kraken.
 */
const SOURCES = [
  {
    name: "Binance",
    url: "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%5D",
    parse(j) {
      const out = {};
      (Array.isArray(j) ? j : []).forEach((row) => {
        if (row.symbol === "BTCUSDT") out.BTC = { price: +row.lastPrice, change_24h: +row.priceChangePercent };
        if (row.symbol === "ETHUSDT") out.ETH = { price: +row.lastPrice, change_24h: +row.priceChangePercent };
      });
      return out;
    },
  },
  {
    name: "Coinbase",
    url: "https://api.exchange.coinbase.com/products/BTC-USD/ticker",
    async fetchPair(fetchImpl, base) {
      const [px, stats] = await Promise.all([
        fetchImpl(`https://api.exchange.coinbase.com/products/${base}-USD/ticker`).then((r) => r.json()),
        fetchImpl(`https://api.exchange.coinbase.com/products/${base}-USD/stats`).then((r) => r.json()),
      ]);
      const price = +px.price;
      const open = +stats.open;
      const change_24h = open > 0 ? ((price - open) / open) * 100 : null;
      return { price, change_24h };
    },
  },
  {
    name: "Kraken",
    url: "https://api.kraken.com/0/public/Ticker?pair=XBTUSD,ETHUSD",
    parse(j) {
      const r = (j && j.result) || {};
      const pick = (keys) => {
        for (const k of keys) if (r[k]) return r[k];
        return null;
      };
      const b = pick(["XXBTZUSD", "XBTUSD"]);
      const e = pick(["XETHZUSD", "ETHUSD"]);
      const one = (row) => {
        if (!row) return null;
        const price = +row.c[0];
        const open = +row.o;
        return { price, change_24h: open > 0 ? ((price - open) / open) * 100 : null };
      };
      return { BTC: one(b), ETH: one(e) };
    },
  },
];

async function fetchJson(url, ms = 4500) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(String(res.status));
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function median(nums) {
  const a = nums.filter((n) => isFinite(n) && n > 0).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

function assemble(asset, samples) {
  const prices = samples.map((s) => s.price);
  const changes = samples.map((s) => s.change_24h).filter((n) => n != null && isFinite(n));
  const price = median(prices);
  if (price == null) return null;
  const maxDev = Math.max(...prices.map((p) => (Math.abs(p - price) / price) * 100));
  return {
    price: +price.toFixed(price >= 1000 ? 1 : 2),
    change_24h: changes.length ? +median(changes).toFixed(3) : null,
    confidence: samples.length >= 3 ? "high" : samples.length === 2 ? "medium" : "single",
    source_count: samples.length,
    sources: samples.map((s) => s.name),
    max_deviation_pct: +maxDev.toFixed(4),
  };
}

async function buildPayload() {
  const byAsset = { BTC: [], ETH: [] };

  // Binance
  try {
    const j = await fetchJson(SOURCES[0].url);
    const parsed = SOURCES[0].parse(j);
    for (const k of ["BTC", "ETH"]) if (parsed[k] && parsed[k].price > 0) byAsset[k].push({ name: "Binance", ...parsed[k] });
  } catch (_) {}

  // Coinbase
  for (const base of ["BTC", "ETH"]) {
    try {
      const row = await SOURCES[1].fetchPair(fetch, base);
      if (row && row.price > 0) byAsset[base].push({ name: "Coinbase", ...row });
    } catch (_) {}
  }

  // Kraken
  try {
    const j = await fetchJson(SOURCES[2].url);
    const parsed = SOURCES[2].parse(j);
    for (const k of ["BTC", "ETH"]) if (parsed[k] && parsed[k].price > 0) byAsset[k].push({ name: "Kraken", ...parsed[k] });
  } catch (_) {}

  const assets = {};
  for (const k of ["BTC", "ETH"]) {
    const row = assemble(k, byAsset[k]);
    if (row) assets[k] = row;
  }
  return { as_of: new Date().toISOString(), assets };
}

exports.handler = async () => {
  try {
    const body = await buildPayload();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public,max-age=15,s-maxage=30,stale-while-revalidate=120",
      },
      body: JSON.stringify(body),
    };
  } catch (err) {
    return {
      statusCode: 502,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: String(err && err.message ? err.message : err) }),
    };
  }
};
