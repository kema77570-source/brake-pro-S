"""
Technical Analysis Utilities
Computes indicators from OHLCV K-line data.
"""
from __future__ import annotations
import math
from typing import List, Dict, Tuple


def compute_rsi(closes: List[float], period: int = 14) -> float:
    """Compute RSI(period) from a list of close prices."""
    if len(closes) < period + 1:
        return 50.0
    deltas = [closes[i] - closes[i - 1] for i in range(1, len(closes))]
    gains = [max(d, 0.0) for d in deltas]
    losses = [max(-d, 0.0) for d in deltas]
    # Initial averages
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    for i in range(period, len(deltas)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period
    if avg_loss < 1e-10:
        return 100.0
    rs = avg_gain / avg_loss
    return round(100 - (100 / (1 + rs)), 2)


def compute_sma(closes: List[float], period: int) -> float | None:
    if len(closes) < period:
        return None
    return round(sum(closes[-period:]) / period, 4)


def compute_ema(closes: List[float], period: int) -> float | None:
    if len(closes) < period:
        return None
    alpha = 2.0 / (period + 1)
    ema = closes[0]
    for c in closes[1:]:
        ema = alpha * c + (1 - alpha) * ema
    return round(ema, 4)


def compute_macd(closes: List[float], fast: int = 12, slow: int = 26, signal: int = 9
                 ) -> Dict[str, float | None]:
    if len(closes) < slow + signal:
        return {"macd": None, "signal": None, "hist": None}
    ema_fast = _ema_series(closes, fast)
    ema_slow = _ema_series(closes, slow)
    macd_line = [f - s for f, s in zip(ema_fast[-len(ema_slow):], ema_slow)]
    sig_line = _ema_series(macd_line, signal)
    hist = macd_line[-1] - sig_line[-1] if sig_line else None
    return {
        "macd": round(macd_line[-1], 4) if macd_line else None,
        "signal": round(sig_line[-1], 4) if sig_line else None,
        "hist": round(hist, 4) if hist is not None else None,
    }


def _ema_series(prices: List[float], period: int) -> List[float]:
    if len(prices) < period:
        return []
    alpha = 2.0 / (period + 1)
    series = [sum(prices[:period]) / period]
    for p in prices[period:]:
        series.append(alpha * p + (1 - alpha) * series[-1])
    return series


def compute_bollinger(closes: List[float], period: int = 20, std_mult: float = 2.0
                      ) -> Dict[str, float | None]:
    if len(closes) < period:
        return {"upper": None, "mid": None, "lower": None}
    window = closes[-period:]
    mid = sum(window) / period
    variance = sum((x - mid) ** 2 for x in window) / period
    std = math.sqrt(variance)
    return {
        "upper": round(mid + std_mult * std, 4),
        "mid": round(mid, 4),
        "lower": round(mid - std_mult * std, 4),
    }


def find_support_resistance(highs: List[float], lows: List[float], closes: List[float],
                            current_price: float, n_levels: int = 6,
                            tolerance: float = 0.015) -> List[Dict]:
    """
    Find key S/R levels by clustering local pivots.
    Returns levels sorted by proximity to current_price.
    """
    if len(closes) < 10:
        return []

    # Identify local pivots (simple: compare window of ±3)
    pivot_highs: List[float] = []
    pivot_lows: List[float] = []
    window = 3
    n = len(closes)
    for i in range(window, n - window):
        if highs[i] == max(highs[i - window:i + window + 1]):
            pivot_highs.append(highs[i])
        if lows[i] == min(lows[i - window:i + window + 1]):
            pivot_lows.append(lows[i])

    # Also include 52W high/low and recent round numbers
    all_pivots = pivot_highs + pivot_lows
    if not all_pivots:
        return []

    # Cluster: merge levels within tolerance
    all_pivots.sort()
    clusters: List[List[float]] = []
    for p in all_pivots:
        merged = False
        for c in clusters:
            if abs(p - c[0]) / c[0] < tolerance:
                c.append(p)
                merged = True
                break
        if not merged:
            clusters.append([p])

    # Sort by cluster size (most-touched first), then pick n_levels nearest to price
    clusters.sort(key=lambda c: -len(c))
    top_clusters = clusters[:n_levels * 2]

    levels = []
    for c in top_clusters:
        price = round(sum(c) / len(c), 4)
        strength = len(c)
        dist_pct = round((price - current_price) / current_price * 100, 2)
        kind = "resistance" if price >= current_price else "support"
        levels.append({
            "price": price,
            "kind": kind,
            "strength": strength,
            "dist_pct": dist_pct,
        })

    # Sort by absolute distance to current price
    levels.sort(key=lambda x: abs(x["dist_pct"]))
    return levels[:n_levels]


def ma_signal(price: float, ma50: float | None, ma200: float | None) -> Dict[str, str]:
    """Determine MA cross signals."""
    signals: Dict[str, str] = {}
    if ma50 is None or ma200 is None:
        return {"cross": "unknown", "short": "unknown", "long": "unknown"}
    signals["cross"] = "golden" if ma50 > ma200 else "dead"
    signals["short"] = "bullish" if price > ma50 else "bearish"
    signals["long"] = "bullish" if price > ma200 else "bearish"
    return signals


def week52(highs: List[float], lows: List[float]) -> Dict[str, float]:
    """52-week high/low from ~252 trading days of data."""
    window = highs[-252:] if len(highs) >= 252 else highs
    wl = lows[-252:] if len(lows) >= 252 else lows
    return {
        "high": round(max(window), 4),
        "low": round(min(wl), 4),
    }
