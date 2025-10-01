@echo off
echo Starting M0 Ticker Server...

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