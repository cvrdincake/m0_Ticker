@echo off
echo Stopping any existing servers on port 3000...

REM Kill any process using port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo Starting M0 Ticker Server...

REM Start the server
node server.js

pause