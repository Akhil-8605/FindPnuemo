@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title FindPneumo AI - Frontend Web Application [Port 3000]
color 0a

:: Ensure current working directory is the frontend directory
cd /d "%~dp0"

cls
echo ========================================================================================
echo                 FINDPNEUMO AI - FRONTEND WEB APPLICATION (REACT / VITE)                 
echo ========================================================================================
echo  Checking Node.js environment and dependencies...
echo ========================================================================================

:: 1. Verify Node.js and npm are installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js was not found in your PATH!
    echo Please install Node.js 18+ from https://nodejs.org/ and restart this launcher.
    echo.
    pause
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm was not found in your PATH!
    echo.
    pause
    exit /b 1
)

:: 2. Automatic package installation check
echo Checking frontend node_modules...
if not exist "node_modules\" (
    echo.
    echo [*] node_modules not found. Automatically installing npm packages...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo [ERROR] npm install encountered an error.
        pause
        exit /b %ERRORLEVEL%
    )
    echo.
    echo [*] All npm dependencies installed successfully!
) else (
    echo [*] node_modules directory verified.
)

:: 3. Launch the Vite Frontend Development Server
echo.
echo ========================================================================================
echo  Starting Vite Development Server on Port 3000...
echo ========================================================================================
echo  Screening Tool:    http://localhost:3000
echo  Model Health:      http://localhost:3000/lowiqbots/health
echo  API Documentation: http://localhost:3000/lowiqbots/api-docs
echo ========================================================================================
echo.

call npm run dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Frontend dev server stopped unexpectedly with code %ERRORLEVEL%.
    pause
)
