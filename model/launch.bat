@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title FindPneumo AI - Backend Inference Server [Port 8000]
color 0b

:: Ensure current working directory is the model directory
cd /d "%~dp0"

cls
echo ========================================================================================
echo                 FINDPNEUMO AI - BACKEND INFERENCE SERVER (FASTAPI)                     
echo ========================================================================================
echo  Checking Python environment and dependencies...
echo ========================================================================================

:: 1. Verify Python is installed and accessible
where python >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python was not found in your PATH!
    echo Please install Python 3.10+ from https://www.python.org/ and check "Add to PATH".
    echo.
    pause
    exit /b 1
)

:: 2. Automatic package installation check
echo Checking installed Python libraries...
python -c "import torch, torchvision, fastapi, uvicorn, PIL, sklearn, numpy" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [*] Required Python packages missing or incomplete.
    echo [*] Automatically installing required packages from requirements.txt...
    echo.
    python -m pip install -r requirements.txt
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] Failed to install Python dependencies. Please check your internet connection.
        pause
        exit /b %ERRORLEVEL%
    )
    echo.
    echo [*] All Python dependencies installed successfully!
) else (
    echo [*] All required Python packages are already installed and up to date.
)

:: 3. Launch the FastAPI Deep Learning Server
echo.
echo ========================================================================================
echo  Starting FindPneumo DenseNet-121 Neural Inference Server on Port 8000...
echo ========================================================================================
echo  Endpoint URL:      http://localhost:8000
echo  Health Metrics:    http://localhost:8000/health
echo  Swagger API Docs:  http://localhost:8000/docs
echo ========================================================================================
echo.

python server.py --host 0.0.0.0 --port 8000

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backend server stopped unexpectedly with code %ERRORLEVEL%.
    pause
)
