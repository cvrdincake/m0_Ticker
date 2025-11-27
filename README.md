# OBS Luxury Widgets – Control Suite

Observer-facing overlay and dashboard bundle designed for premium live productions. A Node/Express back end powers WebSocket updates while a luxury-themed dashboard orchestrates ticker messages, pop-up cards, scenes, themes, and automation.

## Overview

| Stack | Details |
|-------|---------|
| Runtime | Node.js 16+ |
| Server | Express + `ws` |
| UI | HTML/CSS/vanilla JS (modularization in progress) |
| Testing | Vitest (unit) + Playwright (smoke) |
| Storage | JSON state file (`db/state.json`) |

## Key Features

- **Realtime dashboard** – tabbed interface for ticker, pop-up, scenes, theme, and system tabs.
- **Ticker management** – inline editing, bulk operations, presets, and scene snapshots.
- **Pop-up controls** – CTA links, auto-dismiss timers, queueing, Stream Deck webhooks.
- **Theme + scale** – accent colors, overlay/popup scaling, optional effects.
- **Persistence & history** – state migrations, undo stack, import/export endpoints.
- **Automation & analytics** – auto-rotation scheduling, periodic analytics broadcasts.

> Dashboard modularization, structured logging, and schema validation are currently in-flight. See [Roadmap](#roadmap) for details.

## Project Layout

```
m0_oldStreamDash/
├── assets/
│   ├── css/dashboard.css        # Extracted dashboard styling
│   └── js/dashboard/            # (WIP) modular dashboard scripts
├── db/state.json                # Persisted configuration (auto-generated)
├── index.html                   # Dashboard UI (legacy inline JS)
├── output.html                  # Overlay consumed by OBS
├── playwright.config.ts         # Playwright smoke test setup
├── scripts/refactor-index.js    # HTML refactor helper
├── server.js                    # Express/WebSocket server + state helpers
├── tests/
│   ├── e2e/                     # Playwright smoke specs
│   └── unit/                    # Vitest specs for state & analytics helpers
├── package.json
└── README.md
```

## Getting Started

### Prerequisites
- Node.js **16+** (18 LTS recommended)
- npm
- OBS Studio 28+ if you intend to render the overlay

### Install & Run
```bash
git clone <repository-url>
cd m0_oldStreamDash
npm install

# optional: create .env to override defaults (see Configuration)

npm run dev        # or npm start
```

Visit:
- Dashboard → http://localhost:4155/dashboard
- Overlay preview → http://localhost:4155/overlay
- Health check → http://localhost:4155/health

### OBS Browser Source
1. Add **Browser Source**
2. URL: `http://<host>:<port>/overlay`
3. Width 1920, Height 1080, FPS 60
4. Disable “Shutdown when not visible” and “Refresh when scene becomes active”

## Configuration

Environment variables can be stored in `.env` (loaded via `dotenv`).

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4155` | HTTP/WebSocket port |
| `HOST` | `0.0.0.0` | Bind address |
| `STATE_DB_PATH` | `<repo>/db/state.json` | Location of persisted state |
| `ANALYTICS_INTERVAL_MS` | `15000` | Frequency of analytics broadcast |
| `NODE_ENV` | _unset_ | Conventional Node environment flag |
| `LOG_LEVEL` | _(planned)_ | To be used once structured logging rollout completes |

## npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` / `npm start` | Launch Node server (`server.js`) |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Execute Playwright smoke suite (headless) |
| `npm run test:e2e:headed` | Playwright tests with UI |
| `npm run playwright:install` | Download Playwright browsers |

## Testing

### Unit Tests (Vitest)
```bash
npm test
```
Validates state helpers (`appendTickerMessage`, `executeBulkAction`, history tracking) and analytics functions using exports from `server.js.__testing`.

### Playwright Smoke Tests
```bash
npm run playwright:install   # first run
npm run test:e2e
```
Checks ticker scroll continuity, pop-up interactions, and WebSocket reconnection.

## Troubleshooting

| Issue | Checks | Fix |
|-------|--------|-----|
| Dashboard shows “Disconnected” | Server running? Port free? | Restart Node process, refresh dashboard, or change `PORT` |
| Ticker not visible | Messages enabled? Ticker shown? Overlay refreshed? | Add a message, click “Show Ticker”, refresh OBS Browser Source |
| State not persisting | Write access to `STATE_DB_PATH`? | Ensure process permissions or adjust env path |
| Playwright fails to connect | Is `PORT` in use? | Change `PORT`, update `playwright.config.ts` |
| High CPU | Disable sparkle effects, reduce overlay scale, lower ticker speed |

## Roadmap

1. **Dashboard modularization** *(in progress)* – move inline JS to `assets/js/dashboard`, re-enable linting, optimize rendering.
2. **Structured logging** *(shipped)* – adopt `logger` helper, add `LOG_LEVEL`, emit JSON logs with metadata.
3. **Schema validation & async persistence** *(shipped)* – apply Zod to WS payloads, switch `saveState` to async `fs.promises` with retries.
4. **CI automation** *(shipped)* – add GitHub Actions covering Vitest + Playwright.
5. **Performance instrumentation** *(planned)* – measure render timings, implement incremental DOM updates per message.
6. **Docs & onboarding** *(planned)* – add `.env.example`, contributor guide, and demo seed script.

## Contributing

1. Fork the repository
2. Create a feature branch (`feat/...` or `fix/...`)
3. Run `npm test` (and Playwright when relevant)
4. Submit a PR with a clear summary and testing notes

## License

MIT © OBS Luxury Widgets team

---

Made for broadcasters who expect premium production quality.