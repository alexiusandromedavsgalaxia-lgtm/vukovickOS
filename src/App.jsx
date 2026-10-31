import { useCallback, useEffect, useRef, useState } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'

const APPS = [
  { id: 'finder', name: 'Files', glyph: '▤', color: 'linear-gradient(145deg,#70b7ff,#4267e8)', subtitle: 'Your space, neatly arranged' },
  { id: 'browser', name: 'Browser', glyph: '◎', color: 'linear-gradient(145deg,#73e0c2,#168b91)', subtitle: 'Explore the open web' },
  { id: 'notes', name: 'Notes', glyph: '✎', color: 'linear-gradient(145deg,#ffd56c,#e58a35)', subtitle: 'Ideas live here' },
  { id: 'music', name: 'Music', glyph: '♫', color: 'linear-gradient(145deg,#f49bc7,#9d55d7)', subtitle: 'A little rhythm' },
  { id: 'gallery', name: 'Gallery', glyph: '▧', color: 'linear-gradient(145deg,#ff9b83,#d94e70)', subtitle: 'A collection of moments' },
  { id: 'terminal', name: 'Terminal', glyph: '⌘', color: 'linear-gradient(145deg,#a5b4fc,#6264bd)', subtitle: 'The command corner' },
  { id: 'settings', name: 'Settings', glyph: '⚙', color: 'linear-gradient(145deg,#b9c6d8,#65758c)', subtitle: 'Make it yours' },
  { id: 'camera', name: 'Camera', glyph: '◉', color: 'linear-gradient(145deg,#9bd6e9,#4779b7)', subtitle: 'See the world differently' },
]

const initialIcons = APPS.map((app, i) => ({ ...app, x: 13 + (i % 4) * 23, y: 20 + Math.floor(i / 4) * 34, vx: (i % 2 ? 1 : -1) * (0.12 + i * 0.018), vy: 0.08 + i * 0.012, rotation: i * 5, scale: 1 }))
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

function AppContent({ app, split, onSplit }) {
  if (app.id === 'browser') return <div className="browser-content"><div className="address-bar"><span>⌕</span> https://vukovick.space <span className="secure">●</span></div><div className="browser-hero"><div className="eyebrow">A NEW WAY TO INTERACT</div><h2>Make the interface<br/><em>feel alive.</em></h2><p>Grab. Stretch. Fold. Throw. Your desktop follows your hands.</p><button className="primary-button" onClick={onSplit}>Try split view <span>↗</span></button></div><div className="browser-cards"><div><b>01 / Gesture</b><span>Natural movement</span></div><div><b>02 / Physics</b><span>Playful objects</span></div><div><b>03 / Space</b><span>Flexible windows</span></div></div></div>
  if (app.id === 'notes') return <div className="notes-content"><div className="note-date">SATURDAY · OCTOBER 31</div><h2>Things to imagine</h2><p>What if a window could feel like paper?</p><ul><li>Grab an app with a pinch.</li><li>Stretch it between two hands.</li><li>Split it into two working surfaces.</li><li>Throw a ball at the camera to unlock free physics.</li></ul><textarea aria-label="Write a note" defaultValue="The best interfaces make ideas feel tangible." /></div>
  if (app.id === 'finder') return <div className="files-content"><div className="file-row"><span className="file-icon blue">▣</span><div><b>My projects</b><small>12 items</small></div><span>Today</span></div><div className="file-row"><span className="file-icon yellow">▤</span><div><b>Design sketches</b><small>8 items</small></div><span>Yesterday</span></div><div className="file-row"><span className="file-icon pink">▧</span><div><b>Ideas.txt</b><small>4 KB</small></div><span>Oct 28</span></div></div>
  if (app.id === 'music') return <div className="music-content"><div className="album-art">♫</div><div className="track-title">Motion in colour</div><div className="track-subtitle">vukovickOS sound lab · visual demo</div><small className="demo-note">Music controls are a visual mock-up.</small><div className="track-line"><span/></div><div className="player-controls"><button disabled aria-label="Previous track">↶</button><button className="play-button" disabled aria-label="Playback demo">▶</button><button disabled aria-label="Next track">↷</button></div></div>
  if (app.id === 'gallery') return <div className="gallery-content"><div className="gallery-tile tile-a">01 <span>Soft forms</span></div><div className="gallery-tile tile-b">02 <span>Colour study</span></div><div className="gallery-tile tile-c">03 <span>Spatial notes</span></div></div>
  if (app.id === 'terminal') return <div className="terminal-content"><p>vukovickOS [prototype]</p><p>Gesture engine initialized...</p><p>Physics layer: <b>standby</b></p><p>Camera: permission required</p><p className="terminal-prompt">guest@vukovick:~$ <i>_</i></p></div>
  if (app.id === 'settings') return <div className="settings-content"><div><span>Appearance</span><b>Midnight glass</b></div><div><span>Interaction</span><b>Gesture + pointer</b></div><div><span>Physics mode</span><b>Manual activation</b></div><div><span>Camera processing</span><b>On-device demo</b></div></div>
  if (app.id === 'camera') return <div className="camera-content"><div className="camera-orb">◉</div><h3>Gesture camera</h3><p>Enable camera from the top bar to try hand tracking.</p></div>
  return <div className="empty-content">A new space is ready.</div>
}

function GestureCamera({ enabled, onClose, onPhysics, onStatus, onPinch, onTwoHandSplit, status }) {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const rafRef = useRef(0)
  const streamRef = useRef(null)
  const previousRef = useRef({ fist: false, area: 0, pinch: false, x: 0, y: 0, lastThrow: 0, twoHandPinch: false, handGap: 0 })
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access requires HTTPS or localhost.')
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 }, audio: false })
        streamRef.current = stream
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return }
        if (!videoRef.current) throw new Error('Camera preview is not available.')
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm')
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 2,
        })
        if (cancelled) { landmarker.close(); return }
        landmarkerRef.current = landmarker
        setReady(true)
        onStatus('Camera ready · show your hands')
        const detect = () => {
          if (cancelled || !videoRef.current || !landmarkerRef.current) return
          const now = performance.now()
          const result = landmarkerRef.current.detectForVideo(videoRef.current, now)
          const hand = result.landmarks?.[0]
          if (hand) {
            const thumb = hand[4], index = hand[8], middle = hand[12], ring = hand[16], pinky = hand[20], wrist = hand[0]
            const distance = (a,b) => Math.hypot(a.x-b.x,a.y-b.y)
            const pinch = distance(thumb,index) < 0.055
            const curled = [index,middle,ring,pinky].every(p => distance(p,wrist) < 0.29)
            const xs = hand.map(p=>p.x), ys = hand.map(p=>p.y)
            const area = (Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))
            const center = { x: 1 - (thumb.x+index.x)/2, y: (thumb.y+index.y)/2 }
            const previous = previousRef.current
            if (pinch && !previous.pinch) onPinch('start', center)
            if (pinch && previous.pinch) onPinch('move', center)
            if (!pinch && previous.pinch) onPinch('end', center)
            const throwDetected = curled && previous.fist && area > previous.area * 1.45 && area > 0.035 && now - (previous.lastThrow || 0) > 1800
            if (throwDetected) {
              onPhysics()
              previous.lastThrow = now
              onStatus('Forward fist movement detected · physics toggled')
            } else if (pinch) onStatus('Pinch detected · grab and move')
            else if (curled) onStatus('Fist detected · move hand forward to toggle physics')
            else onStatus('Hand tracked · try a pinch')

            const secondHand = result.landmarks?.[1]
            if (secondHand) {
              const secondPinch = distance(secondHand[4], secondHand[8]) < 0.055
              const secondCenter = { x: 1 - (secondHand[4].x + secondHand[8].x) / 2, y: (secondHand[4].y + secondHand[8].y) / 2 }
              const gap = distance(center, secondCenter)
              const bothPinching = pinch && secondPinch
              if (bothPinching && previous.twoHandPinch && Math.abs(gap - previous.handGap) > 0.12) {
                onTwoHandSplit()
                previous.twoHandPinch = false
                onStatus('Two-hand stretch detected · split view toggled')
              } else {
                previous.twoHandPinch = bothPinching
              }
              previous.handGap = gap
            } else {
              previous.twoHandPinch = false
              previous.handGap = 0
            }
            previousRef.current = { ...previous, fist: curled, area, pinch, x: center.x, y: center.y }
          } else {
            if (previousRef.current.pinch) onPinch('end', {x:0.5,y:0.5})
            previousRef.current = { ...previousRef.current, fist: false, pinch: false }
            onStatus('Show one or both hands')
          }
          rafRef.current = requestAnimationFrame(detect)
        }
        detect()
      } catch (e) {
        setError(e?.message || 'Could not start the camera.')
        onStatus('Camera unavailable')
      }
    }
    start()
    return () => {
      cancelled = true
      cancelAnimationFrame(rafRef.current)
      landmarkerRef.current?.close()
      landmarkerRef.current = null
      streamRef.current?.getTracks().forEach(track => track.stop())
      streamRef.current = null
      setReady(false)
    }
  }, [enabled, onPhysics, onStatus, onPinch, onTwoHandSplit])

  if (!enabled) return null
  return <div className="camera-panel"><div className="camera-preview"><video ref={videoRef} playsInline muted/><div className="camera-scan"><span/></div><div className="camera-state">{ready ? 'LIVE TRACKING' : 'CONNECTING CAMERA'}</div></div><div className="camera-panel-copy"><div><b>Gesture tracking</b><small>{error || status || (ready ? 'Processing stays in this browser.' : 'Allow camera access to begin.')}</small></div><button onClick={onClose} aria-label="Close camera">×</button></div></div>
}

export default function App() {
  const [windows, setWindows] = useState([])
  const [maximizedWindows, setMaximizedWindows] = useState({})
  const [activeWindow, setActiveWindow] = useState(null)
  const [freePhysics, setFreePhysics] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [gestureStatus, setGestureStatus] = useState('Camera off')
  const [splitWindows, setSplitWindows] = useState({})
  const [icons, setIcons] = useState(initialIcons)
  const [toast, setToast] = useState('')
  const freePhysicsRef = useRef(freePhysics)
  freePhysicsRef.current = freePhysics
  const [now, setNow] = useState(() => new Date())
  const boardRef = useRef(null)
  const dragRef = useRef(null)
  const pinchRef = useRef(null)
  const lastToast = useRef(0)
  const iconsRef = useRef(icons)
  iconsRef.current = icons

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  const notify = useCallback((message) => {
    setToast(message)
    window.clearTimeout(lastToast.current)
    lastToast.current = window.setTimeout(() => setToast(''), 2200)
  }, [])

  const openApp = useCallback((app) => {
    setWindows(prev => {
      const existing = prev.find(w => w.id === app.id)
      if (existing) return prev.map(w => w.id === app.id ? { ...w, minimized: false } : w)
      const offset = prev.length * 28
      return [...prev, { ...app, x: Math.max(70, 180 + offset), y: Math.max(72, 80 + offset), width: 560, height: 420, z: Date.now(), minimized: false }]
    })
    setActiveWindow(app.id)
  }, [])

  const togglePhysics = useCallback(() => {
    const next = !freePhysicsRef.current
    freePhysicsRef.current = next
    setFreePhysics(next)
    notify(next ? 'FREE PHYSICS · objects released' : 'NORMAL MODE · desktop restored')
    if (!next) setIcons(prev => prev.map((icon, i) => ({ ...icon, x: 13 + (i % 4) * 23, y: 20 + Math.floor(i / 4) * 34, vx: 0, vy: 0, rotation: 0, scale: 1 })))
    else setIcons(prev => prev.map(icon => ({ ...icon, vx: (Math.random() - .5) * .75, vy: (Math.random() - .5) * .65, rotation: (Math.random() - .5) * 25 })))
  }, [notify])

  const activatePhysicsFromGesture = togglePhysics

  const toggleActiveSplit = useCallback(() => {
    if (!activeWindow) { notify('Open an app window first'); return }
    setSplitWindows(prev => ({ ...prev, [activeWindow]: !prev[activeWindow] }))
  }, [activeWindow, notify])

  const onPinch = useCallback((phase, point) => {
    if (!boardRef.current) return
    if (phase === 'start') {
      const board = boardRef.current.getBoundingClientRect()
      const x = point.x * board.width, y = point.y * board.height
      const nearest = iconsRef.current.reduce((best, icon) => {
        const d = Math.hypot((icon.x/100*board.width)-x, (icon.y/100*board.height)-y)
        return d < best.d ? { id: icon.id, d } : best
      }, {id:null,d:Infinity})
      pinchRef.current = { id: nearest.d < 180 ? nearest.id : null }
    } else if (phase === 'move' && pinchRef.current?.id) {
      setIcons(prev => prev.map(icon => icon.id === pinchRef.current.id ? { ...icon, x: clamp(point.x*100, 5, 94), y: clamp(point.y*100, 10, 88), vx: 0, vy: 0 } : icon))
    } else if (phase === 'end') {
      pinchRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!freePhysics || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let previous = 0
    const animate = (time) => {
      if (time - previous > 28) {
        previous = time
        setIcons(items => items.map(icon => {
          let x = icon.x + icon.vx
          let y = icon.y + icon.vy
          let vx = icon.vx
          let vy = icon.vy + 0.012
          if (x < 5 || x > 94) vx *= -0.86
          if (y < 10 || y > 88) vy *= -0.82
          x = clamp(x, 5, 94); y = clamp(y, 10, 88)
          return { ...icon, x, y, vx: vx * 0.998, vy: vy * 0.998, rotation: icon.rotation + vx * 1.7 }
        }))
      }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [freePhysics])

  useEffect(() => {
    const move = (event) => {
      if (!dragRef.current || !boardRef.current) return
      const board = boardRef.current.getBoundingClientRect()
      const dx = event.clientX - dragRef.current.startX
      const dy = event.clientY - dragRef.current.startY
      if (dragRef.current.kind === 'icon') {
        const x = clamp(((dragRef.current.originX + dx) / board.width) * 100, 5, 94)
        const y = clamp(((dragRef.current.originY + dy) / board.height) * 100, 10, 88)
        setIcons(prev => prev.map(icon => icon.id === dragRef.current.id ? { ...icon, x, y, vx: 0, vy: 0 } : icon))
      } else {
        setWindows(prev => prev.map(win => win.id === dragRef.current.id ? { ...win, x: clamp(dragRef.current.winX + dx, 0, window.innerWidth - 260), y: clamp(dragRef.current.winY + dy, 42, window.innerHeight - 100) } : win))
      }
    }
    const up = () => { dragRef.current = null }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up) }
  }, [])

  const beginIconDrag = (event, app) => {
    if (event.button !== 0) return
    const rect = boardRef.current.getBoundingClientRect()
    const item = icons.find(icon => icon.id === app.id)
    dragRef.current = { kind: 'icon', id: app.id, startX: event.clientX, startY: event.clientY, originX: item.x/100*rect.width, originY: item.y/100*rect.height, moved: false }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const endIcon = (event, app) => {
    if (!dragRef.current) return
    const moved = Math.hypot(event.clientX-dragRef.current.startX,event.clientY-dragRef.current.startY) > 8
    dragRef.current = null
    if (!moved) openApp(app)
  }

  const beginWindowDrag = (event, win) => {
    if (event.target.closest('button')) return
    dragRef.current = { kind:'window', id:win.id, startX:event.clientX, startY:event.clientY, winX:win.x, winY:win.y }
    setActiveWindow(win.id)
  }

  const closeWindow = (id) => {
    setWindows(prev => {
      const next = prev.filter(w => w.id !== id)
      setActiveWindow(current => current === id ? (next.filter(w => !w.minimized).at(-1)?.id || null) : current)
      return next
    })
    setMaximizedWindows(prev => { const next = { ...prev }; delete next[id]; return next })
    setSplitWindows(prev => { const next = { ...prev }; delete next[id]; return next })
  }
  const minimizeWindow = (id) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, minimized: true } : w))
    if (activeWindow === id) setActiveWindow(windows.filter(w => w.id !== id && !w.minimized).at(-1)?.id || null)
  }
  const toggleMaximize = (id) => {
    const board = boardRef.current?.getBoundingClientRect()
    if (!board) return
    const saved = maximizedWindows[id]
    if (saved) {
      setWindows(prev => prev.map(w => w.id === id ? { ...w, ...saved } : w))
      setMaximizedWindows(prev => { const next = { ...prev }; delete next[id]; return next })
    } else {
      const current = windows.find(w => w.id === id)
      if (!current) return
      setMaximizedWindows(prev => ({ ...prev, [id]: { x: current.x, y: current.y, width: current.width, height: current.height } }))
      setWindows(prev => prev.map(w => w.id === id ? { ...w, x: 12, y: 12, width: board.width - 24, height: board.height - 24 } : w))
    }
  }
  const toggleSplit = (id) => setSplitWindows(prev => ({ ...prev, [id]: !prev[id] }))

  return <div className={`os-shell ${freePhysics ? 'physics-on' : ''}`}>
    <div className="wallpaper-glow glow-one"/><div className="wallpaper-glow glow-two"/>
    <header className="topbar">
      <div className="brand-mark">v<span>.</span></div>
      <div className="brand-name">vukovick<span>OS</span><small>SPATIAL DESKTOP / 0.1</small></div>
      <div className="topbar-divider"/>
      <div className="mode-indicator"><i className={freePhysics ? 'live' : ''}/>{freePhysics ? 'FREE PHYSICS' : 'NORMAL MODE'}</div>
      <div className="topbar-spacer"/>
      <button className={cameraOn ? 'top-action active' : 'top-action'} onClick={() => setCameraOn(v => !v)}><span>◉</span>{cameraOn ? 'Camera on' : 'Enable camera'}</button>
      <button className={freePhysics ? 'physics-button active' : 'physics-button'} onClick={togglePhysics}><span>✳</span>{freePhysics ? 'Restore desktop' : 'Free physics'}</button>
      <div className="clock"><b>{new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(now)}</b><small>{new Intl.DateTimeFormat('en', { weekday: 'short', month: 'short', day: 'numeric' }).format(now).toUpperCase()}</small></div>
    </header>

    <main className="desktop" ref={boardRef}>
      <div className="desktop-caption"><span>YOUR SPACE</span><span>DRAG ICONS · OPEN WINDOWS · EXPERIMENT</span></div>
      <div className="app-grid floating">
        {icons.map((app) => <button key={app.id} className={`app-icon ${freePhysics ? 'physical' : ''}`} style={{ left: app.x+'%', top: app.y+'%', transform:`translate(-50%,-50%) rotate(${freePhysics ? app.rotation : 0}deg) scale(${freePhysics ? app.scale : 1})` }} onPointerDown={e => beginIconDrag(e,app)} onPointerUp={e => endIcon(e,app)} onDoubleClick={() => openApp(app)}>
          <span className="icon-art" style={{background:app.color}}>{app.glyph}</span><span className="icon-label">{app.name}</span>
        </button>)}
      </div>

      {windows.filter(w => !w.minimized).map(win => <section key={win.id} className={`app-window ${activeWindow === win.id ? 'focused' : ''} ${splitWindows[win.id] ? 'split-window' : ''}`} style={{left:win.x,top:win.y,width:win.width,height:win.height,zIndex:activeWindow === win.id ? 30 : 20}} onPointerDown={() => setActiveWindow(win.id)}>
        <div className="window-titlebar" onPointerDown={e => beginWindowDrag(e,win)}>
          <div className="window-controls"><button className="dot close" onClick={() => closeWindow(win.id)} aria-label="Close window"/><button className="dot minimize" onClick={() => minimizeWindow(win.id)} aria-label="Minimize window"/><button className="dot maximize" onClick={() => toggleMaximize(win.id)} aria-label={maximizedWindows[win.id] ? 'Restore window' : 'Maximize window'}/></div>
          <div className="window-title">{win.name}</div>
          <button className="window-tool" onClick={() => toggleSplit(win.id)} title="Split this app into two surfaces">◫</button>
        </div>
        <div className="window-body"><div className="window-main"><AppContent app={win} split={splitWindows[win.id]} onSplit={() => toggleSplit(win.id)}/></div>{splitWindows[win.id] && <div className="window-side"><div className="side-label">SECOND SURFACE</div><h3>{win.name} · view 2</h3><p>This app is now represented by two linked work surfaces. Drag the window or use the split control to reunite them.</p><button className="subtle-button" onClick={() => toggleSplit(win.id)}>Reunite surfaces</button></div>}</div>
      </section>)}

      {cameraOn && <GestureCamera enabled={cameraOn} onClose={() => setCameraOn(false)} onPhysics={activatePhysicsFromGesture} onStatus={setGestureStatus} onPinch={onPinch} onTwoHandSplit={toggleActiveSplit} status={gestureStatus}/>}
      {toast && <div className="toast"><span>✦</span>{toast}</div>}
      <div className="desktop-hint">{freePhysics ? 'PHYSICS ACTIVE · ICONS ARE IN MOTION' : 'NORMAL MODE · PHYSICS LOCKED'}</div>
    </main>

    <footer className="dock-wrap"><nav className="dock">
      {APPS.slice(0,6).map(app => <button key={app.id} className={windows.some(w=>w.id===app.id&&!w.minimized)?'dock-app running':'dock-app'} onClick={() => openApp(app)} title={app.name}><span style={{background:app.color}}>{app.glyph}</span></button>)}
      <i className="dock-separator"/>
      <button className="dock-app camera-dock" onClick={() => setCameraOn(v=>!v)} title="Gesture camera"><span>◉</span></button>
      <button className="dock-app settings-dock" onClick={() => openApp(APPS.find(a=>a.id==='settings'))} title="Settings"><span>⚙</span></button>
    </nav><div className="dock-caption">vukovickOS <span>·</span> built for curious hands</div></footer>
  </div>
}
