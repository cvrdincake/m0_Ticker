# Ticker Marquee Widget (+ More) For OBS

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

For default overlay, popup, and slate behavior without rebuilding the app, edit `public/js/shared-config.js`. This file exports shared constants that power the client UI, including:

- `DEFAULT_OVERLAY.label` – the human-friendly name shown on the overlay when no queue item is active.
- `DEFAULT_OVERLAY.accent` – the hex/rgb color used for accent elements across the overlay and popup.
- `DEFAULT_OVERLAY.theme` – controls the base light/dark styling that downstream components apply.
- `DEFAULT_HIGHLIGHTS` – an array of highlight presets surfaced in the dashboard for quick selection.

For example, to customize these defaults you can tweak the exported values directly:

```js
export const DEFAULT_OVERLAY = {
  label: "My Stream",
  accent: "#00aaff",
  theme: "dark",
};

export const DEFAULT_HIGHLIGHTS = [
  { title: "Breaking News", color: "#ff3366" },
];
```

Technically minded users can fork the repository, adjust `public/js/shared-config.js`, and redeploy their variant. Loading these settings from JSON at runtime is on the roadmap as an optional enhancement for future releases.
