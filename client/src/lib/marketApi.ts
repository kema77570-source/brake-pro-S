// BRAKE Pro — Market Data API
// Sources: CoinStats Fear&Greed, Alternative.me, Yahoo Finance (via proxy)
// API Key: cAHJJyPyLX4u3fap5+F3kJhpQZZEroCdHVdq48JNzuQ=

import type { MarketFearGreed, VixData, AssetHeatData, FollowThroughDayData, FollowThroughSignal } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
  const changes = closes.slice(1).map((c, i) => c - closes[i]);
  const gains = changes.map((c) => (c > 0 ? c : 0));
  const losses = changes.map((c) => (c < 0 ? -c : 0));
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round(100 - 100 / (1 + rs));
}

function classifyHeat(
  change24h: number,
  volumeIncrease: number,
  maDeviation: number,
  rsi: number
): "Low" | "Medium" | "High" {
  let score = 0;
  if (Math.abs(change24h) >= 10) score += 3;
  else if (Math.abs(change24h) >= 5) score += 2;
  else if (Math.abs(change24h) >= 2) score += 1;
  if (volumeIncrease >= 100) score += 3;
  else if (volumeIncrease >= 50) score += 2;
  else if (volumeIncrease >= 20) score += 1;
  if (Math.abs(maDeviation) >= 15) score += 3;
  else if (Math.abs(maDeviation) >= 10) score += 2;
  else if (Math.abs(maDeviation) >= 5) score += 1;
  if (rsi >= 80 || rsi <= 20) score += 3;
  else if (rsi >= 70 || rsi <= 30) score += 2;
  else if (rsi >= 65 || rsi <= 35) score += 1;
  if (score >= 7) return "High";
  if (score >= 3) return "Medium";
  return "Low";
}

function fngLabel(value: number): string {
  if (value <= 24) return "極度の恐怖";
  if (value <= 44) return "恐怖";
  if (value <= 55) return "中立";
  if (value <= 74) return "強欲";
  return "極度の強欲";
}

// ─── Cache ───────────────────────────────────────────────────────────────────

const CACHE_TTL = 5 * 60 * 1000;
interface Cache<T> { data: T; ts: number; }
let cryptoFgCache: Cache<MarketFearGreed> | null = null;
let stockFgCache: Cache<MarketFearGreed> | null = null;
let vixCache: Cache<VixData> | null = null;
let assetsCache: Cache<AssetHeatData[]> | null = null;

// ─── Crypto Fear & Greed (CoinStats API) ─────────────────────────────────────

const COINSTATS_API_KEY = "cAHJJyPyLX4u3fap5+F3kJhpQZZEroCdHVdq48JNzuQ=";

export async function fetchCryptoFearGreed(): Promise<MarketFearGreed> {
  if (cryptoFgCache && Date.now() - cryptoFgCache.ts < CACHE_TTL) {
    return cryptoFgCache.data;
  }
  try {
    // CoinStats Fear & Greed endpoint
    const res = await fetch(
      "https://openapiv1.coinstats.app/coins/fear-greed",
      {
        headers: {
          "X-API-KEY": COINSTATS_API_KEY,
          "accept": "application/json",
        },
      }
    );
    if (res.ok) {
      const json = await res.json();
      // CoinStats returns { now: { value, value_classification, timestamp, time_until_update } }
      const item = json.now ?? json;
      const value = Number(item.value ?? item.score ?? 50);
      const data: MarketFearGreed = {
        value,
        label: fngLabel(value),
        timestamp: new Date().toISOString(),
        source: "crypto",
      };
      cryptoFgCache = { data, ts: Date.now() };
      return data;
    }
  } catch (_) {
    // fallback below
  }

  // Fallback: Alternative.me
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1");
    if (res.ok) {
      const json = await res.json();
      const item = json.data[0];
      const value = Number(item.value);
      const data: MarketFearGreed = {
        value,
        label: fngLabel(value),
        timestamp: new Date(Number(item.timestamp) * 1000).toISOString(),
        source: "crypto",
      };
      cryptoFgCache = { data, ts: Date.now() };
      return data;
    }
  } catch (_) {
    // ignore
  }

  // Mock fallback
  const mockData: MarketFearGreed = {
    value: 62,
    label: "強欲",
    timestamp: new Date().toISOString(),
    source: "crypto",
  };
  cryptoFgCache = { data: mockData, ts: Date.now() };
  return mockData;
}

// ─── Stock Fear & Greed (CNN-style mock via VIX proxy) ───────────────────────

export async function fetchStockFearGreed(): Promise<MarketFearGreed> {
  if (stockFgCache && Date.now() - stockFgCache.ts < CACHE_TTL) {
    return stockFgCache.data;
  }
  // Derive stock F&G from VIX
  try {
    const vix = await fetchVix();
    // VIX 10=extreme greed, 15=greed, 20=neutral, 25=fear, 35+=extreme fear
    let value: number;
    if (vix.value <= 12) value = 85;
    else if (vix.value <= 15) value = 70;
    else if (vix.value <= 20) value = 55;
    else if (vix.value <= 25) value = 40;
    else if (vix.value <= 35) value = 25;
    else value = 10;

    const data: MarketFearGreed = {
      value,
      label: fngLabel(value),
      timestamp: new Date().toISOString(),
      source: "stock",
    };
    stockFgCache = { data, ts: Date.now() };
    return data;
  } catch (_) {
    const mockData: MarketFearGreed = {
      value: 55,
      label: "中立",
      timestamp: new Date().toISOString(),
      source: "stock",
    };
    stockFgCache = { data: mockData, ts: Date.now() };
    return mockData;
  }
}

// ─── VIX ─────────────────────────────────────────────────────────────────────

export async function fetchVix(): Promise<VixData> {
  if (vixCache && Date.now() - vixCache.ts < CACHE_TTL) {
    return vixCache.data;
  }
  try {
    const res = await fetch("/api/yahoo/v8/finance/chart/%5EVIX?interval=1d&range=2d");
    if (res.ok) {
      const json = await res.json();
      const result = json.chart?.result?.[0];
      if (result) {
        const price = result.meta.regularMarketPrice;
        const prevClose = result.meta.chartPreviousClose;
        const change = prevClose > 0
          ? Math.round(((price - prevClose) / prevClose) * 10000) / 100
          : 0;
        const data: VixData = {
          value: Math.round(price * 100) / 100,
          change,
          timestamp: new Date().toISOString(),
        };
        vixCache = { data, ts: Date.now() };
        return data;
      }
    }
  } catch (_) {
    // ignore
  }
  // Mock fallback
  const mockData: VixData = { value: 18.5, change: -0.8, timestamp: new Date().toISOString() };
  vixCache = { data: mockData, ts: Date.now() };
  return mockData;
}

// ─── Yahoo Finance ────────────────────────────────────────────────────────────

interface YahooChartResult {
  meta: {
    regularMarketPrice: number;
    chartPreviousClose: number;
    currency: string;
  };
  indicators: {
    quote: Array<{
      close: (number | null)[];
      volume: (number | null)[];
    }>;
  };
}

async function fetchYahooChart(ticker: string): Promise<YahooChartResult | null> {
  try {
    const res = await fetch(
      `/api/yahoo/v8/finance/chart/${encodeURIComponent(ticker)}?interval=1d&range=3mo`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.chart?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

function processYahooData(
  result: YahooChartResult,
  symbol: string,
  name: string,
  type: AssetHeatData["type"]
): AssetHeatData {
  const { regularMarketPrice, chartPreviousClose, currency } = result.meta;
  const rawCloses = result.indicators.quote[0]?.close ?? [];
  const rawVolumes = result.indicators.quote[0]?.volume ?? [];
  const closes = rawCloses.filter((c): c is number => c !== null);
  const volumes = rawVolumes.filter((v): v is number => v !== null);

  const change24h =
    chartPreviousClose > 0
      ? Math.round(((regularMarketPrice - chartPreviousClose) / chartPreviousClose) * 10000) / 100
      : 0;

  const rsi = calcRSI(closes);
  const ma25 =
    closes.length >= 25
      ? closes.slice(-25).reduce((a, b) => a + b, 0) / 25
      : regularMarketPrice;
  const maDeviation =
    ma25 > 0
      ? Math.round(((regularMarketPrice - ma25) / ma25) * 1000) / 10
      : 0;

  let volumeIncrease = 0;
  if (volumes.length >= 21) {
    const avgVol20 = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
    const latestVol = volumes[volumes.length - 1];
    volumeIncrease = avgVol20 > 0
      ? Math.round(((latestVol - avgVol20) / avgVol20) * 100)
      : 0;
  }

  const heatLevel = classifyHeat(change24h, volumeIncrease, maDeviation, rsi);
  const currencySymbol = currency === "JPY" ? "¥" : currency === "USD" ? "$" : currency;

  return { symbol, name, type, price: regularMarketPrice, currency: currencySymbol, change24h, volumeIncrease, maDeviation, rsi, heatLevel };
}

// ─── Asset Lists ─────────────────────────────────────────────────────────────

const CRYPTO_LIST = [
  { ticker: "BTC-USD", symbol: "BTC", name: "Bitcoin" },
  { ticker: "ETH-USD", symbol: "ETH", name: "Ethereum" },
  { ticker: "SOL-USD", symbol: "SOL", name: "Solana" },
  { ticker: "XRP-USD", symbol: "XRP", name: "XRP" },
];

const STOCK_LIST: { ticker: string; symbol: string; name: string; type: AssetHeatData["type"] }[] = [
  { ticker: "NVDA", symbol: "NVDA", name: "NVIDIA", type: "stock_us" },
  { ticker: "AAPL", symbol: "AAPL", name: "Apple", type: "stock_us" },
  { ticker: "TSLA", symbol: "TSLA", name: "Tesla", type: "stock_us" },
  { ticker: "MSFT", symbol: "MSFT", name: "Microsoft", type: "stock_us" },
  { ticker: "7203.T", symbol: "7203", name: "トヨタ自動車", type: "stock_jp" },
  { ticker: "6920.T", symbol: "6920", name: "レーザーテック", type: "stock_jp" },
  { ticker: "9984.T", symbol: "9984", name: "ソフトバンクG", type: "stock_jp" },
  { ticker: "6758.T", symbol: "6758", name: "ソニーグループ", type: "stock_jp" },
];

const COMMODITY_LIST = [
  { ticker: "GC=F", symbol: "GOLD", name: "金（ゴールド）" },
  { ticker: "CL=F", symbol: "OIL", name: "原油（WTI）" },
];

export async function fetchAllAssets(): Promise<AssetHeatData[]> {
  if (assetsCache && Date.now() - assetsCache.ts < CACHE_TTL) {
    return assetsCache.data;
  }

  const cryptoResults = await Promise.allSettled(
    CRYPTO_LIST.map(async ({ ticker, symbol, name }) => {
      const result = await fetchYahooChart(ticker);
      if (!result) return null;
      return processYahooData(result, symbol, name, "crypto");
    })
  );

  const stockResults = await Promise.allSettled(
    STOCK_LIST.map(async ({ ticker, symbol, name, type }) => {
      const result = await fetchYahooChart(ticker);
      if (!result) return null;
      return processYahooData(result, symbol, name, type);
    })
  );

  const commodityResults = await Promise.allSettled(
    COMMODITY_LIST.map(async ({ ticker, symbol, name }) => {
      const result = await fetchYahooChart(ticker);
      if (!result) return null;
      return processYahooData(result, symbol, name, "commodity");
    })
  );

  const all = [
    ...cryptoResults.map((r) => (r.status === "fulfilled" ? r.value : null)),
    ...stockResults.map((r) => (r.status === "fulfilled" ? r.value : null)),
    ...commodityResults.map((r) => (r.status === "fulfilled" ? r.value : null)),
  ].filter(Boolean) as AssetHeatData[];

  // Fallback mock if all APIs fail
  if (all.length === 0) {
    return getMockAssets();
  }

  assetsCache = { data: all, ts: Date.now() };
  return all;
}

export async function fetchSingleAsset(ticker: string, symbol: string, name: string, type: AssetHeatData["type"]): Promise<AssetHeatData | null> {
  const result = await fetchYahooChart(ticker);
  if (!result) return null;
  return processYahooData(result, symbol, name, type);
}

export function invalidateCache() {
  cryptoFgCache = null;
  stockFgCache = null;
  vixCache = null;
  assetsCache = null;
  ftdCache = null;
}

// ─── Follow-Through Day ───────────────────────────────────────────────────────

const FTD_INDICES = [
  { ticker: "^GSPC", name: "S&P 500" },
  { ticker: "^IXIC", name: "NASDAQ" },
  { ticker: "^N225", name: "日経225" },
];

const FTD_CHANGE_THRESHOLD = 1.8;   // % rise
const FTD_VOLUME_THRESHOLD = 20;    // % above 20-day avg

let ftdCache: Cache<FollowThroughDayData> | null = null;

export async function fetchFollowThroughDay(): Promise<FollowThroughDayData> {
  if (ftdCache && Date.now() - ftdCache.ts < CACHE_TTL) {
    return ftdCache.data;
  }

  const results = await Promise.allSettled(
    FTD_INDICES.map(async ({ ticker, name }) => {
      const result = await fetchYahooChart(ticker);
      if (!result) return null;
      const { regularMarketPrice, chartPreviousClose } = result.meta;
      const rawVolumes = result.indicators.quote[0]?.volume ?? [];
      const volumes = rawVolumes.filter((v): v is number => v !== null);

      const changePercent =
        chartPreviousClose > 0
          ? Math.round(((regularMarketPrice - chartPreviousClose) / chartPreviousClose) * 10000) / 100
          : 0;

      let volumeIncreasePercent = 0;
      if (volumes.length >= 21) {
        const avgVol20 = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
        const latestVol = volumes[volumes.length - 1];
        volumeIncreasePercent = avgVol20 > 0
          ? Math.round(((latestVol - avgVol20) / avgVol20) * 100)
          : 0;
      }

      const isFTD = changePercent >= FTD_CHANGE_THRESHOLD && volumeIncreasePercent >= FTD_VOLUME_THRESHOLD;

      return { indexName: name, ticker, changePercent, volumeIncreasePercent, isFTD } satisfies FollowThroughSignal;
    })
  );

  const signals = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter(Boolean) as FollowThroughSignal[];

  const data: FollowThroughDayData = {
    detectedAt: new Date().toISOString(),
    signals,
  };

  ftdCache = { data, ts: Date.now() };
  return data;
}

// ─── Mock fallback ────────────────────────────────────────────────────────────

function getMockAssets(): AssetHeatData[] {
  return [
    { symbol: "BTC", name: "Bitcoin", type: "crypto", price: 85000, currency: "$", change24h: 3.2, volumeIncrease: 45, maDeviation: 5.8, rsi: 62, heatLevel: "Medium" },
    { symbol: "ETH", name: "Ethereum", type: "crypto", price: 3200, currency: "$", change24h: 2.1, volumeIncrease: 30, maDeviation: 3.2, rsi: 58, heatLevel: "Low" },
    { symbol: "NVDA", name: "NVIDIA", type: "stock_us", price: 142.5, currency: "$", change24h: 8.7, volumeIncrease: 180, maDeviation: 14.2, rsi: 82, heatLevel: "High" },
    { symbol: "AAPL", name: "Apple", type: "stock_us", price: 198.7, currency: "$", change24h: -0.8, volumeIncrease: -5, maDeviation: -1.2, rsi: 48, heatLevel: "Low" },
    { symbol: "7203", name: "トヨタ自動車", type: "stock_jp", price: 2847, currency: "¥", change24h: 3.2, volumeIncrease: 45, maDeviation: 5.8, rsi: 68, heatLevel: "Medium" },
    { symbol: "GOLD", name: "金（ゴールド）", type: "commodity", price: 2650, currency: "$", change24h: 0.5, volumeIncrease: 10, maDeviation: 2.1, rsi: 55, heatLevel: "Low" },
  ];
}
