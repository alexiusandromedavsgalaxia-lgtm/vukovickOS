# vukovickOS

A browser-based experimental desktop built with React, Vite and MediaPipe Tasks Vision.

## Current prototype

- Normal Mode starts with physics disabled.
- Free Physics animates desktop icons with gravity-like motion and edge bounce.
- Pointer-based dragging for desktop icons and windows.
- App windows can be opened, focused, minimized, maximized/restored and closed.
- Split-view demonstration for a second linked surface.
- Optional webcam hand tracking with pinch-to-move and experimental fist-forward-motion activation.
- GPU hand tracking with a CPU fallback planned for the camera engine.
- Responsive layout and reduced-motion support.

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

Camera access is opt-in. The browser asks for permission when **Enable camera** is selected. Hand landmark processing runs in the browser. Camera access requires HTTPS or localhost. MediaPipe's WASM and model assets are loaded from their configured public CDNs.

## Limitations

vukovickOS is a web simulation, not a bootable operating system. It cannot control native apps or operating-system windows. Split view is a visual prototype, music controls are a mock-up, and paper-like deformation, hand-to-hand transfer and robust throw recognition are not implemented yet.
