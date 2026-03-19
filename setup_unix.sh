#!/bin/bash
# MooMoo API Integration Project - macOS/Linux Setup Script
# This script automates the setup process for macOS and Linux

set -e

echo ""
echo "=========================================="
echo "MooMoo API Integration - macOS/Linux Setup"
echo "=========================================="
echo ""

# Check Python
echo "[1/7] Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.11+ from https://www.python.org/"
    exit 1
fi
python3 --version
echo "OK"
echo ""

# Check Node.js
echo "[2/7] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed"
    echo "Please install Node.js 22+ from https://nodejs.org/"
    exit 1
fi
node --version
echo "OK"
echo ""

# Check Git
echo "[3/7] Checking Git installation..."
if ! command -v git &> /dev/null; then
    echo "ERROR: Git is not installed"
    echo "Please install Git from https://git-scm.com/"
    exit 1
fi
git --version
echo "OK"
echo ""

# Create virtual environment
echo "[4/7] Creating Python virtual environment..."
if [ -d "venv" ]; then
    echo "Virtual environment already exists"
else
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to create virtual environment"
        exit 1
    fi
fi
echo "OK"
echo ""

# Activate virtual environment
echo "[5/7] Activating virtual environment..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to activate virtual environment"
    exit 1
fi
echo "OK"
echo ""

# Install Python dependencies
echo "[6/7] Installing Python dependencies..."
python -m pip install --upgrade pip > /dev/null 2>&1
pip install fastapi uvicorn pydantic python-dotenv pandas simplejson pycryptodome pytest pytest-cov pytest-mock > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Python dependencies"
    exit 1
fi
echo "OK"
echo ""

# Install Node.js dependencies
echo "[7/7] Installing Node.js dependencies..."
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm > /dev/null 2>&1
fi

pnpm install > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Trying with npm instead..."
    npm install > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo "ERROR: Failed to install Node.js dependencies"
        exit 1
    fi
fi
echo "OK"
echo ""

# Create .env file
echo "Creating .env file..."
if [ ! -f ".env" ]; then
    cat > .env << EOF
MOOMOO_HOST=127.0.0.1
MOOMOO_PORT=11111
API_HOST=0.0.0.0
API_PORT=8000
REACT_APP_API_URL=http://localhost:8000
NODE_ENV=development
EOF
    echo ".env file created"
else
    echo ".env file already exists"
fi
echo ""

# Setup complete
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Extract MooMoo SDK:"
echo "   - Extract MMAPI4Python_10.0.6008.7z"
echo "   - Copy moomoo folder to server/lib/"
echo ""
echo "2. Start FastAPI server (Terminal 1):"
echo "   source venv/bin/activate"
echo "   python server/moomoo_api.py"
echo ""
echo "3. Start React dev server (Terminal 2):"
echo "   pnpm dev"
echo "   or: npm run dev"
echo ""
echo "4. Open browser:"
echo "   http://localhost:5173/market"
echo ""
echo "5. Run tests:"
echo "   python -m pytest server/test_moomoo_wrapper.py -v"
echo ""
