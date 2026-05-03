@echo off
setlocal

set "PORT=5000"

echo Clearing port %PORT% before start...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do (
    echo Killing process %%a using port %PORT%
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting HTTP service on port %PORT% for dev...
set "PORT=%PORT%" & pnpm tsx watch src/server.ts
