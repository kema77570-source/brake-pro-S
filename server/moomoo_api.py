#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
FastAPI Backend for MooMoo API Integration
Provides REST API endpoints for stock data, portfolio management, and trading
"""

import os
import sys
import logging
from datetime import datetime
from typing import List, Optional, Dict
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Add server directory to path
sys.path.insert(0, os.path.dirname(__file__))

from moomoo_wrapper import (
    get_quote_wrapper,
    get_trade_wrapper,
    close_all,
    QuoteData,
    KlineData,
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================================================
# Pydantic Models
# ============================================================================


class QuoteResponse(BaseModel):
    """Stock quote response"""
    code: str
    price: float
    high: float
    low: float
    volume: int
    turnover: float
    change_val: float
    change_rate: float
    timestamp: str


class KlineResponse(BaseModel):
    """K-line data response"""
    code: str
    time_key: str
    open: float
    close: float
    high: float
    low: float
    volume: int
    turnover: float


class OrderBookResponse(BaseModel):
    """Order book response"""
    code: str
    bid: List[Dict[str, float]]
    ask: List[Dict[str, float]]


class PortfolioHolding(BaseModel):
    """Portfolio holding"""
    code: str
    quantity: int
    cost_price: float
    current_price: float = 0.0
    pnl: float = 0.0
    pnl_rate: float = 0.0


class PortfolioSummary(BaseModel):
    """Portfolio summary"""
    total_value: float
    total_cost: float
    total_pnl: float
    pnl_rate: float
    holdings: List[PortfolioHolding]


class AddHoldingRequest(BaseModel):
    """Request to add holding"""
    code: str
    quantity: int
    cost_price: float


class UpdateHoldingRequest(BaseModel):
    """Request to update holding"""
    quantity: int
    cost_price: Optional[float] = None


class TradeOrderRequest(BaseModel):
    """Trade order request"""
    code: str
    quantity: int
    side: str = Field(..., pattern="^(BUY|SELL)$")
    order_type: str = Field(
        default="MARKET",
        pattern="^(MARKET|LIMIT|STOP_LIMIT|STOP_MARKET|TRIGGER_LIMIT|TRIGGER_MARKET|TRAIL_STOP_LIMIT|TRAIL_STOP_MARKET)$",
    )
    # 指値・逆指値・トリガー用
    price: Optional[float] = None
    # 逆指値 / トリガー用トリガー価格
    trigger_price: Optional[float] = None
    # トレールストップ用：トレール幅（金額 or %）
    trail_amount: Optional[float] = None
    trail_type: Optional[str] = Field(default="AMOUNT", pattern="^(AMOUNT|PERCENT)$")
    # トレールストップ（指値）用：指値オフセット
    limit_offset: Optional[float] = None


class ErrorResponse(BaseModel):
    """Error response"""
    error: str
    detail: Optional[str] = None


# ============================================================================
# Lifespan Management
# ============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan"""
    # Startup
    logger.info("Starting MooMoo API server")
    try:
        # Initialize wrappers
        get_quote_wrapper()
        logger.info("Quote wrapper initialized")
    except Exception as e:
        logger.error(f"Failed to initialize quote wrapper: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down MooMoo API server")
    close_all()


# ============================================================================
# FastAPI Application
# ============================================================================

app = FastAPI(
    title="BRAKE Pro × MooMoo API",
    description="REST API for stock data and portfolio management",
    version="1.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# Quote API Endpoints
# ============================================================================


@app.get("/api/quote/current")
async def get_current_quote(code: str = "HK.00700"):
    quote_ctx = None
    try:
        quote_ctx = OpenQuoteContext(host=HOST, port=PORT)
        ret, data = quote_ctx.get_market_snapshot(code)

        if ret != 0:
            return {
                "status": "error",
                "code": str(code),
                "ret": int(ret),
                "message": str(data),
            }

        records = []
        try:
            records = data.astype(object).where(data.notna(), None).to_dict(orient="records")
        except Exception:
            records = [{"raw": str(data)}]

        return {
            "status": "ok",
            "code": str(code),
            "ret": int(ret),
            "count": len(records),
            "rows": records,
        }

    except Exception as e:
        return {
            "status": "error",
            "code": str(code),
            "message": str(e),
            "error_type": type(e).__name__,
        }

    finally:
        if quote_ctx is not None:
            quote_ctx.close()


@app.get("/api/quote/kline", response_model=List[KlineResponse])
async def get_kline(
    code: str = Query(..., description="Stock code"),
    ktype: str = Query("K_DAY", description="K-line type (K_1M, K_5M, K_15M, K_30M, K_60M, K_DAY, K_WEEK, K_MONTH)"),
    days: int = Query(30, description="Number of days to retrieve"),
):
    """Get K-line data"""
    try:
        wrapper = get_quote_wrapper()
        klines = wrapper.get_kline(code, days=days, ktype=ktype)
        
        if not klines:
            raise HTTPException(status_code=404, detail=f"Failed to get kline for {code}")
        
        return [
            KlineResponse(
                code=kline.code,
                time_key=kline.time_key,
                open=kline.open,
                close=kline.close,
                high=kline.high,
                low=kline.low,
                volume=kline.volume,
                turnover=kline.turnover,
            )
            for kline in klines
        ]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting kline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quote/orderbook", response_model=OrderBookResponse)
async def get_orderbook(code: str = Query(..., description="Stock code")):
    """Get order book data"""
    try:
        wrapper = get_quote_wrapper()
        orderbook = wrapper.get_orderbook(code)
        
        if not orderbook:
            raise HTTPException(status_code=404, detail=f"Failed to get orderbook for {code}")
        
        return OrderBookResponse(
            code=orderbook.code,
            bid=orderbook.bid,
            ask=orderbook.ask,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting orderbook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/quote/basicinfo")
async def get_basicinfo(market: str = Query("HK", description="Market code (HK, US, SZ, SH)")):
    """Get basic stock information"""
    try:
        wrapper = get_quote_wrapper()
        stocks = wrapper.get_stock_basicinfo(market)
        
        if not stocks:
            raise HTTPException(status_code=404, detail=f"Failed to get basicinfo for {market}")
        
        return {"market": market, "stocks": stocks}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting basicinfo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Security Search Endpoint
# ============================================================================

# Static well-known securities list (extended with US/HK/JP symbols)
_SECURITIES_DB = [
    # US Tech
    {"code": "US.AAPL",  "ticker": "AAPL",  "name": "Apple Inc.",                "market": "US", "type": "stock"},
    {"code": "US.MSFT",  "ticker": "MSFT",  "name": "Microsoft Corporation",      "market": "US", "type": "stock"},
    {"code": "US.GOOGL", "ticker": "GOOGL", "name": "Alphabet Inc.",              "market": "US", "type": "stock"},
    {"code": "US.AMZN",  "ticker": "AMZN",  "name": "Amazon.com Inc.",            "market": "US", "type": "stock"},
    {"code": "US.NVDA",  "ticker": "NVDA",  "name": "NVIDIA Corporation",         "market": "US", "type": "stock"},
    {"code": "US.META",  "ticker": "META",  "name": "Meta Platforms Inc.",        "market": "US", "type": "stock"},
    {"code": "US.TSLA",  "ticker": "TSLA",  "name": "Tesla Inc.",                 "market": "US", "type": "stock"},
    {"code": "US.AMD",   "ticker": "AMD",   "name": "Advanced Micro Devices",     "market": "US", "type": "stock"},
    {"code": "US.INTC",  "ticker": "INTC",  "name": "Intel Corporation",          "market": "US", "type": "stock"},
    {"code": "US.NFLX",  "ticker": "NFLX",  "name": "Netflix Inc.",               "market": "US", "type": "stock"},
    {"code": "US.PYPL",  "ticker": "PYPL",  "name": "PayPal Holdings",            "market": "US", "type": "stock"},
    {"code": "US.CRM",   "ticker": "CRM",   "name": "Salesforce Inc.",            "market": "US", "type": "stock"},
    {"code": "US.ORCL",  "ticker": "ORCL",  "name": "Oracle Corporation",         "market": "US", "type": "stock"},
    {"code": "US.ADBE",  "ticker": "ADBE",  "name": "Adobe Inc.",                 "market": "US", "type": "stock"},
    {"code": "US.QCOM",  "ticker": "QCOM",  "name": "Qualcomm Inc.",              "market": "US", "type": "stock"},
    # US Finance
    {"code": "US.JPM",   "ticker": "JPM",   "name": "JPMorgan Chase & Co.",       "market": "US", "type": "stock"},
    {"code": "US.BAC",   "ticker": "BAC",   "name": "Bank of America Corp.",      "market": "US", "type": "stock"},
    {"code": "US.GS",    "ticker": "GS",    "name": "Goldman Sachs Group",        "market": "US", "type": "stock"},
    {"code": "US.MS",    "ticker": "MS",    "name": "Morgan Stanley",             "market": "US", "type": "stock"},
    # US ETF
    {"code": "US.SPY",   "ticker": "SPY",   "name": "SPDR S&P 500 ETF",          "market": "US", "type": "etf"},
    {"code": "US.QQQ",   "ticker": "QQQ",   "name": "Invesco QQQ Trust",          "market": "US", "type": "etf"},
    {"code": "US.VTI",   "ticker": "VTI",   "name": "Vanguard Total Stock Market","market": "US", "type": "etf"},
    {"code": "US.IWM",   "ticker": "IWM",   "name": "iShares Russell 2000 ETF",  "market": "US", "type": "etf"},
    {"code": "US.GLD",   "ticker": "GLD",   "name": "SPDR Gold Shares",           "market": "US", "type": "etf"},
    {"code": "US.TLT",   "ticker": "TLT",   "name": "iShares 20+ Year Treasury",  "market": "US", "type": "etf"},
    # HK
    {"code": "HK.00700", "ticker": "0700",  "name": "テンセント",                 "market": "HK", "type": "stock"},
    {"code": "HK.09988", "ticker": "9988",  "name": "アリババグループ",            "market": "HK", "type": "stock"},
    {"code": "HK.03690", "ticker": "3690",  "name": "美団",                       "market": "HK", "type": "stock"},
    {"code": "HK.00005", "ticker": "0005",  "name": "HSBC ホールディングス",      "market": "HK", "type": "stock"},
    # JP
    {"code": "JP.7203",  "ticker": "7203.T","name": "トヨタ自動車",               "market": "JP", "type": "stock"},
    {"code": "JP.9984",  "ticker": "9984.T","name": "ソフトバンクグループ",        "market": "JP", "type": "stock"},
    {"code": "JP.6758",  "ticker": "6758.T","name": "ソニーグループ",              "market": "JP", "type": "stock"},
    {"code": "JP.8306",  "ticker": "8306.T","name": "三菱UFJ FG",                 "market": "JP", "type": "stock"},
    {"code": "JP.6501",  "ticker": "6501.T","name": "日立製作所",                  "market": "JP", "type": "stock"},
    {"code": "JP.4502",  "ticker": "4502.T","name": "武田薬品工業",               "market": "JP", "type": "stock"},
]


@app.get("/api/quote/search")
async def search_securities(q: str = Query(..., min_length=1, description="Search query (ticker or name)")):
    """
    Search moomoo-tradeable securities by ticker symbol or name.
    First tries OpenD get_stock_basicinfo; falls back to static list.
    """
    q_lower = q.lower().strip()
    results: list[dict] = []

    # 1. Try live search via OpenD
    try:
        from moomoo import OpenQuoteContext, Market, SecurityType, RET_OK
        with OpenQuoteContext(host="127.0.0.1", port=11111) as ctx:
            for mkt in [Market.US, Market.HK, Market.SH, Market.SZ]:
                ret, data = ctx.get_stock_basicinfo(mkt, SecurityType.STOCK, q.upper())
                if ret == RET_OK and not data.empty:
                    for _, row in data.iterrows():
                        if len(results) >= 20:
                            break
                        results.append({
                            "code": str(row["code"]),
                            "ticker": str(row["code"]).split(".")[-1],
                            "name": str(row["name"]),
                            "market": str(mkt).split(".")[-1],
                            "type": "stock",
                        })
                if len(results) >= 20:
                    break
    except Exception:
        pass  # Fall through to static list

    # 2. Fall back to static list
    if not results:
        for sec in _SECURITIES_DB:
            if (q_lower in sec["ticker"].lower() or
                q_lower in sec["name"].lower() or
                q_lower in sec["code"].lower()):
                results.append(sec)
            if len(results) >= 15:
                break

    return {"query": q, "results": results[:15]}


# ============================================================================
# Portfolio API Endpoints
# ============================================================================

# In-memory portfolio storage (replace with database in production)
_portfolio: Dict[str, PortfolioHolding] = {}


@app.get("/api/portfolio/list", response_model=List[PortfolioHolding])
async def get_portfolio_list():
    """Get portfolio holdings list"""
    try:
        # Update current prices
        wrapper = get_quote_wrapper()
        holdings = []
        
        for code, holding in _portfolio.items():
            quote = wrapper.get_current_price(code)
            if quote:
                holding.current_price = quote.price
                holding.pnl = (quote.price - holding.cost_price) * holding.quantity
                holding.pnl_rate = ((quote.price - holding.cost_price) / holding.cost_price * 100) if holding.cost_price > 0 else 0
            holdings.append(holding)
        
        return holdings
    except Exception as e:
        logger.error(f"Error getting portfolio list: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/portfolio/add", response_model=PortfolioHolding)
async def add_holding(request: AddHoldingRequest):
    """Add holding to portfolio"""
    try:
        holding = PortfolioHolding(
            code=request.code,
            quantity=request.quantity,
            cost_price=request.cost_price,
        )
        _portfolio[request.code] = holding
        return holding
    except Exception as e:
        logger.error(f"Error adding holding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/portfolio/{code}", response_model=PortfolioHolding)
async def update_holding(code: str, request: UpdateHoldingRequest):
    """Update holding in portfolio"""
    try:
        if code not in _portfolio:
            raise HTTPException(status_code=404, detail=f"Holding {code} not found")
        
        holding = _portfolio[code]
        holding.quantity = request.quantity
        if request.cost_price is not None:
            holding.cost_price = request.cost_price
        
        return holding
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating holding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/portfolio/{code}")
async def delete_holding(code: str):
    """Delete holding from portfolio"""
    try:
        if code not in _portfolio:
            raise HTTPException(status_code=404, detail=f"Holding {code} not found")
        
        del _portfolio[code]
        return {"success": True, "message": f"Holding {code} deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting holding: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio/summary", response_model=PortfolioSummary)
async def get_portfolio_summary():
    """Get portfolio summary"""
    try:
        wrapper = get_quote_wrapper()
        holdings = []
        total_value = 0.0
        total_cost = 0.0
        
        for code, holding in _portfolio.items():
            quote = wrapper.get_current_price(code)
            if quote:
                holding.current_price = quote.price
                holding.pnl = (quote.price - holding.cost_price) * holding.quantity
                holding.pnl_rate = ((quote.price - holding.cost_price) / holding.cost_price * 100) if holding.cost_price > 0 else 0
                
                total_value += quote.price * holding.quantity
                total_cost += holding.cost_price * holding.quantity
            
            holdings.append(holding)
        
        total_pnl = total_value - total_cost
        pnl_rate = (total_pnl / total_cost * 100) if total_cost > 0 else 0
        
        return PortfolioSummary(
            total_value=total_value,
            total_cost=total_cost,
            total_pnl=total_pnl,
            pnl_rate=pnl_rate,
            holdings=holdings,
        )
    except Exception as e:
        logger.error(f"Error getting portfolio summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Trade Simulation API Endpoints
# ============================================================================

# In-memory trade order storage (replace with database in production)
_orders: Dict[int, Dict] = {}
_order_counter = 0


@app.post("/api/trade/place-order")
async def place_order(request: TradeOrderRequest):
    """Place a trade order via MooMoo OpenD (falls back to simulation if OpenD not available)"""
    try:
        global _order_counter
        _order_counter += 1

        # Validate fields per order type
        if request.order_type in ("LIMIT", "TRAIL_STOP_LIMIT") and request.price is None:
            raise HTTPException(status_code=400, detail="price is required for LIMIT order types")
        if request.order_type in ("STOP_LIMIT", "STOP_MARKET", "TRIGGER_LIMIT", "TRIGGER_MARKET") and request.trigger_price is None:
            raise HTTPException(status_code=400, detail="trigger_price is required for STOP/TRIGGER order types")
        if request.order_type in ("TRAIL_STOP_LIMIT", "TRAIL_STOP_MARKET") and request.trail_amount is None:
            raise HTTPException(status_code=400, detail="trail_amount is required for TRAIL_STOP order types")

        # Try to place via MooMoo OpenD
        order_id = _order_counter
        status = "SUBMITTED"
        moomoo_order_id = None

        try:
            from moomoo import (
                OpenUSTradeContext, OpenHKTradeContext,
                TrdSide, OrderType, TrdEnv, RET_OK,
            )
            trd_side = TrdSide.BUY if request.side == "BUY" else TrdSide.SELL

            # Map BRAKE order_type → moomoo OrderType
            OT_MAP = {
                "MARKET": OrderType.MARKET,
                "LIMIT": OrderType.NORMAL,
                "STOP_LIMIT": OrderType.STOP_LIMIT,
                "STOP_MARKET": OrderType.STOP,
                "TRIGGER_LIMIT": OrderType.STOP_LIMIT,
                "TRIGGER_MARKET": OrderType.STOP,
                "TRAIL_STOP_LIMIT": OrderType.TRAIL_STOP_LIMIT if hasattr(OrderType, "TRAIL_STOP_LIMIT") else OrderType.MARKET,
                "TRAIL_STOP_MARKET": OrderType.TRAIL_STOP if hasattr(OrderType, "TRAIL_STOP") else OrderType.MARKET,
            }
            moomoo_ot = OT_MAP.get(request.order_type, OrderType.MARKET)
            price_val = request.price if request.price is not None else 0.0
            trigger_val = request.trigger_price if request.trigger_price is not None else 0.0

            # Choose context (US/HK) based on code prefix
            CtxCls = OpenUSTradeContext if request.code.startswith("US.") else OpenHKTradeContext
            with CtxCls(host="127.0.0.1", port=11111) as ctx:
                ret, data = ctx.place_order(
                    price=price_val,
                    qty=request.quantity,
                    code=request.code,
                    trd_side=trd_side,
                    order_type=moomoo_ot,
                    trd_env=TrdEnv.REAL,
                    aux_price=trigger_val,
                )
                if ret == RET_OK:
                    moomoo_order_id = str(data["order_id"].iloc[0])
                    status = "SUBMITTED_TO_MOOMOO"

        except Exception as e:
            logger.warning(f"MooMoo order failed, using simulation: {e}")
            status = "SIMULATED"

        order = {
            "order_id": order_id,
            "moomoo_order_id": moomoo_order_id,
            "code": request.code,
            "quantity": request.quantity,
            "price": request.price,
            "trigger_price": request.trigger_price,
            "trail_amount": request.trail_amount,
            "trail_type": request.trail_type,
            "limit_offset": request.limit_offset,
            "order_type": request.order_type,
            "side": request.side,
            "status": status,
            "created_at": datetime.now().isoformat(),
        }

        _orders[order_id] = order
        return order
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error placing order: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/trade/order-list")
async def get_order_list():
    """Get order list"""
    try:
        return list(_orders.values())
    except Exception as e:
        logger.error(f"Error getting order list: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# Stock Analysis API Endpoints
# ============================================================================

import asyncio
from concurrent.futures import ThreadPoolExecutor

_exec = ThreadPoolExecutor(max_workers=3)

async def _run_sync(fn, *args):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_exec, fn, *args)


@app.get("/api/analysis/{code}")
async def get_stock_analysis(
    code: str,
    days: int = Query(400, ge=60, le=800, description="History days (need 252+ for 52W)"),
):
    """
    Comprehensive stock analysis:
    - Price summary (current, 52W hi/lo, change)
    - Technical indicators (RSI, MA50/200, MACD, Bollinger)
    - MA signals (golden/dead cross)
    - Support/Resistance levels
    - Analyst consensus (static placeholder — moomoo does not expose sell-side)
    """
    from technicals import (
        compute_rsi, compute_sma, compute_ema, compute_macd,
        compute_bollinger, find_support_resistance, ma_signal, week52,
    )

    def _fetch():
        wrapper = get_quote_wrapper()

        # Current snapshot
        quote = wrapper.get_current_price(code)
        if not quote:
            return None, "quote failed"

        # Historical K-lines (daily)
        klines = wrapper.get_kline(code, days=days, ktype="K_DAY")
        if not klines:
            return None, "kline failed"

        closes = [k.close for k in klines]
        highs  = [k.high  for k in klines]
        lows   = [k.low   for k in klines]

        current = quote.price

        # Technical indicators
        rsi14    = compute_rsi(closes, 14)
        ma50     = compute_sma(closes, 50)
        ma200    = compute_sma(closes, 200)
        ema200   = compute_ema(closes, 200)
        macd     = compute_macd(closes)
        boll     = compute_bollinger(closes, 20)
        w52      = week52(highs, lows)
        sr       = find_support_resistance(highs, lows, closes, current)
        ma_sig   = ma_signal(current, ma50, ma200)

        # RSI interpretation
        if rsi14 >= 70:
            rsi_signal = "overbought"
        elif rsi14 <= 30:
            rsi_signal = "oversold"
        elif rsi14 <= 40:
            rsi_signal = "bearish"
        elif rsi14 >= 60:
            rsi_signal = "bullish"
        else:
            rsi_signal = "neutral"

        # Overall signal score (-100 to +100)
        score = 0
        if ma_sig.get("cross") == "golden": score += 25
        else: score -= 25
        if ma_sig.get("short") == "bullish": score += 20
        else: score -= 20
        if ma_sig.get("long") == "bullish": score += 20
        else: score -= 20
        if rsi14 < 30: score += 15      # oversold = potential buy
        elif rsi14 > 70: score -= 15
        if macd.get("hist") and macd["hist"] > 0: score += 20
        elif macd.get("hist") and macd["hist"] < 0: score -= 20

        return {
            "code": code,
            "price": {
                "current": current,
                "change_val": round(quote.change_val, 4),
                "change_rate": round(quote.change_rate, 2),
                "high_today": quote.high,
                "low_today": quote.low,
                "week52_high": w52["high"],
                "week52_low": w52["low"],
            },
            "technical": {
                "rsi14": rsi14,
                "rsi_signal": rsi_signal,
                "ma50": ma50,
                "ma200": ma200,
                "ema200": ema200,
                "macd": macd,
                "bollinger": boll,
                "ma_signals": ma_sig,
                "overall_score": score,  # -100 (strong sell) to +100 (strong buy)
            },
            "support_resistance": sr,
            "chart_closes": closes[-60:],   # last 60 days for sparkline
        }, None

    try:
        result, err = await _run_sync(_fetch)
        if err:
            raise HTTPException(status_code=503, detail=err)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Analysis failed")
        raise HTTPException(status_code=500, detail=str(e))


# ── NISA endpoints ─────────────────────────────────────────────────────────

# Curated high-dividend JP stocks for NISA reference
_NISA_DIVIDEND_STOCKS = [
    {"code": "JP.8411",  "ticker": "8411.T", "name": "みずほFG",         "sector": "金融", "div_yield_est": 4.10, "market": "プライム"},
    {"code": "JP.8316",  "ticker": "8316.T", "name": "三井住友FG",       "sector": "金融", "div_yield_est": 4.20, "market": "プライム"},
    {"code": "JP.8306",  "ticker": "8306.T", "name": "三菱UFJ FG",       "sector": "金融", "div_yield_est": 3.60, "market": "プライム"},
    {"code": "JP.8058",  "ticker": "8058.T", "name": "三菱商事",          "sector": "商社", "div_yield_est": 3.20, "market": "プライム"},
    {"code": "JP.8031",  "ticker": "8031.T", "name": "三井物産",          "sector": "商社", "div_yield_est": 3.80, "market": "プライム"},
    {"code": "JP.8001",  "ticker": "8001.T", "name": "伊藤忠商事",        "sector": "商社", "div_yield_est": 3.10, "market": "プライム"},
    {"code": "JP.4502",  "ticker": "4502.T", "name": "武田薬品工業",      "sector": "医薬", "div_yield_est": 4.50, "market": "プライム"},
    {"code": "JP.9432",  "ticker": "9432.T", "name": "日本電信電話(NTT)", "sector": "通信", "div_yield_est": 3.30, "market": "プライム"},
    {"code": "JP.9433",  "ticker": "9433.T", "name": "KDDI",              "sector": "通信", "div_yield_est": 3.10, "market": "プライム"},
    {"code": "JP.9020",  "ticker": "9020.T", "name": "東日本旅客鉄道",    "sector": "運輸", "div_yield_est": 1.80, "market": "プライム"},
    {"code": "JP.7203",  "ticker": "7203.T", "name": "トヨタ自動車",      "sector": "輸送機", "div_yield_est": 2.50, "market": "プライム"},
    {"code": "JP.6501",  "ticker": "6501.T", "name": "日立製作所",        "sector": "電機", "div_yield_est": 1.60, "market": "プライム"},
    {"code": "JP.6503",  "ticker": "6503.T", "name": "三菱電機",          "sector": "電機", "div_yield_est": 2.40, "market": "プライム"},
    {"code": "JP.5020",  "ticker": "5020.T", "name": "ENEOSホールディングス", "sector": "エネルギー", "div_yield_est": 3.90, "market": "プライム"},
    {"code": "JP.5401",  "ticker": "5401.T", "name": "日本製鉄",          "sector": "鉄鋼", "div_yield_est": 4.80, "market": "プライム"},
    {"code": "JP.8267",  "ticker": "8267.T", "name": "イオン",            "sector": "小売", "div_yield_est": 1.00, "market": "プライム"},
    {"code": "JP.2914",  "ticker": "2914.T", "name": "日本たばこ産業(JT)", "sector": "食品", "div_yield_est": 5.50, "market": "プライム"},
    {"code": "JP.8725",  "ticker": "8725.T", "name": "MS&ADインシュアランス", "sector": "保険", "div_yield_est": 3.70, "market": "プライム"},
    {"code": "JP.8750",  "ticker": "8750.T", "name": "第一生命HD",         "sector": "保険", "div_yield_est": 3.40, "market": "プライム"},
    {"code": "JP.3436",  "ticker": "3436.T", "name": "SUMCO",             "sector": "素材", "div_yield_est": 3.60, "market": "プライム"},
]

# 貸株金利 reference table (approximate annual rates from moomoo JP)
_LENDING_RATES = [
    {"ticker": "7203.T", "name": "トヨタ自動車",   "rate": 0.10, "availability": "高"},
    {"ticker": "9984.T", "name": "ソフトバンクG",  "rate": 0.40, "availability": "高"},
    {"ticker": "6758.T", "name": "ソニーG",        "rate": 0.15, "availability": "高"},
    {"ticker": "6861.T", "name": "キーエンス",      "rate": 0.10, "availability": "高"},
    {"ticker": "4519.T", "name": "中外製薬",        "rate": 0.30, "availability": "中"},
    {"ticker": "6098.T", "name": "リクルートHD",   "rate": 0.20, "availability": "高"},
    {"ticker": "2413.T", "name": "エムスリー",      "rate": 1.50, "availability": "中"},
    {"ticker": "4751.T", "name": "サイバーエージェント", "rate": 0.60, "availability": "中"},
    {"ticker": "4385.T", "name": "メルカリ",        "rate": 2.00, "availability": "低"},
    {"ticker": "4385.T", "name": "freee",           "rate": 3.50, "availability": "低"},
    {"ticker": "2121.T", "name": "MIXI",            "rate": 0.80, "availability": "中"},
    {"ticker": "3659.T", "name": "ネクソン",        "rate": 0.50, "availability": "中"},
    {"ticker": "4565.T", "name": "そーせいグループ","rate": 4.00, "availability": "低"},
    {"ticker": "8411.T", "name": "みずほFG",        "rate": 0.10, "availability": "高"},
    {"ticker": "8316.T", "name": "三井住友FG",      "rate": 0.10, "availability": "高"},
    {"ticker": "9432.T", "name": "NTT",             "rate": 0.10, "availability": "高"},
    {"ticker": "6954.T", "name": "ファナック",       "rate": 0.15, "availability": "高"},
    {"ticker": "6920.T", "name": "レーザーテック",  "rate": 1.20, "availability": "低"},
    {"ticker": "4063.T", "name": "信越化学工業",    "rate": 0.20, "availability": "高"},
    {"ticker": "2330.T", "name": "フォースメディア", "rate": 8.00, "availability": "低"},
]


@app.get("/api/nisa/dividends")
async def get_nisa_dividends(sort_by: str = Query("div_yield_est", description="sort field")):
    """
    NISA向け高配当株一覧。
    div_yield_est は参考値（実際はmoomooまたは各社IRで確認）。
    """
    stocks = sorted(_NISA_DIVIDEND_STOCKS, key=lambda s: -s.get(sort_by, 0))
    return {
        "stocks": stocks,
        "note": "配当利回りは推計値です。最新の確定値は各社IR・moomoo証券でご確認ください。",
        "nisa_limit": {
            "growth": 2_400_000,      # 成長投資枠
            "accumulation": 1_200_000, # つみたて投資枠
            "total_annual": 3_600_000,
            "lifetime": 18_000_000,
        },
    }


@app.get("/api/nisa/lending-rates")
async def get_lending_rates(min_rate: float = Query(0.0, description="Minimum rate filter")):
    """
    貸株金利一覧（参考値）。
    実際の金利はmoomoo証券アプリ内で確認してください。
    """
    rates = [r for r in _LENDING_RATES if r["rate"] >= min_rate]
    rates.sort(key=lambda r: -r["rate"])
    return {
        "rates": rates,
        "note": "金利は参考値です。moomoo証券の貸株サービス画面で最新金利をご確認ください。",
    }


# ============================================================================
# Health Check
# ============================================================================


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("API_PORT", 8000))
    host = os.getenv("API_HOST", "0.0.0.0")
    
    uvicorn.run(
        app,
        host=host,
        port=port,
        log_level="debug",
    )
