import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'

class DesktopErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, message: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, message: error?.message || 'Unexpected desktop error' }
  }

  componentDidCatch(error, info) {
    console.error('vukovickOS recovered from a render error:', error, info?.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert" style={{ minHeight: '100dvh', display: 'grid', placeContent: 'center', gap: 12, padding: 24, background: '#17191f', color: '#f5f5f7', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ margin: 0, fontSize: 24 }}>The desktop hit an error</h1>
          <p style={{ maxWidth: 520, lineHeight: 1.6 }}>vukovickOS stopped a failed render instead of leaving a blank screen. Reload the desktop to recover.</p>
          <pre style={{ maxWidth: 520, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', color: '#c7ccd6', fontSize: 12 }}>{this.state.message}</pre>
          <button onClick={() => window.location.reload()} style={{ justifySelf: 'start', border: 0, borderRadius: 8, padding: '10px 14px', background: '#e4e6ec', color: '#202127', fontWeight: 700 }}>Reload desktop</button>
        </main>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DesktopErrorBoundary>
      <App />
    </DesktopErrorBoundary>
  </React.StrictMode>,
)
