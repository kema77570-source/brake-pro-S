#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Unit tests for MooMoo API Wrapper
"""

import unittest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.dirname(__file__))

from moomoo_wrapper import (
    CacheManager,
    QuoteData,
    KlineData,
    OrderBookData,
)


class TestCacheManager(unittest.TestCase):
    """Test CacheManager class"""

    def setUp(self):
        self.cache = CacheManager()

    def test_cache_set_and_get(self):
        """Test setting and getting cache"""
        self.cache.set("test_key", "test_value", ttl_seconds=60)
        result = self.cache.get("test_key")
        self.assertEqual(result, "test_value")

    def test_cache_expiry(self):
        """Test cache expiry"""
        self.cache.set("test_key", "test_value", ttl_seconds=1)
        result = self.cache.get("test_key")
        self.assertEqual(result, "test_value")

        # Simulate time passing
        self.cache.cache["test_key"] = (
            "test_value",
            datetime.now() - timedelta(seconds=2),
        )
        result = self.cache.get("test_key")
        self.assertIsNone(result)

    def test_cache_miss(self):
        """Test cache miss"""
        result = self.cache.get("nonexistent_key")
        self.assertIsNone(result)

    def test_cache_clear(self):
        """Test cache clear"""
        self.cache.set("key1", "value1", ttl_seconds=60)
        self.cache.set("key2", "value2", ttl_seconds=60)
        self.cache.clear()
        self.assertEqual(len(self.cache.cache), 0)


class TestQuoteData(unittest.TestCase):
    """Test QuoteData dataclass"""

    def test_quote_data_creation(self):
        """Test creating QuoteData"""
        quote = QuoteData(
            code="HK.00700",
            price=185.6,
            high=186.2,
            low=183.4,
            volume=12345678,
            turnover=2300000000,
            change_val=5.6,
            change_rate=3.1,
            timestamp="2026-03-18 14:30:00",
        )

        self.assertEqual(quote.code, "HK.00700")
        self.assertEqual(quote.price, 185.6)
        self.assertEqual(quote.change_rate, 3.1)


class TestKlineData(unittest.TestCase):
    """Test KlineData dataclass"""

    def test_kline_data_creation(self):
        """Test creating KlineData"""
        kline = KlineData(
            code="HK.00700",
            time_key="2026-03-18",
            open=180.0,
            close=185.6,
            high=186.2,
            low=183.4,
            volume=12345678,
            turnover=2300000000,
        )

        self.assertEqual(kline.code, "HK.00700")
        self.assertEqual(kline.close, 185.6)
        self.assertEqual(kline.volume, 12345678)


class TestOrderBookData(unittest.TestCase):
    """Test OrderBookData dataclass"""

    def test_orderbook_data_creation(self):
        """Test creating OrderBookData"""
        bid = [{"price": 185.4, "volume": 100000}]
        ask = [{"price": 185.6, "volume": 80000}]

        orderbook = OrderBookData(code="HK.00700", bid=bid, ask=ask)

        self.assertEqual(orderbook.code, "HK.00700")
        self.assertEqual(len(orderbook.bid), 1)
        self.assertEqual(len(orderbook.ask), 1)
        self.assertEqual(orderbook.bid[0]["price"], 185.4)


class TestMooMooQuoteWrapper(unittest.TestCase):
    """Test MooMooQuoteWrapper class"""

    @patch("moomoo_wrapper.OpenQuoteContext")
    def test_wrapper_initialization(self, mock_context):
        """Test wrapper initialization"""
        from moomoo_wrapper import MooMooQuoteWrapper

        wrapper = MooMooQuoteWrapper(host="127.0.0.1", port=11111)
        self.assertIsNotNone(wrapper.ctx)
        self.assertEqual(wrapper.host, "127.0.0.1")
        self.assertEqual(wrapper.port, 11111)

    @patch("moomoo_wrapper.OpenQuoteContext")
    def test_cache_functionality(self, mock_context):
        """Test cache functionality"""
        from moomoo_wrapper import MooMooQuoteWrapper, RET_OK

        # Mock the context
        mock_ctx = MagicMock()
        mock_context.return_value = mock_ctx

        # Mock get_cur_kline response
        mock_data = MagicMock()
        mock_data.__getitem__ = MagicMock(
            side_effect=lambda x: {
                "close": MagicMock(iloc=[185.6]),
                "high": MagicMock(iloc=[186.2]),
                "low": MagicMock(iloc=[183.4]),
                "volume": MagicMock(iloc=[12345678]),
                "turnover": MagicMock(iloc=[2300000000]),
                "change_val": MagicMock(iloc=[5.6]),
                "change_rate": MagicMock(iloc=[3.1]),
                "time_key": MagicMock(iloc=["2026-03-18 14:30:00"]),
            }[x]
        )

        mock_ctx.get_cur_kline.return_value = (RET_OK, mock_data)

        wrapper = MooMooQuoteWrapper()

        # First call should hit the API
        quote1 = wrapper.get_current_price("HK.00700")
        self.assertIsNotNone(quote1)

        # Second call should hit the cache
        quote2 = wrapper.get_current_price("HK.00700")
        self.assertEqual(quote1, quote2)

        # Verify API was called only once
        self.assertEqual(mock_ctx.get_cur_kline.call_count, 1)


class TestFastAPIEndpoints(unittest.TestCase):
    """Test FastAPI endpoints"""

    def setUp(self):
        """Set up test client"""
        from fastapi.testclient import TestClient
        from moomoo_api import app

        self.client = TestClient(app)

    def test_health_check(self):
        """Test health check endpoint"""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertIn("status", response.json())
        self.assertEqual(response.json()["status"], "ok")

    @patch("moomoo_api.get_quote_wrapper")
    def test_get_current_quote(self, mock_get_wrapper):
        """Test get current quote endpoint"""
        from moomoo_api import QuoteResponse

        # Mock the wrapper
        mock_wrapper = MagicMock()
        mock_quote = QuoteData(
            code="HK.00700",
            price=185.6,
            high=186.2,
            low=183.4,
            volume=12345678,
            turnover=2300000000,
            change_val=5.6,
            change_rate=3.1,
            timestamp="2026-03-18 14:30:00",
        )
        mock_wrapper.get_current_price.return_value = mock_quote
        mock_get_wrapper.return_value = mock_wrapper

        response = self.client.get("/api/quote/current?code=HK.00700")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["code"], "HK.00700")
        self.assertEqual(data["price"], 185.6)

    def test_portfolio_add(self):
        """Test portfolio add endpoint"""
        response = self.client.post(
            "/api/portfolio/add",
            json={"code": "HK.00700", "quantity": 100, "cost_price": 180.0},
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["code"], "HK.00700")
        self.assertEqual(data["quantity"], 100)
        self.assertEqual(data["cost_price"], 180.0)

    def test_portfolio_list(self):
        """Test portfolio list endpoint"""
        # Add a holding first
        self.client.post(
            "/api/portfolio/add",
            json={"code": "HK.00700", "quantity": 100, "cost_price": 180.0},
        )

        response = self.client.get("/api/portfolio/list")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)

    def test_portfolio_delete(self):
        """Test portfolio delete endpoint"""
        # Add a holding first
        self.client.post(
            "/api/portfolio/add",
            json={"code": "HK.00700", "quantity": 100, "cost_price": 180.0},
        )

        # Delete it
        response = self.client.delete("/api/portfolio/HK.00700")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()["success"])

        # Verify it's deleted
        response = self.client.get("/api/portfolio/list")
        data = response.json()
        self.assertEqual(len(data), 0)

    def test_trade_place_order(self):
        """Test place order endpoint"""
        response = self.client.post(
            "/api/trade/place-order",
            json={
                "code": "HK.00700",
                "quantity": 100,
                "price": 185.6,
                "side": "BUY",
            },
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["code"], "HK.00700")
        self.assertEqual(data["side"], "BUY")
        self.assertEqual(data["status"], "FILLED")

    def test_trade_order_list(self):
        """Test order list endpoint"""
        # Place an order first
        self.client.post(
            "/api/trade/place-order",
            json={
                "code": "HK.00700",
                "quantity": 100,
                "price": 185.6,
                "side": "BUY",
            },
        )

        response = self.client.get("/api/trade/order-list")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)


if __name__ == "__main__":
    unittest.main()
