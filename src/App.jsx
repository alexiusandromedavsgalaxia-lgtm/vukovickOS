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

function AppContent({ app, split, onSplit, note, onNoteChange }) {
  if (app.id === 'browser') return <div className="browser-content"><div className="address-bar"><span>⌕</span> https://vukovick.space <span className="secure">●</span></div><div className="browser-hero"><div className="eyebrow">A NEW WAY TO INTERACT</div><h2>Make the interface<br/><em>feel alive.</em></h2><p>Grab. Stretch. Fold. Throw. Your desktop follows your hands.</p><button className="primary-button" onClick={onSplit}>Try split view <span>↗</span></button></div><div className="browser-cards"><div><b>01 / Gesture</b><span>Natural movement</span></div><div><b>02 / Physics</b><span>Playful objects</span></div><div><b>03 / Space</b><span>Flexible windows</span></div></div></div>
  if (app.id === 'notes') return <div className="notes-content"><div className="note-date">SATURDAY · OCTOBER 31</div><h2>Things to imagine</h2><p>What if a window could feel like paper?</p><ul><li>Grab an app with a pinch.</li><li>Stretch it between two hands.</li><li>Split it into two working surfaces.</li><li>Throw a ball at the camera to unlock free physics.</li></ul><textarea aria-label="Write a note" value={note} onChange={event => onNoteChange(event.target.value)} placeholder="Write something..." /></div>
  if (app.id === 'finder') return <div className="files-content"><div className="file-row"><span className="file-icon blue">▣</span><div><b>My projects</b><small>12 items</small></div><span>Today</span></div><div className="file-row"><span className="file-icon yellow">▤</span><div><b>Design sketches</b><small>8 items</small></div><span>Yesterday</span></div><div className="file-row"><span className="file-icon pink">▧</span><div><b>Ideas.txt</b><small>4 KB</small></div><span>Oct 28</span></div></div>
  if (app.id === 'music') return <div className="music-content"><div className="album-art">♫</div><div className="track-title">Motion in colour</div><div className="track-subtitle">vukovickOS sound lab · visual demo</div><small className="demo-note">Music controls are a visual mock-up.</small><div className="track-line"><span/></div><div className="player-controls"><button disabled aria-label="Previous track">↶</button><button className="play-button" disabled aria-label="Playback demo">▶</button><button disabled aria-label="Next track">↷</button></div></div>
  if (app.id === 'gallery') return <div className="gallery-content"><div className="gallery-tile tile-a">01 <span>Soft forms</span></div><div className="gallery-tile tile-b">02 <span>Colour study</span></div><div className="gallery-tile tile-c">03 <span>Spatial notes</span></div></div>
  if (app.id === 'terminal') return <div className="terminal-content"><p>vukovickOS [prototype]</p><p>Gesture engine initialized...</p><p>Physics layer: <b>standby</b></p><p>Camera: permission required</p><p className="terminal-prompt">guest@vukovick:~$ <i>_</i></p></div>
  if (app.id === 'settings') return <div className="settings-content"><div><span>Appearance</span><b>Midnight glass</b></div><div><span>Interaction</span><b>Gesture + pointer</b></div><div><span>Physics mode</span><b>Manual activation</b></div><div><span>Camera processing</span><b>On-device demo</b></div></div>
  if (app.id === 'camera') return <div className="camera-content"><div className="camera-orb">◉</div><h3>Gesture camera</h3><p>Use the camera button in the dock to try hand tracking.</p></div>
  return <div className="empty-content">A new space is ready.</div>
}

function GestureCamera({ enabled, onClose, onPhysics, onStatus, onPinch, onTwoHandSplit, status }) {
  const videoRef = useRef(null)
  const landmarkerRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const callbacksRef = useRef({ onClose, onPhysics, onStatus, onPinch, onTwoHandSplit })
  callbacksRef.current = { onClose, onPhysics, onStatus, onPinch, onTwoHandSplit }

  const previousRef = useRef({
    fist: false, area: 0, pinch: false, lastThrow: 0,
    twoHandPinch: false, handGap: 0, twoHandStartGap: 0,
  })
  const lastDetectionRef = useRef(0)
  const lastSplitRef = useRef(0)
  const lastStatusRef = useRef('')
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)

  const reportStatus = (message) => {
    if (lastStatusRef.current === message) return
    lastStatusRef.current = message
    callbacksRef.current.onStatus(message)
  }

  useEffect(() => {
    if (!enabled) {
      setReady(false)
      setError('')
      return undefined
    }

    let cancelled = false
    let localStream = null
    let localLandmarker = null
    let localFrame = 0
    let stage = 'camera permission'

    const stopLocalResources = () => {
      if (localFrame) cancelAnimationFrame(localFrame)
      const ownedLandmarker = localLandmarker
      if (ownedLandmarker) {
        try { ownedLandmarker.close() } catch {}
        localLandmarker = null
      }
      if (landmarkerRef.current === ownedLandmarker) {
        landmarkerRef.current = null
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
        if (streamRef.current === localStream) streamRef.current = null
        if (videoRef.current?.srcObject === localStream) videoRef.current.srcObject = null
        localStream = null
      }
    }

    const errorMessage = (err, currentStage) => {
      const name = err?.name || ''
      if (currentStage === 'camera permission') {
        if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(location.hostname)) {
          return 'Camera needs a secure HTTPS page. Open the HTTPS version of this site.'
        }
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          return 'Browser blocked camera access. Allow camera permission for this site, then close and reopen the camera.'
        }
        if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          return 'No available camera was found on this device.'
        }
        if (name === 'NotReadableError' || name === 'TrackStartError') {
          return 'The camera is busy or unavailable. Close other apps using it and try again.'
        }
        if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
          return 'The camera rejected the requested settings. Try again with default camera settings.'
        }
        return 'Could not access the camera' + (err?.message ? ': ' + err.message : '.')
      }
      if (currentStage === 'camera playback') {
        return 'Camera permission was granted, but the preview could not start' + (err?.message ? ': ' + err.message : '.')
      }
      if (currentStage === 'hand-tracking engine') {
        return 'The camera opened, but the hand-tracking engine could not load. Check the connection or whether this site blocks its model files' + (err?.message ? '. Details: ' + err.message : '.')
      }
      return 'Hand tracking failed' + (err?.message ? ': ' + err.message : '.')
    }

    const start = async () => {
      setError('')
      setReady(false)
      reportStatus('Requesting camera permission')

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('getUserMedia is unavailable. Use this site over HTTPS in a supported browser.')
        }

        stage = 'camera permission'
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } },
            audio: false,
          })
        } catch (firstCameraError) {
          if (cancelled) return
          const permissionErrors = ['NotAllowedError', 'SecurityError', 'NotFoundError', 'DevicesNotFoundError', 'NotReadableError', 'TrackStartError']
          if (permissionErrors.includes(firstCameraError?.name)) throw firstCameraError
          // Some mobile browsers reject ideal/facingMode constraints; retry with the simplest request.
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        }

        if (cancelled) {
          localStream.getTracks().forEach(track => track.stop())
          localStream = null
          return
        }

        streamRef.current = localStream
        const video = videoRef.current
        if (!video) throw new Error('Camera preview element is not mounted.')
        video.muted = true
        video.playsInline = true
        video.srcObject = localStream

        stage = 'camera playback'
        await video.play()
        if (cancelled) return
        reportStatus('Camera is on · loading hand tracking')

        stage = 'hand-tracking engine'
        let vision
        try {
          vision = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm')
        } catch (firstWasmError) {
          if (cancelled) return
          vision = await FilesetResolver.forVisionTasks('https://unpkg.com/@mediapipe/tasks-vision@0.10.22/wasm')
        }
        if (cancelled) return

        // The production build downloads this model into public/models, so
        // the browser loads it from the same origin as vukovickOS.
        localLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: '/models/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
        })

        if (cancelled) {
          try { localLandmarker.close() } catch {}
          localLandmarker = null
          return
        }

        landmarkerRef.current = localLandmarker
        setReady(true)
        reportStatus('Hand tracking ready · show one or both hands')

        const detect = () => {
          if (cancelled || !videoRef.current || !localLandmarker || !localStream?.active) return
          const now = performance.now()
          if (now - lastDetectionRef.current < 100) {
            localFrame = requestAnimationFrame(detect)
            rafRef.current = localFrame
            return
          }
          lastDetectionRef.current = now

          let result
          try {
            if (videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
              localFrame = requestAnimationFrame(detect)
              rafRef.current = localFrame
              return
            }
            result = localLandmarker.detectForVideo(videoRef.current, now)
          } catch (detectionError) {
            if (cancelled) return
            setError('Camera is running, but hand detection stopped. Close and reopen the camera. Details: ' + (detectionError?.message || 'unknown detection error'))
            reportStatus('Hand detection stopped')
            setReady(false)
            stopLocalResources()
            return
          }

          const hands = result.landmarks || []
          const previous = previousRef.current
          const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
          const getHandInfo = (hand) => {
            const thumb = hand[4], index = hand[8], middle = hand[12], ring = hand[16], pinky = hand[20], wrist = hand[0]
            const pinch = distance(thumb, index) < 0.065
            const curled = [index, middle, ring, pinky].every(point => distance(point, wrist) < 0.29)
            const xs = hand.map(point => point.x), ys = hand.map(point => point.y)
            const area = (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
            const center = { x: 1 - (thumb.x + index.x) / 2, y: (thumb.y + index.y) / 2 }
            return { pinch, curled, area, center }
          }

          const firstHand = hands[0]
          if (firstHand) {
            const first = getHandInfo(firstHand)
            if (first.pinch && !previous.pinch) callbacksRef.current.onPinch('start', first.center)
            if (first.pinch && previous.pinch) callbacksRef.current.onPinch('move', first.center)
            if (!first.pinch && previous.pinch) callbacksRef.current.onPinch('end', first.center)

            const throwDetected = first.curled && previous.fist &&
              first.area > previous.area * 1.35 && first.area > 0.025 &&
              now - (previous.lastThrow || 0) > 1400
            if (throwDetected) {
              callbacksRef.current.onPhysics()
              previous.lastThrow = now
              reportStatus('Forward fist movement detected · physics toggled')
            } else if (first.pinch) reportStatus('Pinch detected · move your hand to drag')
            else if (first.curled) reportStatus('Fist detected · move it towards the camera to toggle physics')
            else reportStatus('Hand tracked · bring thumb and index finger together to pinch')

            const secondHand = hands[1]
            if (secondHand) {
              const second = getHandInfo(secondHand)
              const bothPinching = first.pinch && second.pinch
              const gap = distance(first.center, second.center)
              if (bothPinching && !previous.twoHandPinch) {
                previous.twoHandStartGap = gap
              }
              const gapChangedEnough = Math.abs(gap - previous.twoHandStartGap) > 0.12
              if (bothPinching && gapChangedEnough && now - lastSplitRef.current > 1000) {
                callbacksRef.current.onTwoHandSplit()
                lastSplitRef.current = now
                previous.twoHandPinch = false
                previous.twoHandStartGap = gap
                reportStatus('Two-hand stretch detected · split view toggled')
              } else {
                previous.twoHandPinch = bothPinching
              }
              previous.handGap = gap
            } else {
              previous.twoHandPinch = false
              previous.handGap = 0
              previous.twoHandStartGap = 0
            }

            previous.fist = first.curled
            previous.area = first.area
            previous.pinch = first.pinch
          } else {
            if (previous.pinch) callbacksRef.current.onPinch('end', { x: 0.5, y: 0.5 })
            previous.fist = false
            previous.pinch = false
            previous.area = 0
            previous.twoHandPinch = false
            previous.handGap = 0
            previous.twoHandStartGap = 0
            reportStatus('Show one or both hands clearly to the camera')
          }

          localFrame = requestAnimationFrame(detect)
          rafRef.current = localFrame
        }

        localFrame = requestAnimationFrame(detect)
        rafRef.current = localFrame
      } catch (err) {
        // An older StrictMode/effect instance must never tear down the newer camera stream.
        if (cancelled) {
          if (localLandmarker) { try { localLandmarker.close() } catch {} }
          if (localStream) localStream.getTracks().forEach(track => track.stop())
          return
        }
        setError(errorMessage(err, stage))
        reportStatus(stage === 'camera permission' ? 'Camera unavailable · check permission' : 'Camera started, but gesture tracking failed')
        stopLocalResources()
        setReady(false)
      }
    }

    start()

    return () => {
      cancelled = true
      if (localFrame) cancelAnimationFrame(localFrame)
      if (localLandmarker) {
        try { localLandmarker.close() } catch {}
        if (landmarkerRef.current === localLandmarker) landmarkerRef.current = null
      }
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop())
        if (streamRef.current === localStream) streamRef.current = null
        if (videoRef.current?.srcObject === localStream) videoRef.current.srcObject = null
      }
    }
  }, [enabled])

  if (!enabled) return null
  return (
    <div className="camera-panel">
      <div className="camera-preview">
        <video ref={videoRef} playsInline muted/>
        <div className="camera-scan"><span/></div>
        <div className="camera-state">{ready ? 'LIVE TRACKING' : error ? 'CAMERA ERROR' : 'STARTING CAMERA'}</div>
      </div>
      <div className="camera-panel-copy">
        <div><b>Gesture tracking</b><small>{error || status || (ready ? 'Processing stays in this browser.' : 'Allow camera access to begin.')}</small></div>
        <button onClick={onClose} aria-label="Close camera">×</button>
      </div>
    </div>
  )
}

export default function App() {
  const [windows, setWindows] = useState([])
  const [note, setNote] = useState(() => { try { return localStorage.getItem('vukovick-note') || 'The best interfaces make ideas feel tangible.' } catch { return 'The best interfaces make ideas feel tangible.' } })
  const [maximizedWindows, setMaximizedWindows] = useState({})
  const [activeWindow, setActiveWindow] = useState(null)
  const [freePhysics, setFreePhysics] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)
  const [gestureStatus, setGestureStatus] = useState('Camera off')
  const [splitWindows, setSplitWindows] = useState({})
  const [icons, setIcons] = useState(() => { try { const saved = JSON.parse(localStorage.getItem('vukovick-icons') || 'null'); return Array.isArray(saved) && saved.length === APPS.length && saved.every(icon => icon && APPS.some(app => app.id === icon.id) && Number.isFinite(icon.x) && Number.isFinite(icon.y)) ? saved.map(icon => ({ ...icon, x: clamp(icon.x, 5, 94), y: clamp(icon.y, 10, 88), vx: 0, vy: 0, rotation: 0, scale: 1 })) : initialIcons } catch { return initialIcons } })
  const [toast, setToast] = useState('')
  const freePhysicsRef = useRef(freePhysics)
  freePhysicsRef.current = freePhysics
  const [now, setNow] = useState(() => new Date())
  const boardRef = useRef(null)
  const dragRef = useRef(null)
  const iconMotionRef = useRef({ clientX: 0, clientY: 0, time: 0 })
  const pinchRef = useRef(null)
  const lastToast = useRef(0)
  const iconsRef = useRef(icons)
  iconsRef.current = icons

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => { if (freePhysics) return; try { localStorage.setItem('vukovick-icons', JSON.stringify(icons)) } catch {} }, [icons, freePhysics])
  useEffect(() => { try { localStorage.setItem('vukovick-note', note) } catch {} }, [note])

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
        const d = Math.hypot((icon.x / 100 * board.width) - x, (icon.y / 100 * board.height) - y)
        return d < best.d ? { id: icon.id, d } : best
      }, { id: null, d: Infinity })
      const hitWindow = [...boardRef.current.querySelectorAll('.app-window')].reverse().find(element => {
        const rect = element.getBoundingClientRect()
        return x >= rect.left - board.left && x <= rect.right - board.left && y >= rect.top - board.top && y <= rect.bottom - board.top
      })
      if (hitWindow) {
        const id = hitWindow.dataset.windowId
        const rect = hitWindow.getBoundingClientRect()
        pinchRef.current = { windowId: id, offsetX: x - (rect.left - board.left), offsetY: y - (rect.top - board.top) }
        setActiveWindow(id)
      } else {
        pinchRef.current = { id: nearest.d < 95 ? nearest.id : null, lastX: point.x, lastY: point.y, lastTime: performance.now(), vx: 0, vy: 0 }
      }
    } else if (phase === 'move' && pinchRef.current?.windowId) {
      const board = boardRef.current.getBoundingClientRect()
      const { windowId, offsetX, offsetY } = pinchRef.current
      setWindows(prev => prev.map(win => win.id === windowId ? { ...win, x: clamp(point.x * board.width - offsetX, 0, Math.max(0, board.width - 260)), y: clamp(point.y * board.height - offsetY, 0, Math.max(0, board.height - 100)) } : win))
    } else if (phase === 'move' && pinchRef.current?.id) {
      const current = pinchRef.current
      const stamp = performance.now()
      const elapsed = clamp(stamp - current.lastTime, 16, 250)
      current.vx = clamp((point.x - current.lastX) * 100 * (50 / elapsed), -2.2, 2.2)
      current.vy = clamp((point.y - current.lastY) * 100 * (50 / elapsed), -2.2, 2.2)
      current.lastX = point.x
      current.lastY = point.y
      current.lastTime = stamp
      setIcons(prev => prev.map(icon => icon.id === current.id ? { ...icon, x: clamp(point.x * 100, 5, 94), y: clamp(point.y * 100, 10, 88), vx: 0, vy: 0 } : icon))
    } else if (phase === 'end') {
      const current = pinchRef.current
      if (current?.id && freePhysicsRef.current) {
        setIcons(prev => prev.map(icon => icon.id === current.id ? { ...icon, vx: current.vx || 0, vy: current.vy || 0, rotation: icon.rotation + (current.vx || 0) * 10 } : icon))
      }
      pinchRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!freePhysics) return
    // Reduced-motion settings should tone physics down, not make the gesture appear broken.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stepMs = reduceMotion ? 100 : 50
    let frame = 0
    let previous = 0
    const animate = (time) => {
      if (document.visibilityState === 'visible' && time - previous > stepMs) {
        previous = time
        setIcons(items => items.map(icon => {
          let x = icon.x + icon.vx
          let y = icon.y + icon.vy
          let vx = icon.vx
          let vy = icon.vy + (reduceMotion ? 0.006 : 0.012)
          if (x < 5 || x > 94) vx *= -0.86
          if (y < 10 || y > 88) vy *= -0.82
          x = clamp(x, 5, 94); y = clamp(y, 10, 88)
          return {
            ...icon,
            x, y,
            vx: clamp(vx * 0.992, -2.2, 2.2),
            vy: clamp(vy * 0.992, -2.2, 2.2),
            rotation: reduceMotion ? icon.rotation : (icon.rotation + vx * 1.7) % 360,
          }
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
        iconMotionRef.current = { clientX: event.clientX, clientY: event.clientY, time: performance.now() }
        setIcons(prev => prev.map(icon => icon.id === dragRef.current.id ? { ...icon, x, y, vx: 0, vy: 0 } : icon))
      } else if (dragRef.current.kind === 'resize') {
        const { id, winWidth, winHeight } = dragRef.current
        setWindows(prev => prev.map(win => win.id === id ? { ...win, width: clamp(winWidth + dx, 300, Math.max(300, window.innerWidth - win.x - 12)), height: clamp(winHeight + dy, 260, Math.max(260, window.innerHeight - win.y - 110)) } : win))
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
    iconMotionRef.current = { clientX: event.clientX, clientY: event.clientY, time: performance.now() }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  const endIcon = (event, app) => {
    if (!dragRef.current) return
    const drag = dragRef.current
    const moved = Math.hypot(event.clientX-drag.startX,event.clientY-drag.startY) > 8
    if (moved && freePhysicsRef.current && drag.kind === 'icon') {
      const board = boardRef.current?.getBoundingClientRect()
      if (board) {
        const stamp = performance.now()
        const elapsed = clamp(stamp - (iconMotionRef.current.time || stamp), 16, 250)
        const dx = event.clientX - iconMotionRef.current.clientX
        const dy = event.clientY - iconMotionRef.current.clientY
        const vx = clamp((dx / board.width) * 100 * (50 / elapsed), -2.2, 2.2)
        const vy = clamp((dy / board.height) * 100 * (50 / elapsed), -2.2, 2.2)
        setIcons(prev => prev.map(icon => icon.id === app.id ? { ...icon, vx, vy, rotation: icon.rotation + vx * 10 } : icon))
      }
    }
    dragRef.current = null
    if (!moved) openApp(app)
  }

  const beginResize = (event, win) => {
    event.preventDefault()
    event.stopPropagation()
    dragRef.current = { kind: 'resize', id: win.id, startX: event.clientX, startY: event.clientY, winWidth: win.width, winHeight: win.height }
    setActiveWindow(win.id)
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

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape' && activeWindow) { closeWindow(activeWindow); return }
      if (event.ctrlKey && event.code === 'Space') { event.preventDefault(); togglePhysics(); return }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 's') { event.preventDefault(); toggleActiveSplit(); return }
      if (event.altKey && /^[1-8]$/.test(event.key)) { openApp(APPS[Number(event.key) - 1]); return }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeWindow, closeWindow, openApp, toggleActiveSplit, togglePhysics])

  return <div className={`os-shell ${freePhysics ? 'physics-on' : ''}`}>
    <div className="wallpaper-glow glow-one"/><div className="wallpaper-glow glow-two"/>
    <div className="system-menu"><button className="system-menu-button" onClick={() => notify(`vukovickOS · ${freePhysics ? 'Free Physics' : 'Normal mode'} · ${new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(now)}`)} aria-label="System menu">v.</button><button className="system-menu-button" onClick={togglePhysics} title="Toggle Free Physics">{freePhysics ? '↺' : '✳'}</button></div>

    <main className="desktop" ref={boardRef}>
      <div className="app-grid floating">
        {icons.map((app) => <button key={app.id} className={`app-icon ${freePhysics ? 'physical' : ''}`} style={{ left: app.x+'%', top: app.y+'%', transform:`translate(-50%,-50%) rotate(${freePhysics ? app.rotation : 0}deg) scale(${freePhysics ? app.scale : 1})` }} onPointerDown={e => beginIconDrag(e,app)} onPointerUp={e => endIcon(e,app)} onDoubleClick={() => openApp(app)}>
          <span className="icon-art" style={{background:app.color}}>{app.glyph}</span><span className="icon-label">{app.name}</span>
        </button>)}
      </div>

      {windows.filter(w => !w.minimized).map(win => <section key={win.id} className={`app-window ${activeWindow === win.id ? 'focused' : ''} ${splitWindows[win.id] ? 'split-window' : ''}`} data-window-id={win.id} style={{left:win.x,top:win.y,width:win.width,height:win.height,zIndex:activeWindow === win.id ? 30 : 20}} onPointerDown={() => setActiveWindow(win.id)}>
        <div className="window-titlebar" onPointerDown={e => beginWindowDrag(e,win)}>
          <div className="window-controls"><button className="dot close" onClick={() => closeWindow(win.id)} aria-label="Close window"/><button className="dot minimize" onClick={() => minimizeWindow(win.id)} aria-label="Minimize window"/><button className="dot maximize" onClick={() => toggleMaximize(win.id)} aria-label={maximizedWindows[win.id] ? 'Restore window' : 'Maximize window'}/></div>
          <div className="window-title">{win.name}</div>
        </div>
        <div className="window-body"><div className="window-main"><AppContent app={win} split={splitWindows[win.id]} onSplit={() => toggleSplit(win.id)} note={note} onNoteChange={setNote}/></div>{splitWindows[win.id] && <div className="window-side"><div className="side-label">SECOND SURFACE · LIVE</div><AppContent app={win} split={false} onSplit={() => toggleSplit(win.id)} note={note} onNoteChange={setNote}/><button className="subtle-button" onClick={() => toggleSplit(win.id)}>Reunite surfaces</button></div>}</div><button className="window-resize" aria-label={`Resize ${win.name} window`} onPointerDown={event => beginResize(event, win)} /></section>)}

      {cameraOn && <GestureCamera enabled={cameraOn} onClose={() => setCameraOn(false)} onPhysics={activatePhysicsFromGesture} onStatus={setGestureStatus} onPinch={onPinch} onTwoHandSplit={toggleActiveSplit} status={gestureStatus}/>}
      {toast && <div className="toast"><span>✦</span>{toast}</div>}
    </main>

    <footer className="dock-wrap"><nav className="dock">
      {APPS.slice(0,6).map(app => <button key={app.id} className={windows.some(w=>w.id===app.id&&!w.minimized)?'dock-app running':'dock-app'} onClick={() => openApp(app)} title={app.name}><span style={{background:app.color}}>{app.glyph}</span></button>)}
      <i className="dock-separator"/>
      <button className="dock-app camera-dock" onClick={() => setCameraOn(v=>!v)} title="Toggle gesture camera"><span>◉</span></button>
      <button className="dock-app settings-dock" onClick={() => openApp(APPS.find(a=>a.id==='settings'))} title="Settings"><span>⚙</span></button>
    </nav><div className="dock-caption">vukovickOS <span>·</span> built for curious hands</div></footer>
  </div>
}
