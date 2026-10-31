# vukovickOS

A gesture-first experimental desktop built with React + Vite. The project explores spatial interaction, deformable interfaces and playful desktop physics.

## Features in this prototype

- Desktop with draggable app icons and a dock
- Open, minimize, maximize and move app windows
- Normal Mode and Free Physics Mode
- Floating icons with gravity-like motion and edge bounce
- Split-surface window concept
- Optional webcam hand tracking with MediaPipe Tasks Vision
- Pinch tracking for moving desktop icons
- Experimental fist-and-forward-motion trigger for Free Physics
- Responsive layout for desktop and tablets

## Run locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Cloudflare Pages

- Framework preset: **Vite**
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

The included `public/_redirects` keeps client-side routes working on Pages.

## Camera and privacy

Camera access is opt-in. Click **Enable camera** and grant browser permission. The MediaPipe hand-landmark model runs in the browser; frames are not uploaded by this app. Camera access requires HTTPS (Cloudflare Pages provides HTTPS) or localhost.

## Gesture prototype notes

The webcam implementation currently demonstrates hand landmarks, pinch tracking and a heuristic fist-thrust activation for Free Physics. It is an experimental interaction layer, not a production-grade gesture classifier. The other gestures in the concept (paper crumpling, splitting, throwing windows, circular activation) are represented by the desktop interaction model and are planned for future iterations.

## Important

vukovickOS is a browser-based desktop simulation, not a bootable operating system. It cannot manipulate native apps or system windows outside the browser.
