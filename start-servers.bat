@echo off
setlocal

REM Set title for the main window
title Enterprise Hub - Control Panel

echo ====================================================
echo    Enterprise Hub - Multi-Tenant ERP/CRM Platform
echo ====================================================
echo.
echo ⚡ PERFORMANCE OPTIMIZED VERSION
echo  - 8 Workers for backend
echo  - Enhanced MongoDB connection pooling
echo  - Extended cache TTL (10 minutes)
echo  - Aggressive GZip compression
echo  - Hot reload disabled for frontend
echo  - Database indexes for all collections
echo  - Background cache cleanup
echo.
echo Checking prerequisites...

REM Check if MongoDB is installed and running
echo [0/3] Checking MongoDB status...
netstat -an | findstr :27017 >nul
if %errorlevel% == 0 (
    echo MongoDB is running on port 27017
) else (
    echo Starting MongoDB...
    net start MongoDB >nul 2>&1
    if %errorlevel% == 0 (
        echo MongoDB started successfully
    ) else (
        echo Failed to start MongoDB. Please ensure MongoDB is installed and configured as a service.
        echo You can manually start MongoDB and then run this script again.
        pause
        exit /b 1
    )
)
echo.

REM Navigate to project root directory
cd /d "%~dp0"

REM Start backend server in a new window
echo [1/3] Starting backend server...
start "Backend Server - FastAPI" /D "%cd%\backend" cmd /k "uvicorn server:app --host 0.0.0.0 --port 8000 --workers 8 --timeout-keep-alive 5 --limit-concurrency 100 --limit-max-requests 1000"

REM Wait a moment for backend to start
timeout /t 10 /nobreak >nul

echo [2/3] Starting frontend server...
REM Start frontend server in a new window
start "Frontend Server - React" /D "%cd%\frontend" cmd /k "npm start"

echo.
echo ====================================================
echo    Servers started successfully!
echo ====================================================
echo.
echo Backend API:    http://localhost:8000
echo Frontend App:   http://localhost:3000
echo MongoDB:        localhost:27017
echo.
echo Swagger Docs:   http://localhost:8000/docs
echo ReDoc Docs:     http://localhost:8000/redoc
echo.
echo To stop the servers, close the individual command windows
echo or press Ctrl+C in each window.
echo.
echo Note: The frontend may take a minute to compile and start.
echo.
echo Login Credentials:
echo SuperAdmin: superadmin@erp.com / password123
echo Company Admins: admin@{company}.com / password123
echo.
pause