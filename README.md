# M0_Ticker

## Overview
M0_Ticker is a high-performance, modern streaming ticker and overlay system for live broadcasts, events, and dashboards. It features a fully optimized, modular codebase with a unified CSS system, consolidated utilities, and a dramatically reduced bundle size for lightning-fast performance.

## Features
- 🚀 **Optimized Dashboard**: Clean, responsive, and themeable dashboard (`dashboard-optimized.html`)
- 🎯 **Streamlined Overlay**: Animation-ready, highly configurable overlay (`output-optimized.html`)
- 🎨 **Unified CSS**: Single, maintainable base (`optimized-base.css`) for all themes and components
- 🧩 **Consolidated Utilities**: Shared, modern JavaScript utilities (`shared-utils-optimized.js`)
- ⚡ **Performance**: 92.7% file size reduction, 100% test coverage, zero ESLint errors
- 🔒 **Production Ready**: All features validated, browser-tested, and documented

## Quick Start
1. `npm install`
2. `node server.js`
3. Visit `http://localhost:3000/ticker/dashboard-optimized.html` for the dashboard
4. Visit `http://localhost:3000/ticker/output-optimized.html` for the overlay

## File Structure
```
public/
  dashboard-optimized.html      # Optimized dashboard UI
  output-optimized.html         # Optimized overlay system
  css/optimized-base.css        # Unified CSS system
  js/shared-utils-optimized.js  # Consolidated JS utilities
```

## Documentation
- See `OPTIMIZATION_RESULTS.md` for a full summary of improvements
- See `PERFECT_CODE_QUALITY_REPORT.md` for code quality details

## License
MIT



## Configuration

Set the following environment variables before starting `server.js` to change where assets and state are loaded from (see [Getting Started](#getting-started) for the launch command):

| Variable | Description | Default |
| --- | --- | --- |
| `TICKER_DIR` | Directory served at `/ticker` for dashboard and overlay assets. | `<repo>/public` |
| `TICKER_STATE_FILE` | Path to the JSON file used to persist combined ticker/popup/scene state. | `<repo>/ticker-state.json` |

