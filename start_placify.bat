@echo off
setlocal

set "ROOT_DIR=%~dp0"
set "SERVER_DIR=%ROOT_DIR%server"
set "CLIENT_DIR=%ROOT_DIR%client"
set "BACKEND_PYTHON=python"

if not exist "%SERVER_DIR%\main.py" (
  echo [ERROR] Backend entry file not found at "%SERVER_DIR%\main.py"
  exit /b 1
)

if not exist "%CLIENT_DIR%\package.json" (
  echo [ERROR] Frontend package.json not found at "%CLIENT_DIR%\package.json"
  exit /b 1
)

if exist "%SERVER_DIR%\.venv\Scripts\python.exe" (
  set "BACKEND_PYTHON=%SERVER_DIR%\.venv\Scripts\python.exe"
)

if not exist "%ROOT_DIR%\.env" (
  if exist "%ROOT_DIR%\.env.example" (
    echo [INFO] .env not found. Creating from .env.example
    copy "%ROOT_DIR%\.env.example" "%ROOT_DIR%\.env" >nul
  )
)

echo [INFO] Starting backend...
start "Placify Backend" /D "%SERVER_DIR%" cmd /k ""%BACKEND_PYTHON%" main.py"

echo [INFO] Starting frontend...
start "Placify Frontend" /D "%CLIENT_DIR%" cmd /k "npm run dev"

echo [INFO] Waiting for services to boot...
timeout /t 6 /nobreak >nul

echo [INFO] Opening app in browser...
start "" "http://localhost:5173/"

echo [DONE] Placify startup commands launched.
endlocal
