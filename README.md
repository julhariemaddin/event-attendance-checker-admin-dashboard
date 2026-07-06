# ASEADO Admin Console — React Frontend

This is a 1:1 React port of the original `admin.html` / `admin.css` / `admin.js`
vanilla-JS admin console for the Event Attendance Checker. Same views, same
modals, same behavior, same dark monochrome look — just rebuilt as a Vite +
React app so it can be packaged into a Tauri `.exe` alongside your Spring Boot
backend.

## Run it

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. In dev, Vite proxies `/api` and `/ws`
requests to `http://localhost:8080` (your Spring Boot backend) — see
`vite.config.js`. If your backend runs on a different port, set
`VITE_DEV_BACKEND` before running:

```bash
VITE_DEV_BACKEND=http://localhost:9090 npm run dev
```

## Building for the .exe bundle

```bash
npm run build
```

This outputs static files to `dist/`. Point your Tauri config's
`frontendDist` (or `distDir`) at this `dist/` folder, same as you would with
any other static frontend. Because the app calls the API with relative paths
(`/api/...`, `/ws`), it works correctly both in dev (via the Vite proxy) and
in the packaged app (served same-origin by Spring Boot, or whatever you point
Tauri's webview at) — no hardcoded `localhost` URLs anywhere.

If you serve the built frontend from the same origin as the Spring Boot
backend (e.g. Boot serves the static `dist/` files itself), no proxy config
is needed at all in production — it just works.

## What's different from the original files

- **Structure**: One HTML file + one 1200-line JS file → split into
  `App.jsx` (state/data-fetching, equivalent to the original's `state` object
  and orchestration functions) plus one component per view and one per modal.
- **WebSocket**: swapped the old global `<script src="vendor/sockjs.min.js">`
  + `<script src="vendor/stomp.min.js">` tags for the npm packages
  `sockjs-client` + `@stomp/stompjs`. Same STOMP-over-SockJS protocol, same
  `/topic/scan-result` subscription, same `/app/scan` publish — your backend
  needs no changes.
- **CSS**: copied over unchanged (`src/index.css`), same CSS variables and
  class names, so the look is identical.
- **Everything else** (two-phase import validation rendering, late-cutoff
  banner timing, scan-rate bar color thresholds, RESET/DELETE confirmation
  typing, manual-entry flow for unknown scanned IDs, etc.) is a direct
  behavioral port.

## Documentation PDF

The original Scanner view's "VIEW DOCUMENTATION" button loads
`documentation.pdf` in an iframe. Drop your `documentation.pdf` into the
`public/` folder here (create it if missing) — Vite copies anything in
`public/` straight into the build output, so it'll be served at
`/documentation.pdf` exactly like before.

## Project structure

```
src/
  api/client.js          — fetch wrapper (port of admin.js's api() helper)
  hooks/
    useToasts.jsx         — toast queue (port of toast()/#toastWrap)
    useScannerSocket.js   — STOMP/SockJS connection (port of setupWebSocket())
  components/
    Modal.jsx             — generic modal shell
    Topbar.jsx            — server/scanner status pills
    Sidebar.jsx           — profile list + nav
  views/                  — one file per workspace tab
  modals/                 — one file per modal-backdrop in the original HTML
  App.jsx                 — top-level state + data orchestration
  main.jsx                — React entry point
  index.css               — unchanged global stylesheet
```
