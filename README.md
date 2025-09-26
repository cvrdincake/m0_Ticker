# Ticker Marquee Widget (+ More) For OBS

This project exposes a lightweight dashboard and overlay for managing the ticker, popup, slate, and related widgets over HTTP.

## Source of truth

- The browser-facing dashboard and overlay are served from the files in [`public/`](public/).
- The Node.js server entry point is [`server.js`](server.js);
  configuration is described below in [Configuration](#configuration).
- Historical archives that previously lived under `backup/` have been removed
  from version control. When you cut a release, attach any supplemental
  artifacts (ZIPs, screenshots, etc.) to the corresponding GitHub release or
  capture the context in release notes instead of re-adding them to the
  repository.

## Getting Started

1. Install dependencies: `npm install`
2. Run the test suite: `npm test`
3. Launch the server: `npm start`

With the server running on <http://127.0.0.1:3000>:

- Dashboard: <http://127.0.0.1:3000/ticker/index.html>
- Overlay: <http://127.0.0.1:3000/ticker/output.html>
- Server-Sent Events stream: <http://127.0.0.1:3000/ticker/stream>

The dashboard consumes the SSE stream to stay in sync with the server, and the overlay hydrates itself from the same `/ticker/stream` endpoint when it loads. OBS can point directly at the overlay URL, while operators can manage queues and presets from the dashboard.


## Browser requirements

The dashboard and overlay apply modern CSS features—including `color-mix()` and `backdrop-filter`—to achieve their visual treatments. We have verified that both render as intended in OBS Studio 30.1 (Chromium/CEF 114). Older OBS or Chromium/CEF builds gracefully fall back to solid-color backgrounds and borders when those features are unavailable, and you can confirm the degradations locally with `--disable-blink-features=BackdropFilter` if you need to simulate the reduced capabilities.



## Configuration

Set the following environment variables before starting `server.js` to change where assets and state are loaded from (see [Getting Started](#getting-started) for the launch command):

| Variable | Description | Default |
| --- | --- | --- |
| `TICKER_DIR` | Directory served at `/ticker` for dashboard and overlay assets. | `<repo>/public` |
| `TICKER_STATE_FILE` | Path to the JSON file used to persist combined ticker/popup/scene state. | `<repo>/ticker-state.json` |

