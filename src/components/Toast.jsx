import { useState, useCallback } from 'react'

let toastFn = null

export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null)
  toastFn = useCallback((message, duration = 2500) => {
    setMsg(message)
    setTimeout(() => setMsg(null), duration)
  }, [])
  return (
    <>
      {children}
      {msg && <div className="toast">{msg}</div>}
    </>
  )
}

export function showToast(msg, duration) {
  toastFn?.(msg, duration)
}
