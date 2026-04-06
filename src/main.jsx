import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

// Apply wide mode on startup from saved preference
if (localStorage.getItem('wideMode') === 'true') {
  const root = document.getElementById('root')
  if (root) root.style.maxWidth = '100%'
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
