#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MooMoo API Wrapper Layer
Provides a Python interface to MooMoo API with caching and error handling
"""

import sys
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, asdict
import json
import logging

# Add lib directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'lib'))

try:
    from moomoo import (
        OpenQuoteContext,
        OpenHKTradeContext,
        RET_OK,
        RET_ERROR,
        SubType,
        KLType,
        AuType,
        Market,
        SecurityType,
        TrdSide,
        OrderStatus,
    )
except ImportError as e:
    print(f"Error importing MooMoo SDK: {e}")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class QuoteData:
    """Stock quote data"""
    code: str
    price: float
    high: float
    low: float
    volume: int
    turnover: float
    change_val: float
    change_rate: float
    timestamp: str


@dataclass
class KlineData:
    """K-line data"""
    code: str
    time_key: str
    open: float
    close: float
    high: float
    low: float
    volume: int
    turnover: float


@dataclass
class OrderBookData:
    """Order book data"""
    code: str
    bid: List[Dict]  # [{'price': float, 'volume': int}, ...]
    ask: List[Dict]


class CacheManager:
    """Simple in-memory cache with TTL"""
    
    def __init__(self):
        self.cache: Dict[str, Tuple[any, datetime]] = {}
    
    def get(self, key: str) -> Optional[any]:
        """Get value from cache if not expired"""
        if key in self.cache:
            value, expiry = self.cache[key]
            if datetime.now() < expiry:
                logger.debug(f"Cache hit: {key}")
                return value
            else:
                del self.cache[key]
                logger.debug(f"Cache expired: {key}")
        return None
    
    def set(self, key: str, value: any, ttl_seconds: int = 5):
        """Set value in cache with TTL"""
        expiry = datetime.now() + timedelta(seconds=ttl_seconds)
        self.cache[key] = (value, expiry)
        logger.debug(f"Cache set: {key} (TTL: {ttl_seconds}s)")
    
    def clear(self):
        """Clear all cache"""
        self.cache.clear()


class MooMooQuoteWrapper:
    """Wrapper for MooMoo Quote API"""
    
    def __init__(self, host: str = '127.0.0.1', port: int = 11111):
        """Initialize quote context"""
        self.host = host
        self.port = port
        self.ctx = None
        self.cache = CacheManager()
        self._connect()
    
    def _connect(self):
        """Connect to MooMoo OpenD"""
        try:
            self.ctx = OpenQuoteContext(host=self.host, port=self.port)
            logger.info(f"Connected to MooMoo OpenD at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to MooMoo OpenD: {e}")
            raise
    
    def get_current_price(self, code: str) -> Optional[QuoteData]:
        """Get current stock price"""
        cache_key = f"quote:{code}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        try:
            ret, data = self.ctx.get_cur_kline(code, 1, SubType.K_1M, AuType.QFQ)
            if ret != RET_OK:
                logger.error(f"Failed to get quote for {code}: {data}")
                return None
            
            quote = QuoteData(
                code=code,
                price=float(data['close'].iloc[0]),
                high=float(data['high'].iloc[0]),
                low=float(data['low'].iloc[0]),
                volume=int(data['volume'].iloc[0]),
                turnover=float(data['turnover'].iloc[0]),
                change_val=float(data['change_val'].iloc[0]) if 'change_val' in data else 0.0,
                change_rate=float(data['change_rate'].iloc[0]) if 'change_rate' in data else 0.0,
                timestamp=str(data['time_key'].iloc[0]),
            )
            
            self.cache.set(cache_key, quote, ttl_seconds=5)
            return quote
        except Exception as e:
            logger.error(f"Error getting current price for {code}: {e}")
            return None
    
    def get_kline(self, code: str, days: int = 30, ktype: str = 'K_DAY') -> Optional[List[KlineData]]:
        """Get historical K-line data"""
        cache_key = f"kline:{code}:{ktype}:{days}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        try:
            kl_type = getattr(KLType, ktype, KLType.K_DAY)
            ret, data = self.ctx.request_history_kline(
                code, start=None, end=None, ktype=kl_type, autype=AuType.QFQ
            )
            
            if ret != RET_OK:
                logger.error(f"Failed to get kline for {code}: {data}")
                return None
            
            klines = []
            for idx, row in data.iterrows():
                kline = KlineData(
                    code=code,
                    time_key=str(row['time_key']),
                    open=float(row['open']),
                    close=float(row['close']),
                    high=float(row['high']),
                    low=float(row['low']),
                    volume=int(row['volume']),
                    turnover=float(row['turnover']),
                )
                klines.append(kline)
            
            # Cache for 1 minute for daily data
            ttl = 60 if ktype == 'K_DAY' else 5
            self.cache.set(cache_key, klines, ttl_seconds=ttl)
            return klines
        except Exception as e:
            logger.error(f"Error getting kline for {code}: {e}")
            return None
    
    def get_orderbook(self, code: str) -> Optional[OrderBookData]:
        """Get order book data"""
        cache_key = f"orderbook:{code}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        try:
            ret, data = self.ctx.get_order_book(code)
            if ret != RET_OK:
                logger.error(f"Failed to get orderbook for {code}: {data}")
                return None
            
            # Parse bid/ask data
            bid_list = []
            ask_list = []
            
            if 'Bid' in data:
                for idx, row in data['Bid'].iterrows():
                    bid_list.append({
                        'price': float(row['Price']),
                        'volume': int(row['Volume']),
                    })
            
            if 'Ask' in data:
                for idx, row in data['Ask'].iterrows():
                    ask_list.append({
                        'price': float(row['Price']),
                        'volume': int(row['Volume']),
                    })
            
            orderbook = OrderBookData(
                code=code,
                bid=bid_list,
                ask=ask_list,
            )
            
            self.cache.set(cache_key, orderbook, ttl_seconds=5)
            return orderbook
        except Exception as e:
            logger.error(f"Error getting orderbook for {code}: {e}")
            return None
    
    def get_stock_basicinfo(self, market: str = 'HK') -> Optional[List[Dict]]:
        """Get basic stock information for a market"""
        cache_key = f"basicinfo:{market}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        try:
            mkt = getattr(Market, market, Market.HK)
            ret, data = self.ctx.get_stock_basicinfo(mkt, SecurityType.STOCK)
            
            if ret != RET_OK:
                logger.error(f"Failed to get basicinfo for {market}: {data}")
                return None
            
            stocks = []
            for idx, row in data.iterrows():
                stocks.append({
                    'code': str(row['code']),
                    'name': str(row['name']),
                    'lot_size': int(row['lot_size']),
                })
            
            self.cache.set(cache_key, stocks, ttl_seconds=300)  # 5 minutes
            return stocks
        except Exception as e:
            logger.error(f"Error getting basicinfo for {market}: {e}")
            return None
    
    def close(self):
        """Close connection"""
        if self.ctx:
            self.ctx.close()
            logger.info("Connection closed")


class MooMooTradeWrapper:
    """Wrapper for MooMoo Trade API"""
    
    def __init__(self, host: str = '127.0.0.1', port: int = 11111, trade_type: str = 'HK'):
        """Initialize trade context"""
        self.host = host
        self.port = port
        self.trade_type = trade_type
        self.ctx = None
        self._connect()
    
    def _connect(self):
        """Connect to MooMoo OpenD"""
        try:
            if self.trade_type == 'HK':
                self.ctx = OpenHKTradeContext(host=self.host, port=self.port)
            else:
                raise ValueError(f"Unsupported trade type: {self.trade_type}")
            logger.info(f"Connected to MooMoo Trade API ({self.trade_type}) at {self.host}:{self.port}")
        except Exception as e:
            logger.error(f"Failed to connect to MooMoo Trade API: {e}")
            raise
    
    def unlock_trade(self, password: str) -> bool:
        """Unlock trading"""
        try:
            ret, data = self.ctx.unlock_trade(password)
            if ret == RET_OK:
                logger.info("Trade unlocked successfully")
                return True
            else:
                logger.error(f"Failed to unlock trade: {data}")
                return False
        except Exception as e:
            logger.error(f"Error unlocking trade: {e}")
            return False
    
    def get_account_info(self) -> Optional[Dict]:
        """Get account information"""
        try:
            ret, data = self.ctx.accinfo_query()
            if ret != RET_OK:
                logger.error(f"Failed to get account info: {data}")
                return None
            
            return {
                'cash': float(data['cash'].iloc[0]) if 'cash' in data else 0.0,
                'market_val': float(data['market_val'].iloc[0]) if 'market_val' in data else 0.0,
                'total_assets': float(data['total_assets'].iloc[0]) if 'total_assets' in data else 0.0,
            }
        except Exception as e:
            logger.error(f"Error getting account info: {e}")
            return None
    
    def get_position_list(self) -> Optional[List[Dict]]:
        """Get position list"""
        try:
            ret, data = self.ctx.position_list_query()
            if ret != RET_OK:
                logger.error(f"Failed to get position list: {data}")
                return None
            
            positions = []
            for idx, row in data.iterrows():
                positions.append({
                    'code': str(row['code']),
                    'qty': int(row['qty']),
                    'price': float(row['price']),
                    'cost_price': float(row['cost_price']) if 'cost_price' in row else 0.0,
                })
            
            return positions
        except Exception as e:
            logger.error(f"Error getting position list: {e}")
            return None
    
    def close(self):
        """Close connection"""
        if self.ctx:
            self.ctx.close()
            logger.info("Trade connection closed")


# Global instances
_quote_wrapper: Optional[MooMooQuoteWrapper] = None
_trade_wrapper: Optional[MooMooTradeWrapper] = None


def get_quote_wrapper() -> MooMooQuoteWrapper:
    """Get or create global quote wrapper instance"""
    global _quote_wrapper
    if _quote_wrapper is None:
        _quote_wrapper = MooMooQuoteWrapper()
    return _quote_wrapper


def get_trade_wrapper() -> MooMooTradeWrapper:
    """Get or create global trade wrapper instance"""
    global _trade_wrapper
    if _trade_wrapper is None:
        _trade_wrapper = MooMooTradeWrapper()
    return _trade_wrapper


def close_all():
    """Close all connections"""
    global _quote_wrapper, _trade_wrapper
    if _quote_wrapper:
        _quote_wrapper.close()
        _quote_wrapper = None
    if _trade_wrapper:
        _trade_wrapper.close()
        _trade_wrapper = None


if __name__ == '__main__':
    # Test the wrapper
    try:
        quote_wrapper = get_quote_wrapper()
        
        # Test getting current price
        quote = quote_wrapper.get_current_price('HK.00700')
        if quote:
            print(f"Quote for HK.00700: {quote}")
        
        # Test getting kline data
        klines = quote_wrapper.get_kline('HK.00700', ktype='K_DAY')
        if klines:
            print(f"Got {len(klines)} klines")
        
        close_all()
    except Exception as e:
        print(f"Error: {e}")
        close_all()
        sys.exit(1)
