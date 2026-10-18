# Caregiver App (PWA)

The caregiver app is **not a separate project**. It's a page of the same frontend (`/#caregiver`), and it can be **installed** like a phone app. The same `frontend/` folder and the same `npm` commands serve everything: landing page, dashboard, 3D view and caregiver app.

The only extra is the PWA layer, which builds automatically:

- `vite-plugin-pwa` in [vite.config.ts](vite.config.ts) generates the app manifest and the service worker.
- The app icons are in [public/icons/](public/icons/).

## Which command?

| You want to… | Run (in `frontend/`) | Open |
|---|---|---|
| Work on the UI, see changes live | `npm run dev` | http://localhost:5173/#caregiver |
| Test it as a real installable app | `npm run build && npm run preview` | http://localhost:4173/#caregiver |
| Open it from a phone on the same Wi-Fi | `npm run build && npm run preview -- --host` | `http://<laptop-IP>:4173/#caregiver` (see "On a real phone") |

**Why two modes?**

- `npm run dev` is for building features. The page looks and behaves exactly like the app, but the **service worker is off**, so it can't be installed and nothing gets cached. This is what you use day to day.
- `npm run build && npm run preview` runs the **production build** (port 4173). Here the service worker and manifest are active, so the app can be installed and cached. Use this to check the app experience before a demo.

You don't run `npm run dev` *and* `preview` together. Pick one. If you change code while using `preview`, run `npm run build` again.

Run `npm install` once first if you haven't, since the PWA plugin is a new dependency.

## Mock data or the real backend

This works the same as the rest of the frontend:

- **Mock (default):** no backend needed. Fake data and timers run in the browser.
- **Live backend:** create `frontend/.env.local` with:
  ```
  VITE_USE_MOCK=false
  VITE_API_BASE_URL=http://localhost:8000
  VITE_WS_URL=ws://localhost:8000/ws
  ```
  Start the backend (`uvicorn app.main:app --port 8000` in `backend/`), then run the frontend.

**Two things to watch with `preview`:**

1. `.env.local` values are fixed **at build time**. After changing them, run `npm run build` again.
2. `preview` runs on port **4173**, but the backend only allows `http://localhost:5173` by default. Add the new port in `backend/.env`, then restart the backend:
   ```
   CORS_ORIGINS=http://localhost:5173,http://localhost:4173
   ```

## Without a real phone

### Option 1: Phone-sized view in Chrome (quickest, works with `npm run dev`)

1. Open http://localhost:5173/#caregiver in Chrome.
2. Open DevTools (`Cmd+Option+I`), then click the **phone/tablet icon** (Toggle device toolbar, `Cmd+Shift+M`).
3. Pick a device, for example **iPhone 14 Pro** or **Pixel 7**, and reload.

This shows the real mobile layout and touch behaviour. It's enough for checking the UI.

### Option 2: Install it on your laptop (the real "app" feel)

Chrome allows installing from `localhost` without HTTPS.

1. `npm run build && npm run preview`
2. Open http://localhost:4173/#caregiver in Chrome.
3. Click the **install icon** at the right of the address bar (or menu **⋮ → Cast, save and share → Install page as app**).
4. TemanMu opens in its own window with its own icon, straight onto the caregiver screen. Resize the window narrow to make it phone-like.

To uninstall: open the app window, then **⋮ → Uninstall TemanMu**.

### Option 3: Phone emulators (optional, heavier)

- **iPhone:** Xcode → Open Developer Tool → Simulator. Open Safari in the simulator and go to `http://localhost:4173/#caregiver`, then Share → **Add to Home Screen**.
- **Android:** Android Studio → Device Manager → start an emulator. Its Chrome reaches your laptop at `http://10.0.2.2:4173/#caregiver`.

### Checking that the PWA parts work

In Chrome DevTools → **Application** tab (on the `preview` URL):

- **Manifest** shows the name "TemanMu Caregiver", the icons and the start URL `/#caregiver`.
- **Service workers** shows `sw.js` as activated and running.

## On a real phone

Phones only allow installing over **HTTPS** (`localhost` is the only exception, and on a phone `localhost` is the phone itself). The simplest route is a free tunnel:

1. `npm run build && npm run preview`
2. In another terminal: `cloudflared tunnel --url http://localhost:4173` (install with `brew install cloudflared`). It prints an `https://….trycloudflare.com` address.
3. Open that address plus `/#caregiver` on the phone:
   - **Android (Chrome):** menu → **Install app**.
   - **iPhone (Safari):** Share → **Add to Home Screen**.

**Data on the phone:**

- **Mock data does not sync** between the phone and your laptop: each browser runs its own fake session. For a demo where the 3D view on the laptop drives alerts on the phone, use the **live backend**.
- The backend needs its own HTTPS tunnel: `cloudflared tunnel --url http://localhost:8000`.
- Set `VITE_API_BASE_URL=https://<backend-tunnel>` and `VITE_WS_URL=wss://<backend-tunnel>/ws` in `.env.local`, rebuild, and add the frontend tunnel address to `CORS_ORIGINS`.

## Troubleshooting

| Problem | Fix |
|---|---|
| No install button | Make sure you're on `npm run preview` (port 4173), not `npm run dev`. |
| App shows an old version after a rebuild | The service worker updates itself on the next load. Reload once more, or DevTools → Application → Service workers → **Unregister**, then reload. |
| Stuck on "Connecting…" in live mode | Backend not running, wrong `VITE_API_BASE_URL`, or the current port missing from `CORS_ORIGINS`. |
| Changed `.env.local` but nothing changed | Run `npm run build` again (preview serves the last build). |
