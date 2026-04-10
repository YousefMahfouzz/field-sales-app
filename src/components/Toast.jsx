import { useState, useCallback, useEffect, useRef } from 'react'

let toastFn = null

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { message, type }
  const timerRef = useRef(null)

  toastFn = useCallback((message, type = 'success', duration = 2200) => {
    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(type === 'error' ? [50, 30, 50] : [30])
    }
    setToast({ message, type, key: Date.now() })
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <>
      {children}
      {toast && (
        <div
          key={toast.key}
          style={{
            position: 'fixed',
            top: 'max(env(safe-area-inset-top, 0px), 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            padding: '12px 22px',
            borderRadius: 14,
            fontSize: 14,
            fontWeight: 700,
            color: 'white',
            maxWidth: 'calc(100vw - 40px)',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.22)',
            animation: 'toastSlideIn 0.25s ease-out, toastFadeOut 0.3s ease-in 1.9s forwards',
            background: toast.type === 'error'
              ? 'linear-gradient(135deg, #dc2626, #b91c1c)'
              : toast.type === 'warning'
              ? 'linear-gradient(135deg, #f59e0b, #d97706)'
              : 'linear-gradient(135deg, #16a34a, #15803d)',
            pointerEvents: 'none',
          }}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}

export function showToast(msg, type, duration) {
  toastFn?.(msg, type, duration)
}
