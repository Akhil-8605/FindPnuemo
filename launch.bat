@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title FindPneumo AI - Full Stack Master Launcher (LowIQBots)
color 0e

:: Ensure current working directory is the root workspace directory
cd /d "%~dp0"

cls
echo ========================================================================================
echo                 FINDPNEUMO AI - MASTER FULL-STACK SYSTEM LAUNCHER                       
echo                          Developed by Team LowIQBots                                    
echo ========================================================================================
echo.
echo  This launcher will automatically verify dependencies and run:
echo    [1] Backend AI Inference API (FastAPI + DenseNet-121)   -> Port 8000
echo    [2] Frontend Web Application (React + Vite)             -> Port 3000
echo.
echo ========================================================================================
echo.

:: 1. Launch Backend Server in its own window
echo [*] Launching Backend Inference Server (model\launch.bat)...
start "FindPneumo AI - Backend Server [Port 8000]" cmd /k "cd /d "%~dp0model" && call launch.bat"

:: 2. Launch Frontend Application in its own window
echo [*] Launching Frontend Web Application (frontend\launch.bat)...
start "FindPneumo AI - Frontend UI [Port 3000]" cmd /k "cd /d "%~dp0frontend" && call launch.bat"

echo.
echo ========================================================================================
echo  All services have been initiated in their respective console windows!
echo ========================================================================================
echo.
echo  Access Points:
echo    • Web Application:     http://localhost:3000
echo    • Model Health QA:     http://localhost:3000/lowiqbots/health
echo    • API Documentation:   http://localhost:3000/lowiqbots/api-docs
echo    • Backend API Server:  http://localhost:8000
echo    • Interactive Swagger: http://localhost:8000/docs
echo.
echo ========================================================================================
echo  Opening FindPneumo Web Application in your default browser in 3 seconds...
echo ========================================================================================

timeout /t 3 /nobreak >nul
start http://localhost:3000

echo.
echo  Launcher running in background. You may keep this window open or close it safely.
echo.
pause
