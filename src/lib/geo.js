// Haversine formula: distance in meters between two GPS coords
import { getLastKnownPosition } from '../hooks/useLiveLocation'

export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000 // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// Find customers within radius meters of a point
export function findNearbyCustomers(customers, lat, lng, radiusMeters = 20000) {
  return customers.filter((c) => {
    if (c.lat == null || c.lng == null) return false
    const dist = getDistance(lat, lng, c.lat, c.lng)
    return dist <= radiusMeters
  })
}

// Get current GPS position as a promise.
// Prefers the live-location cache (updated every ~5s) when it's fresh enough,
// so call sites get an instant answer instead of waiting for a fresh GPS fix.
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }
    // Try the live store first (synchronous, no GPS prompt)
    const cached = getLastKnownPosition()
    const maxAge = options.maximumAge ?? 8000
    if (cached && Date.now() - cached.updatedAt < maxAge) {
      resolve({
        coords: { latitude: cached.lat, longitude: cached.lng, accuracy: cached.accuracy },
        timestamp: cached.updatedAt,
      })
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
      ...options,
    })
  })
}

// Simple nearest-neighbor route optimization
export function optimizeRoute(customers, startLat, startLng) {
  if (!customers.length) return []
  const remaining = [...customers]
  const route = []
  let currentLat = startLat
  let currentLng = startLng

  while (remaining.length > 0) {
    let nearestIdx = 0
    let nearestDist = Infinity
    remaining.forEach((c, i) => {
      const d = getDistance(currentLat, currentLng, c.lat, c.lng)
      if (d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    })
    const next = remaining.splice(nearestIdx, 1)[0]
    route.push(next)
    currentLat = next.lat
    currentLng = next.lng
  }
  return route
}

// Total route distance in km
export function routeTotalDistance(route, startLat, startLng) {
  let total = 0
  let prevLat = startLat
  let prevLng = startLng
  for (const c of route) {
    total += getDistance(prevLat, prevLng, c.lat, c.lng)
    prevLat = c.lat
    prevLng = c.lng
  }
  return (total / 1000).toFixed(1)
}

/**
 * Reverse geocode lat/lng to get neighborhood/area name.
 * Uses Google Maps Geocoding API (already loaded for the app).
 * Returns the most specific named area — neighborhood first, then sublocality, then city.
 * Examples: "East New Orleans", "Metairie", "Mid-City", "Kenner"
 */
export async function reverseGeocodeArea(lat, lng) {
  try {
    // Use Google Maps Geocoder if available
    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder()
      const result = await new Promise((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results?.length > 0) resolve(results)
          else reject(new Error(status))
        })
      })

      // Priority: neighborhood > sublocality_level_1 > sublocality > locality (city)
      const typePriority = [
        'neighborhood',
        'sublocality_level_1',
        'sublocality',
        'locality',
        'administrative_area_level_3',
        'administrative_area_level_2',
      ]

      for (const type of typePriority) {
        for (const r of result) {
          const comp = r.address_components?.find(c => c.types.includes(type))
          if (comp) return comp.long_name
        }
      }
    }

    // Fallback: use free Nominatim (OpenStreetMap) reverse geocoding — no API key needed
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      { headers: { 'Accept-Language': 'en' } }
    )
    const data = await res.json()
    const a = data.address || {}
    // Return neighborhood > suburb > city_district > city
    return a.neighbourhood || a.suburb || a.city_district || a.quarter || a.city || a.town || a.county || ''
  } catch {
    return ''
  }
}
