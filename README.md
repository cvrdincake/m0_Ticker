# M0_Ticker

## Overview
M0_Ticker is a high-performance, modern streaming ticker and overlay system for live broadcasts, events, and dashboards. It features multiple interface options from lightweight optimized versions to full-featured professional dashboards with advanced theming and management capabilities.

## Features
- 🚀 **Ultimate Dashboard**: Full-featured professional interface with sidebar navigation, theme studio, popup management, and advanced typography
- 🎯 **Optimized Dashboard**: Lightweight, fast-loading version with core functionality (92.7% smaller)
- 📱 **Pro Dashboard**: Modern design with essential features and responsive layout
- 🎬 **Advanced Overlay**: High-fidelity overlay with visual effects, animations, and customization
- ⚡ **Optimized Overlay**: Streamlined overlay system for performance-critical scenarios
- 🔒 **Production Ready**: All versions validated, browser-tested, and documented

## Quick Start
1. `npm install`
2. `node server.js`
3. Visit `http://localhost:3000/ticker/dashboard-ultimate.html` for the full-featured dashboard
4. Visit `http://localhost:3000/ticker/output.html` for the advanced overlay

## Dashboard Versions
```
🚀 Ultimate (Recommended)    - Full-featured professional interface
🎯 Optimized                - Lightweight, core functionality only  
📱 Pro                      - Modern design, essential features
📜 Legacy                   - Original interface
```

## File Structure
```
public/
  dashboard-ultimate.html       # Full-featured professional dashboard
  dashboard-optimized.html      # Lightweight dashboard (20KB)
  output.html                   # Advanced overlay with effects
  output-optimized.html         # Streamlined overlay (18KB)
  css/                          # Complete styling system
  js/                           # Full JavaScript utilities
```

## Documentation
- See `OPTIMIZATION_RESULTS.md` for performance comparisons and optimization details

## License
MIT



## Configuration

Set the following environment variables before starting `server.js` to change where assets and state are loaded from (see [Getting Started](#getting-started) for the launch command):

| Variable | Description | Default |
| --- | --- | --- |
| `TICKER_DIR` | Directory served at `/ticker` for dashboard and overlay assets. | `<repo>/public` |
| `TICKER_STATE_FILE` | Path to the JSON file used to persist combined ticker/popup/scene state. | `<repo>/ticker-state.json` |

