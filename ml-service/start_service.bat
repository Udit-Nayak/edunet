@echo off
REM Start EduNet ML Service

echo ================================================================
echo          Starting EduNet ML Service
echo ================================================================
echo.

REM Activate virtual environment
if not exist "venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found!
    echo Please run setup.bat first.
    echo.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

echo Starting service on http://localhost:8000
echo Press Ctrl+C to stop the service
echo.
echo ================================================================
echo.

python -m uvicorn app.main:app --reload

pause
