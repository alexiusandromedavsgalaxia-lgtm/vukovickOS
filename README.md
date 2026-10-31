# vukovickOS

A gesture-first, browser-based spatial desktop experiment built with React, Vite and MediaPipe Tasks Vision.

## What works in this prototype

- Normal Mode starts with desktop physics disabled.
- Free Physics animates desktop icons with gravity-like motion and edge bounce.
- Drag desktop icons with a pointer or a pinch gesture.
- Open apps from the desktop or dock.
- Move windows with their title bars or pinch and drag them with the camera.
- Resize windows from the lower-right corner.
- Minimize, maximize, restore, focus and close app windows.
- Split an app into two live, linked surfaces and reunite them.
- Notes and desktop icon positions persist in this browser using local storage.
- Optional webcam hand tracking with pinch interaction, a two-hand stretch gesture to toggle split view, and a fist-forward gesture to toggle Free Physics.
- CPU-based hand tracking with throttled detection to reduce GPU and thermal instability.
- Camera startup reports whether access, video playback, or the remote hand-tracking model failed; mobile camera constraints have a simple fallback.
- A stale camera initialization cannot stop a newer stream, including during React Strict Mode effect cleanup.
- In Free Physics, icons can be thrown with pointer dragging or a pinch gesture; launch velocity is capped for stability.
- Camera tracking fails closed if frame detection errors, releasing the camera stream instead of leaving a runaway loop.
- Responsive layout, keyboard shortcuts and reduced-motion support.

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Alt + 1…8` | Open the corresponding app |
| `Ctrl + Space` | Toggle Free Physics |
| `Ctrl + Shift + S` | Split or reunite the active app |
| `Escape` | Close the active app window |

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run preview
```

## Cloudflare Pages

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

The `public/_redirects` file enables SPA fallback routing.

## Camera and privacy

Camera access is opt-in. The browser asks for permission when the **camera button in the dock** is selected. Hand landmark processing runs in the browser. Camera access requires HTTPS or localhost. MediaPipe's WASM and model assets are loaded from their configured public CDNs. No camera frames are uploaded by this app.

## Known limitations

vukovickOS is a web simulation, not a bootable operating system. It cannot control native apps or operating-system windows. The hand-tracking gestures are experimental and may be sensitive to lighting, camera position and device performance. Two-hand stretch currently toggles split view rather than continuously resizing a surface. Paper-like folding/crumpling, hand-to-hand window transfer, full native file access and real music playback are not implemented. The built-in app content is a prototype, not a set of full productivity apps.

## Deployment

This repository includes a GitHub Actions build workflow. A successful build verifies the production bundle; it does not automatically mean a Cloudflare Pages deployment has been configured or published. This repository currently has a build-check workflow only, not a Cloudflare deployment workflow. To publish the latest `main`, the Cloudflare Pages project must be connected to this repository (build command `npm run build`, output directory `dist`) or deployed manually.
