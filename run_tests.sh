#!/bin/bash
# Test runner script for MooMoo API integration

set -e

echo "=========================================="
echo "MooMoo API Integration Test Suite"
echo "=========================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if pytest is available
if ! python3 -m pytest --version &> /dev/null; then
    echo "Installing pytest..."
    pip install pytest -q
fi

# Run unit tests
echo "Running unit tests..."
echo ""

python3 -m pytest server/test_moomoo_wrapper.py -v --tb=short

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "✓ CacheManager tests"
echo "✓ QuoteData tests"
echo "✓ KlineData tests"
echo "✓ OrderBookData tests"
echo "✓ MooMooQuoteWrapper tests"
echo "✓ FastAPI endpoint tests"
echo ""
echo "All tests completed!"
