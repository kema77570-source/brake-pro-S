#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Notification Scheduler Server — port 8002
朝・夜に自動的に保有銘柄を分析してブラウザに通知を送る

Endpoints:
  WS   /ws                  — WebSocket (通知配信)
  POST /watchlist           — 監視銘柄リストを登録
  GET  /watchlist           — 監視銘柄リストを取得
  PUT  /settings            — 通知スケジュール設定
  GET  /settings            — 現在の設定を取得
  POST /trigger/{type}      — 手動テスト通知 (morning|evening)
  GET  /history             — 通知履歴 (最新50件)
"""
from __future__ import annotations

import asyncio
import json
import logging
from collections import deque
from datetime import datetime
from typing import Any, Deque, Dict, List, Optional, Set

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────
MOOMOO_API = "http://127.0.0.1:8000"
MAX_HISTORY = 50

# ── State ─────────────────────────────────────────────────────────────────
_watchlist: List[Dict] = []          # [{code, name, qty, cost_price}]
_settings: Dict[str, Any] = {
    "morning_hour": 8,
    "morning_minute": 0,
    "evening_hour": 18,
    "evening_minute": 0,
    "timezone": "Asia/Tokyo",
    "enabled": True,
}
_history: Deque[Dict] = deque(maxlen=MAX_HISTORY)
_connections: Set[WebSocket] = set()

# ── FastAPI ───────────────────────────────────────────────────────────────
app = FastAPI(title="BRAKE Pro Notification Scheduler", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
scheduler = AsyncIOScheduler(timezone=_settings["timezone"])


# ── WebSocket manager ─────────────────────────────────────────────────────
async def broadcast(payload: Dict):
    """Send notification payload to all connected browser tabs."""
    msg = json.dumps(payload, ensure_ascii=False)
    dead: Set[WebSocket] = set()
    for ws in _connections:
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    _connections.difference_update(dead)
    _history.appendleft(payload)
    logger.info("Broadcasted: %s", payload.get("title", ""))


@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket):
    await ws.accept()
    _connections.add(ws)
    # Send last 10 history items on connect
    try:
        for item in list(_history)[:10]:
            await ws.send_text(json.dumps(item, ensure_ascii=False))
        while True:
            await ws.receive_text()   # keep-alive ping from client
    except WebSocketDisconnect:
        pass
    finally:
        _connections.discard(ws)


# ── Analysis logic ────────────────────────────────────────────────────────
async def analyze_ticker(code: str) -> Optional[Dict]:
    """Fetch analysis from moomoo_api for a single ticker."""
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            r = await client.get(f"{MOOMOO_API}/api/analysis/{code}")
            if r.status_code == 200:
                return r.json()
    except Exception as e:
        logger.warning("Analysis failed for %s: %s", code, e)
    return None


def rsi_label(rsi: float) -> str:
    if rsi <= 25: return f"🟢 RSI{rsi:.0f} 売られ過ぎ"
    if rsi <= 35: return f"🔵 RSI{rsi:.0f} 弱気圏"
    if rsi >= 75: return f"🔴 RSI{rsi:.0f} 買われ過ぎ"
    if rsi >= 65: return f"🟡 RSI{rsi:.0f} 強気圏"
    return f"⚪ RSI{rsi:.0f} 中立"


def score_label(score: int) -> str:
    if score >= 50:  return "📈 強い買いシグナル"
    if score >= 20:  return "📊 買い優勢"
    if score >= -20: return "➡️ 中立"
    if score >= -50: return "📉 売り優勢"
    return "🚨 強い売りシグナル"


async def build_holdings_analysis(notification_type: str) -> Dict:
    """Analyze all watchlist tickers and build notification payload."""
    now = datetime.now()
    is_morning = notification_type == "morning"
    title = f"🌅 朝の保有銘柄レポート" if is_morning else f"🌙 夜の保有銘柄レポート"
    time_str = now.strftime("%m/%d %H:%M")

    if not _watchlist:
        return {
            "type": notification_type,
            "title": title,
            "body": "監視銘柄が設定されていません。通知設定で銘柄を追加してください。",
            "items": [],
            "summary": "監視銘柄なし",
            "timestamp": now.isoformat(),
            "time_str": time_str,
        }

    items: List[Dict] = []
    alerts: List[str] = []

    tasks = [analyze_ticker(w["code"]) for w in _watchlist]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for w, result in zip(_watchlist, results):
        if isinstance(result, Exception) or result is None:
            items.append({
                "code": w["code"],
                "name": w.get("name", w["code"]),
                "price": None,
                "change_pct": None,
                "rsi": None,
                "rsi_label": "取得失敗",
                "score": 0,
                "score_label": "—",
                "alert": "データ取得失敗",
            })
            continue

        p = result.get("price", {})
        t = result.get("technical", {})
        price    = p.get("current")
        chg_pct  = p.get("change_rate")
        rsi      = t.get("rsi14")
        score    = t.get("overall_score", 0)
        ma_sig   = t.get("ma_signals", {})
        cross    = ma_sig.get("cross", "")
        w52hi    = p.get("week52_high")
        w52lo    = p.get("week52_low")

        # Build alert message
        alert_parts: List[str] = []
        if rsi and rsi <= 30:
            alert_parts.append(f"RSI{rsi:.0f} 売られ過ぎ")
        if rsi and rsi >= 70:
            alert_parts.append(f"RSI{rsi:.0f} 買われ過ぎ")
        if cross == "dead":
            alert_parts.append("デッドクロス")
        if cross == "golden":
            alert_parts.append("ゴールデンクロス")
        if price and w52lo and abs(price - w52lo) / w52lo < 0.05:
            alert_parts.append("52週安値付近")
        if price and w52hi and abs(w52hi - price) / w52hi < 0.03:
            alert_parts.append("52週高値付近")

        alert = " / ".join(alert_parts) if alert_parts else None
        if alert:
            alerts.append(f"{w.get('name', w['code'])}: {alert}")

        # Holdings P&L if cost_price provided
        pnl_info = None
        cost = w.get("cost_price")
        qty  = w.get("qty", 0)
        if cost and qty and price:
            pnl = (price - cost) * qty
            pnl_pct = (price - cost) / cost * 100
            pnl_info = {
                "pnl": round(pnl, 2),
                "pnl_pct": round(pnl_pct, 2),
                "qty": qty,
            }

        # SR proximity
        sr = result.get("support_resistance", [])
        nearest_sr = sr[0] if sr else None

        items.append({
            "code": w["code"],
            "name": w.get("name", w["code"]),
            "price": price,
            "change_pct": chg_pct,
            "rsi": rsi,
            "rsi_label": rsi_label(rsi) if rsi else "—",
            "score": score,
            "score_label": score_label(score),
            "cross": cross,
            "alert": alert,
            "pnl_info": pnl_info,
            "nearest_sr": nearest_sr,
            "week52": {"high": w52hi, "low": w52lo},
        })

    # Build summary
    bullish = sum(1 for it in items if it["score"] >= 20)
    bearish = sum(1 for it in items if it["score"] <= -20)
    oversold = sum(1 for it in items if it.get("rsi") and it["rsi"] <= 30)

    if is_morning:
        summary_parts = [f"保有{len(items)}銘柄"]
        if bullish:   summary_parts.append(f"強気{bullish}件")
        if bearish:   summary_parts.append(f"弱気{bearish}件")
        if oversold:  summary_parts.append(f"売られ過ぎ{oversold}件")
        summary = " / ".join(summary_parts)
    else:
        summary_parts = [f"分析{len(items)}銘柄"]
        if alerts:    summary_parts.append(f"要注意{len(alerts)}件")
        summary = " / ".join(summary_parts)

    # Body text for browser notification popup
    body_lines = []
    for it in items[:3]:  # Limit to 3 for popup
        if it["price"] is None: continue
        chg = f"+{it['change_pct']:.1f}%" if it["change_pct"] and it["change_pct"] >= 0 else f"{it['change_pct']:.1f}%"
        body_lines.append(f"{it['name']}  ${it['price']:.2f} ({chg})  {it.get('rsi_label','')}")
    if alerts:
        body_lines.append(f"⚠️ 要注意: {alerts[0]}")

    return {
        "type": notification_type,
        "title": title,
        "body": "\n".join(body_lines) or summary,
        "items": items,
        "alerts": alerts,
        "summary": summary,
        "bullish_count": bullish,
        "bearish_count": bearish,
        "timestamp": now.isoformat(),
        "time_str": time_str,
    }


# ── Scheduled jobs ────────────────────────────────────────────────────────
async def run_morning():
    if not _settings.get("enabled", True):
        return
    logger.info("Running morning analysis ...")
    payload = await build_holdings_analysis("morning")
    await broadcast(payload)


async def run_evening():
    if not _settings.get("enabled", True):
        return
    logger.info("Running evening analysis ...")
    payload = await build_holdings_analysis("evening")
    await broadcast(payload)


def reschedule(mh: int, mm: int, eh: int, em: int):
    """Remove and re-add scheduler jobs with new times."""
    for job_id in ["morning_job", "evening_job"]:
        try:
            scheduler.remove_job(job_id)
        except Exception:
            pass
    scheduler.add_job(run_morning, CronTrigger(hour=mh, minute=mm), id="morning_job")
    scheduler.add_job(run_evening, CronTrigger(hour=eh, minute=em), id="evening_job")
    logger.info("Rescheduled: morning=%02d:%02d  evening=%02d:%02d", mh, mm, eh, em)


# ── Startup ───────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    reschedule(
        _settings["morning_hour"], _settings["morning_minute"],
        _settings["evening_hour"], _settings["evening_minute"],
    )
    scheduler.start()
    logger.info("Notification scheduler started")


@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown(wait=False)


# ── REST endpoints ────────────────────────────────────────────────────────

class WatchlistItem(BaseModel):
    code: str         # e.g. "US.AAPL"
    name: str = ""
    qty: int = 0
    cost_price: float = 0.0


class ScheduleSettings(BaseModel):
    morning_hour: int = 8
    morning_minute: int = 0
    evening_hour: int = 18
    evening_minute: int = 0
    enabled: bool = True


@app.post("/watchlist")
async def set_watchlist(items: List[WatchlistItem]):
    global _watchlist
    _watchlist = [it.dict() for it in items]
    return {"ok": True, "count": len(_watchlist)}


@app.get("/watchlist")
async def get_watchlist():
    return {"watchlist": _watchlist}


@app.put("/settings")
async def update_settings(body: ScheduleSettings):
    _settings.update(body.dict())
    reschedule(body.morning_hour, body.morning_minute, body.evening_hour, body.evening_minute)
    return {"ok": True, "settings": _settings}


@app.get("/settings")
async def get_settings():
    mj = scheduler.get_job("morning_job")
    ej = scheduler.get_job("evening_job")
    return {
        "settings": _settings,
        "next_morning": str(mj.next_run_time) if mj else None,
        "next_evening": str(ej.next_run_time) if ej else None,
    }


@app.post("/trigger/{ntype}")
async def trigger_now(ntype: str):
    """Manually trigger morning or evening analysis."""
    if ntype not in ("morning", "evening"):
        raise HTTPException(400, "type must be morning or evening")
    payload = await build_holdings_analysis(ntype)
    await broadcast(payload)
    return {"ok": True, "items": len(payload["items"])}


@app.get("/history")
async def get_history(limit: int = 20):
    return {"history": list(_history)[:limit]}


@app.get("/health")
async def health():
    return {"ok": True, "connections": len(_connections), "watchlist": len(_watchlist)}


# ── Main ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")
