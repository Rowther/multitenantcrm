@echo off
setlocal

REM Set title for the window
title Enterprise Hub - Stop Servers

echo ====================================================
echo    Enterprise Hub - Stopping Servers
echo ====================================================
echo.

echo Stopping backend and frontend processes...
taskkill /f /im python.exe /fi "WINDOWTITLE eq Backend Server - FastAPI*"
taskkill /f /im node.exe /fi "WINDOWTITLE eq Frontend Server - React*"

echo.
echo Stopping MongoDB service...
net stop MongoDB >nul 2>&1
if %errorlevel% == 0 (
    echo MongoDB stopped successfully
) else (
    echo MongoDB was not running or could not be stopped
)

echo.
echo All servers stopped.
echo.
pause