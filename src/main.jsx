import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Apply saved preferences before render


// Apply wide mode on startup
try {
  if (localStorage.getItem('wideMode') === 'true') {
    const root = document.getElementById('root')
    if (root) root.style.maxWidth = '100%'
  }
} catch {}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error: String(error) }
  }
  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: { padding: 40, fontFamily: 'monospace', color: '#dc2626', background: '#fff' }
      }, [
        React.createElement('h2', { key: 'h' }, '⚠️ App Error'),
        React.createElement('pre', { key: 'p', style: { whiteSpace: 'pre-wrap', fontSize: 12 } }, this.state.error),
        React.createElement('button', {
          key: 'b',
          onClick: () => { localStorage.clear(); location.reload() },
          style: { marginTop: 20, padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Clear storage & reload')
      ])
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  React.createElement(ErrorBoundary, null,
    React.createElement(React.StrictMode, null,
      React.createElement(App, null)
    )
  )
)
