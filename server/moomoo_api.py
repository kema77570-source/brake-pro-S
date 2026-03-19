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
    price: float
    side: str = Field(..., pattern="^(BUY|SELL)$")


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
    """Place a trade order (simulation)"""
    try:
        global _order_counter
        _order_counter += 1
        
        order = {
            "order_id": _order_counter,
            "code": request.code,
            "quantity": request.quantity,
            "price": request.price,
            "side": request.side,
            "status": "FILLED",
            "created_at": datetime.now().isoformat(),
        }
        
        _orders[_order_counter] = order
        
        return order
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
