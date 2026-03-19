#!/usr/bin/env python3
"""
MooMoo OpenD Integration Test Suite
Tests the integration between OpenD, FastAPI backend, and React frontend
"""

import requests
import json
import time
import sys
from typing import Dict, Any, List
from datetime import datetime

# Configuration
OPEND_URL = "http://127.0.0.1:11111"
API_URL = "http://localhost:8000"
HEALTH_CHECK_TIMEOUT = 5
STOCK_CODES = [
    "HK.00700",  # Tencent
    "HK.00001",  # HSBC
    "US.AAPL",   # Apple
    "US.MSFT",   # Microsoft
]

class Colors:
    """ANSI color codes for terminal output"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

def print_header(text: str):
    """Print a formatted header"""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*60}{Colors.RESET}\n")

def print_test(name: str):
    """Print a test name"""
    print(f"{Colors.BOLD}Test: {name}{Colors.RESET}")

def print_success(message: str):
    """Print a success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.RESET}")

def print_error(message: str):
    """Print an error message"""
    print(f"{Colors.RED}✗ {message}{Colors.RESET}")

def print_warning(message: str):
    """Print a warning message"""
    print(f"{Colors.YELLOW}⚠ {message}{Colors.RESET}")

def print_info(message: str):
    """Print an info message"""
    print(f"{Colors.BLUE}ℹ {message}{Colors.RESET}")

def test_opend_health() -> bool:
    """Test OpenD health check"""
    print_test("OpenD Health Check")
    try:
        response = requests.get(f"{OPEND_URL}/health", timeout=HEALTH_CHECK_TIMEOUT)
        if response.status_code == 200:
            print_success(f"OpenD is running on {OPEND_URL}")
            print_info(f"Response: {response.json()}")
            return True
        else:
            print_error(f"OpenD returned status code {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to OpenD at {OPEND_URL}")
        print_warning("Make sure OpenD is running on port 11111")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_api_health() -> bool:
    """Test FastAPI health check"""
    print_test("FastAPI Health Check")
    try:
        response = requests.get(f"{API_URL}/health", timeout=HEALTH_CHECK_TIMEOUT)
        if response.status_code == 200:
            print_success(f"FastAPI is running on {API_URL}")
            data = response.json()
            print_info(f"Status: {data.get('status')}")
            print_info(f"Timestamp: {data.get('timestamp')}")
            return True
        else:
            print_error(f"FastAPI returned status code {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print_error(f"Cannot connect to FastAPI at {API_URL}")
        print_warning("Make sure FastAPI server is running on port 8000")
        return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_quote_current(code: str) -> bool:
    """Test current quote endpoint"""
    print_test(f"Get Current Quote for {code}")
    try:
        response = requests.get(
            f"{API_URL}/api/quote/current",
            params={"code": code},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"Quote retrieved for {code}")
            print_info(f"Price: {data.get('price')}")
            print_info(f"Change: {data.get('change')} ({data.get('change_rate')}%)")
            print_info(f"Timestamp: {data.get('timestamp')}")
            return True
        else:
            print_error(f"API returned status code {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_quote_kline(code: str) -> bool:
    """Test K-line data endpoint"""
    print_test(f"Get K-line Data for {code}")
    try:
        response = requests.get(
            f"{API_URL}/api/quote/kline",
            params={
                "code": code,
                "period": "day",
                "count": 5
            },
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"K-line data retrieved for {code}")
            print_info(f"Number of candles: {len(data.get('klines', []))}")
            if data.get('klines'):
                latest = data['klines'][0]
                print_info(f"Latest candle - Open: {latest.get('open')}, Close: {latest.get('close')}")
            return True
        else:
            print_error(f"API returned status code {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_quote_orderbook(code: str) -> bool:
    """Test order book endpoint"""
    print_test(f"Get Order Book for {code}")
    try:
        response = requests.get(
            f"{API_URL}/api/quote/orderbook",
            params={"code": code},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print_success(f"Order book retrieved for {code}")
            print_info(f"Bid levels: {len(data.get('bid_orders', []))}")
            print_info(f"Ask levels: {len(data.get('ask_orders', []))}")
            if data.get('bid_orders'):
                print_info(f"Best bid: {data['bid_orders'][0].get('price')} @ {data['bid_orders'][0].get('volume')}")
            if data.get('ask_orders'):
                print_info(f"Best ask: {data['ask_orders'][0].get('price')} @ {data['ask_orders'][0].get('volume')}")
            return True
        else:
            print_error(f"API returned status code {response.status_code}")
            print_info(f"Response: {response.text}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_portfolio_operations() -> bool:
    """Test portfolio management endpoints"""
    print_test("Portfolio Operations")
    
    # Add to portfolio
    print_info("Adding stock to portfolio...")
    try:
        response = requests.post(
            f"{API_URL}/api/portfolio/add",
            json={"code": "HK.00700", "quantity": 100},
            timeout=10
        )
        if response.status_code == 200:
            print_success("Stock added to portfolio")
        else:
            print_warning(f"Failed to add stock: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False
    
    # Get portfolio
    print_info("Retrieving portfolio...")
    try:
        response = requests.get(
            f"{API_URL}/api/portfolio/list",
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print_success("Portfolio retrieved")
            print_info(f"Holdings: {len(data.get('holdings', []))}")
            for holding in data.get('holdings', []):
                print_info(f"  - {holding.get('code')}: {holding.get('quantity')} shares")
            return True
        else:
            print_warning(f"Failed to retrieve portfolio: {response.status_code}")
            return False
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def test_performance() -> bool:
    """Test API performance"""
    print_test("API Performance Test")
    
    try:
        # Test 10 requests
        times = []
        for i in range(10):
            start = time.time()
            response = requests.get(
                f"{API_URL}/api/quote/current",
                params={"code": "HK.00700"},
                timeout=10
            )
            elapsed = (time.time() - start) * 1000  # Convert to ms
            times.append(elapsed)
            
            if response.status_code != 200:
                print_error(f"Request {i+1} failed")
                return False
        
        avg_time = sum(times) / len(times)
        min_time = min(times)
        max_time = max(times)
        
        print_success(f"10 requests completed")
        print_info(f"Average response time: {avg_time:.2f}ms")
        print_info(f"Min response time: {min_time:.2f}ms")
        print_info(f"Max response time: {max_time:.2f}ms")
        
        if avg_time < 100:
            print_success("Performance is excellent")
            return True
        elif avg_time < 500:
            print_warning("Performance is acceptable")
            return True
        else:
            print_warning("Performance is slow")
            return True
            
    except Exception as e:
        print_error(f"Error: {str(e)}")
        return False

def run_all_tests() -> Dict[str, bool]:
    """Run all tests and return results"""
    print_header("MooMoo OpenD Integration Test Suite")
    
    results = {}
    
    # Phase 1: Health checks
    print_header("Phase 1: Health Checks")
    results["OpenD Health"] = test_opend_health()
    results["FastAPI Health"] = test_api_health()
    
    if not results["OpenD Health"] or not results["FastAPI Health"]:
        print_header("Critical Services Not Running")
        print_error("Please start OpenD and FastAPI before running tests")
        return results
    
    # Phase 2: Quote API tests
    print_header("Phase 2: Quote API Tests")
    for code in STOCK_CODES[:2]:  # Test first 2 stocks
        results[f"Quote Current - {code}"] = test_quote_current(code)
        time.sleep(1)  # Rate limiting
    
    for code in STOCK_CODES[:1]:  # Test first stock
        results[f"Quote K-line - {code}"] = test_quote_kline(code)
        time.sleep(1)
        results[f"Quote OrderBook - {code}"] = test_quote_orderbook(code)
        time.sleep(1)
    
    # Phase 3: Portfolio tests
    print_header("Phase 3: Portfolio Tests")
    results["Portfolio Operations"] = test_portfolio_operations()
    
    # Phase 4: Performance tests
    print_header("Phase 4: Performance Tests")
    results["Performance"] = test_performance()
    
    return results

def print_summary(results: Dict[str, bool]):
    """Print test summary"""
    print_header("Test Summary")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}PASS{Colors.RESET}" if result else f"{Colors.RED}FAIL{Colors.RESET}"
        print(f"{status} - {test_name}")
    
    print()
    print_info(f"Results: {passed}/{total} tests passed")
    
    if passed == total:
        print_success("All tests passed!")
        return True
    else:
        print_warning(f"{total - passed} test(s) failed")
        return False

def main():
    """Main entry point"""
    print(f"\n{Colors.BOLD}MooMoo OpenD Integration Test{Colors.RESET}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    results = run_all_tests()
    success = print_summary(results)
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()
