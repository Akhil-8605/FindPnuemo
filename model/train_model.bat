@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title FindPneumo AI - DenseNet-121 Model Training
color 0b

:: Ensure current working directory is the repository root
cd /d "%~dp0"

cls
echo ========================================================================================
echo                 FINDPNEUMO AI - DENSENET-121 MODEL TRAINING                             
echo ========================================================================================
echo  Initializing Deep Learning Training Pipeline...
echo ========================================================================================
echo(

:: Execute unbuffered Python to display real-time progress and results without prompting for input
if "%~1"=="" (
    python -u src/train.py --dataset combined --epochs 15 --batch_size 16
) else (
    python -u src/train.py %*
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Training encountered an error (Exit code: %ERRORLEVEL%).
    echo Please review the error message above.
    echo.
    pause
    exit /b %ERRORLEVEL%
)

echo(
echo ========================================================================================
echo                 TRAINING SESSION FINISHED SUCCESSFULLY!                                
echo ========================================================================================
echo  All metrics and curves have been saved to:
echo    [*] weights/densenet121_pneumonia_best.pth  (Trained Model Weights)
echo    [*] weights/training_summary.json           (Full Metrics and Loss Curves)
echo ========================================================================================
echo(
echo Press any key to exit this training console...
pause >nul
