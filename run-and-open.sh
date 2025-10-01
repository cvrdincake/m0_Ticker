#!/usr/bin/env bash
# run-and-open.sh: Start server.js and open dashboard/output in browser

# Start the server in the background
echo "Starting server.js..."
node server.js &
SERVER_PID=$!

# Wait briefly to ensure server starts
sleep 2

# Open dashboard and output in default browser
BROWSER_CMD="${BROWSER:-xdg-open}"
$BROWSER_CMD "http://localhost:3000/dashboard.html"
$BROWSER_CMD "http://localhost:3000/output.html"

echo "Server running (PID: $SERVER_PID). Dashboard and Output opened in browser."
