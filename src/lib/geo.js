// Haversine formula: distance in meters between two GPS coords
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
export function findNearbyCustomers(customers, lat, lng, radiusMeters = 20) {
  return customers.filter((c) => {
    const dist = getDistance(lat, lng, c.lat, c.lng)
    return dist <= radiusMeters
  })
}

// Get current GPS position as a promise
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
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
