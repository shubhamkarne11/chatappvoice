@echo off
title Voice AI Masking Server

REM Change to project root (this .bat is inside react-native-chat)
cd /d "%~dp0..\voice-ai-server"

echo ==================================================
echo  Starting Voice AI Masking Server (app.py)
echo  Project folder: %CD%
echo ==================================================

REM Activate existing virtual environment if present
if exist "venv\Scripts\activate.bat" (
  call "venv\Scripts\activate.bat"
) else (
  echo [WARN] venv not found. Using global Python.
)

python app.py

echo.
echo Server stopped. Press any key to close this window.
pause >nul

