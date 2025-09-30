# M0_Ticker - Professional Widget Management System

## 🎯 Overview
M0_Ticker is a professional, modular widget management system for live streaming and broadcast overlays. Built with modern web technologies, it provides a comprehensive dashboard for managing multiple widgets with real-time state synchronization and professional design aesthetics.

## ✨ Key Features
- **🎛️ Widget Control Hub**: Centralized dashboard for managing all widgets
- **⚡ Real-time Updates**: WebSocket-based live synchronization
- **🎨 Professional Design**: Glassmorphism dark mode with modern aesthetics
- **📱 Responsive Layout**: Optimized for all screen sizes
- **🔧 Modular Architecture**: Easy to extend with new widgets
- **🚀 Production Ready**: Fully tested and optimized for performance

## 🏗️ Architecture

### Core Widgets
- **Ticker Component**: Scrolling text with GSAP animations
- **Popup Overlay**: Interactive notifications and alerts
- **BRB Overlay**: "Be Right Back" mode for stream breaks
- **State Manager**: Centralized state with persistence
- **Theme Engine**: Dynamic theme switching
- **Animation Controller**: Professional GSAP animations

### Technology Stack
- **Frontend**: Modern HTML5, CSS3, JavaScript ES6+
- **Animation**: GSAP (GreenSock Animation Platform)
- **Communication**: WebSocket for real-time updates
- **Design**: Professional glassmorphism with unified design system
- **Architecture**: Modular pub/sub pattern for widget communication

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Start Server
```bash
node server.js
```

### Access Dashboards
- **Widget Control Hub**: http://localhost:3000/ticker/dashboard-widget-hub.html
- **Live Stream Overlay**: http://localhost:3000/ticker/output.html
- **Legacy Dashboard**: http://localhost:3000/ticker/dashboard.html

## 📁 Project Structure

```
m0_Ticker/
├── public/
│   ├── dashboard-widget-hub.html    # New widget control center
│   ├── dashboard.html               # Legacy dashboard
│   ├── output.html                  # Live stream overlay
│   ├── index.html                   # Simple interface
│   ├── css/
│   │   ├── unified-design-system.css    # Main design system
│   │   ├── professional-*.css           # Professional components
│   │   └── modular/                     # Modular CSS architecture
│   └── js/
│       ├── modular/                     # Modular JavaScript components
│       ├── shared-utils.js              # Utility functions
│       ├── state-manager.js             # State management
│       └── ticker-websocket.js          # WebSocket client
├── tests/                               # Comprehensive test suite
├── server.js                           # Node.js server
├── websocket-handlers.js               # WebSocket server logic
└── ticker-state.json                   # Persistent state storage
```

## 🎛️ Widget Control Hub

### Dashboard Features
- **Real-time Monitoring**: Live status indicators for all widgets
- **Unified Control**: Manage all widgets from a single interface
- **Professional Design**: Glassmorphism aesthetics with dark mode
- **Performance Metrics**: System health and uptime tracking
- **Quick Actions**: One-click widget configuration and activation
- **Responsive Layout**: Optimized for desktop and mobile

## 🔧 Development

### Adding New Widgets
1. Create widget component in `js/modular/`
2. Add CSS styles to `css/modular/`
3. Register with state manager
4. Add to dashboard widget grid

## 📡 Real-time Communication

### WebSocket Integration
- **Connection Management**: Automatic reconnection
- **State Synchronization**: Real-time updates across all widgets
- **Error Handling**: Graceful degradation and recovery

## 🧪 Testing
```bash
npm test
```

## 📄 License
MIT License

| Variable | Description | Default |
| --- | --- | --- |
| `TICKER_DIR` | Directory served at `/ticker` for dashboard and overlay assets. | `<repo>/public` |
| `TICKER_STATE_FILE` | Path to the JSON file used to persist combined ticker/popup/scene state. | `<repo>/ticker-state.json` |

