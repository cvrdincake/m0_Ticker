@echo off
echo Starting M0 Ticker Server...

REM Kill any existing processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Start the server in the background
start /min node server.js

REM Wait briefly to ensure server starts
timeout /t 3 /nobreak >nul

REM Open dashboard and output in default browser
start http://localhost:3000/dashboard.html
start http://localhost:3000/output.html

echo Server running. Dashboard and Output opened in browser.
echo Press any key to close this window...
pause >nul