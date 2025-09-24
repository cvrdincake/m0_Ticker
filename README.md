# void

This project exposes a lightweight dashboard and overlay for managing the ticker, popup, slate, and related widgets over HTTP.

## Getting Started

1. Install dependencies: `npm install`
2. Run the test suite: `npm test`
3. Launch the server: `npm start`

With the server running on <http://127.0.0.1:3000>:

- Dashboard: <http://127.0.0.1:3000/ticker/index.html>
- Overlay: <http://127.0.0.1:3000/ticker/output.html>
- Server-Sent Events stream: <http://127.0.0.1:3000/ticker/stream>

The dashboard consumes the SSE stream to stay in sync with the server, and the overlay hydrates itself from the same `/ticker/stream` endpoint when it loads. OBS can point directly at the overlay URL, while operators can manage queues and presets from the dashboard.

## Configuration

Set the following environment variables before starting `server.js` to change where assets and state are loaded from (see [Getting Started](#getting-started) for the launch command):

| Variable | Description | Default |
| --- | --- | --- |
| `TICKER_DIR` | Directory served at `/ticker` for dashboard and overlay assets. | `<repo>/public` |
| `TICKER_STATE_FILE` | Path to the JSON file used to persist combined ticker/popup/scene state. | `<repo>/ticker-state.json` |

Both variables accept relative paths, which will be resolved against the current working directory when the server boots.
