@echo off
REM MooMoo API Integration Project - Windows Setup Script
REM This script automates the setup process for Windows

setlocal enabledelayedexpansion

echo.
echo ==========================================
echo MooMoo API Integration - Windows Setup
echo ==========================================
echo.

REM Check Python
echo [1/7] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://www.python.org/
    pause
    exit /b 1
)
python --version
echo OK
echo.

REM Check Node.js
echo [2/7] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 22+ from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo OK
echo.

REM Check Git
echo [3/7] Checking Git installation...
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed or not in PATH
    echo Please install Git from https://git-scm.com/
    pause
    exit /b 1
)
git --version
echo OK
echo.

REM Create virtual environment
echo [4/7] Creating Python virtual environment...
if exist venv (
    echo Virtual environment already exists
) else (
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create virtual environment
        pause
        exit /b 1
    )
)
echo OK
echo.

REM Activate virtual environment
echo [5/7] Activating virtual environment...
call venv\Scripts\activate.bat
if errorlevel 1 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)
echo OK
echo.

REM Install Python dependencies
echo [6/7] Installing Python dependencies...
python -m pip install --upgrade pip >nul 2>&1
pip install fastapi uvicorn pydantic python-dotenv pandas simplejson pycryptodome pytest pytest-cov pytest-mock >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)
echo OK
echo.

REM Install Node.js dependencies
echo [7/7] Installing Node.js dependencies...
npm install -g pnpm >nul 2>&1
pnpm install >nul 2>&1
if errorlevel 1 (
    echo ERROR: Failed to install Node.js dependencies
    echo Trying with npm instead...
    npm install >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)
echo OK
echo.

REM Create .env file
echo Creating .env file...
if not exist .env (
    (
        echo MOOMOO_HOST=127.0.0.1
        echo MOOMOO_PORT=11111
        echo API_HOST=0.0.0.0
        echo API_PORT=8000
        echo REACT_APP_API_URL=http://localhost:8000
        echo NODE_ENV=development
    ) > .env
    echo .env file created
) else (
    echo .env file already exists
)
echo.

REM Setup complete
echo ==========================================
echo Setup Complete!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. Extract MooMoo SDK:
echo    - Extract MMAPI4Python_10.0.6008.7z
echo    - Copy moomoo folder to server\lib\
echo.
echo 2. Start FastAPI server (Terminal 1):
echo    venv\Scripts\activate
echo    python server\moomoo_api.py
echo.
echo 3. Start React dev server (Terminal 2):
echo    pnpm dev
echo    or: npm run dev
echo.
echo 4. Open browser:
echo    http://localhost:5173/market
echo.
echo 5. Run tests:
echo    python -m pytest server\test_moomoo_wrapper.py -v
echo.
pause
