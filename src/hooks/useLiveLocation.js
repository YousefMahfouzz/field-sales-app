import { useEffect, useState } from 'react'

/**
 * Global live location tracker.
 *
 * Once started, it watches the device's GPS continuously and caches the
 * latest position in module-level state. Any component can call
 * `useLiveLocation()` to get instant access to the current position
 * without triggering a fresh GPS prompt.
 *
 * Usage:
 *   - Call `startLiveLocation()` once near the top of the app (App.jsx)
 *     to begin tracking.
 *   - Anywhere else, call `useLiveLocation()` to get { lat, lng, accuracy,
 *     updatedAt, error } that re-renders when the position changes.
 *   - Call `getLastKnownPosition()` for a non-React synchronous read.
 */

const STORE = {
  position: null,    // { lat, lng, accuracy, updatedAt }
  error: null,
  watchId: null,
  pollId: null,
  listeners: new Set(),
}

const notify = () => STORE.listeners.forEach(fn => fn())

const handleSuccess = (pos) => {
  STORE.position = {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    updatedAt: Date.now(),
  }
  STORE.error = null
  notify()
}

const handleError = (err) => {
  STORE.error = err.message || 'Location unavailable'
  notify()
}

let started = false
export function startLiveLocation() {
  if (started || typeof navigator === 'undefined' || !navigator.geolocation) return
  started = true

  // Watch + 5s poll fallback (some browsers throttle watchPosition)
  STORE.watchId = navigator.geolocation.watchPosition(
    handleSuccess, handleError,
    { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
  )
  STORE.pollId = setInterval(() => {
    navigator.geolocation.getCurrentPosition(
      handleSuccess, () => {},
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 8000 }
    )
  }, 5000)
}

export function stopLiveLocation() {
  if (STORE.watchId != null && typeof navigator !== 'undefined') {
    navigator.geolocation.clearWatch(STORE.watchId)
    STORE.watchId = null
  }
  if (STORE.pollId != null) {
    clearInterval(STORE.pollId)
    STORE.pollId = null
  }
  started = false
}

export function getLastKnownPosition() { return STORE.position }

/** React hook: returns the current live position and re-renders on each update. */
export function useLiveLocation() {
  const [, force] = useState(0)
  useEffect(() => {
    const fn = () => force(x => x + 1)
    STORE.listeners.add(fn)
    if (!started) startLiveLocation()
    return () => { STORE.listeners.delete(fn) }
  }, [])
  return {
    position: STORE.position,
    lat: STORE.position?.lat ?? null,
    lng: STORE.position?.lng ?? null,
    accuracy: STORE.position?.accuracy ?? null,
    updatedAt: STORE.position?.updatedAt ?? null,
    error: STORE.error,
  }
}
