@echo off
REM Quick Start Script for EduNet ML Service (Windows)

echo ================================================================
echo             EduNet ML Service - Quick Start
echo ================================================================
echo.

REM Check if virtual environment exists
if not exist "venv\" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
    echo      Virtual environment created!
    echo.
) else (
    echo [1/4] Virtual environment already exists
    echo.
)

REM Activate virtual environment
echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat
echo.

REM Install dependencies
echo [3/4] Installing dependencies...
pip install -r requirements.txt
echo.

REM Pre-download model
echo [4/4] Pre-downloading Universal Sentence Encoder...
echo      This is a ONE-TIME download (~1GB, takes 2-5 minutes)
echo.
python preload_model.py
if errorlevel 1 (
    echo.
    echo ================================================================
    echo ERROR: Model download failed!
    echo ================================================================
    echo Please check your internet connection and try again.
    echo.
    pause
    exit /b 1
)

echo.
echo ================================================================
echo             Setup Complete!
echo ================================================================
echo.
echo To start the ML service, run:
echo    start_service.bat
echo.
echo Or manually:
echo    venv\Scripts\activate
echo    python -m uvicorn app.main:app --reload
echo.
pause
