#!/bin/bash

# M0 Ticker - Broadcast Ready Demo Setup
echo "🎬 Setting up M0 Ticker Broadcast Ready Demo..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting M0 Ticker Server...${NC}"

# Start the server in background
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

echo -e "${GREEN}✅ Server started successfully!${NC}"
echo -e "${BLUE}📊 Opening Professional Dashboard...${NC}"

# Open dashboard in default browser
if command -v "$BROWSER" &> /dev/null; then
    "$BROWSER" "http://localhost:3000/dashboard-broadcast.html" &
elif command -v google-chrome &> /dev/null; then
    google-chrome "http://localhost:3000/dashboard-broadcast.html" &
elif command -v firefox &> /dev/null; then
    firefox "http://localhost:3000/dashboard-broadcast.html" &
elif command -v safari &> /dev/null; then
    safari "http://localhost:3000/dashboard-broadcast.html" &
else
    echo -e "${YELLOW}⚠️  Please open http://localhost:3000/dashboard-broadcast.html in your browser${NC}"
fi

sleep 2

echo -e "${BLUE}🎬 Opening Broadcast Output Overlay...${NC}"

# Open output overlay in default browser
if command -v "$BROWSER" &> /dev/null; then
    "$BROWSER" "http://localhost:3000/output-broadcast.html" &
elif command -v google-chrome &> /dev/null; then
    google-chrome "http://localhost:3000/output-broadcast.html" &
elif command -v firefox &> /dev/null; then
    firefox "http://localhost:3000/output-broadcast.html" &
elif command -v safari &> /dev/null; then
    safari "http://localhost:3000/output-broadcast.html" &
else
    echo -e "${YELLOW}⚠️  Please open http://localhost:3000/output-broadcast.html in your browser${NC}"
fi

echo ""
echo -e "${GREEN}🎯 M0 Ticker Broadcast Ready Demo is now running!${NC}"
echo ""
echo -e "${BLUE}📱 Dashboard Control:${NC} http://localhost:3000/dashboard-broadcast.html"
echo -e "${BLUE}🎬 Broadcast Overlay:${NC} http://localhost:3000/output-broadcast.html"
echo -e "${BLUE}📊 API Status:${NC} http://localhost:3000/api/status"
echo ""
echo -e "${YELLOW}✨ Features to test:${NC}"
echo "   • Professional glass morphism design"
echo "   • Smooth ticker animations"
echo "   • Professional popup overlays"
echo "   • BRB component with loading animation"
echo "   • Real-time WebSocket synchronization"
echo "   • Responsive design across devices"
echo "   • Broadcast-safe color palette"
echo ""
echo -e "${BLUE}🎮 Demo Instructions:${NC}"
echo "   1. Add ticker messages in the dashboard"
echo "   2. Adjust speed and colors with the sliders"
echo "   3. Test popup overlays with custom messages"
echo "   4. Try the BRB component for stream breaks"
echo "   5. Watch real-time updates in the output overlay"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop the demo${NC}"

# Keep script running until interrupted
trap "echo -e '${BLUE}🛑 Stopping M0 Ticker Demo...${NC}'; kill $SERVER_PID; exit 0" INT

# Wait for user interruption
while true; do
    sleep 1
done