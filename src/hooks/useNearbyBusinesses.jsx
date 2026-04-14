import { useState, useCallback } from 'react'
import { loadGoogleMaps } from '../lib/mapsLoader'

const EXCLUDED_BRANDS = ['circle k', 'circlek']
function isBrandExcluded(name) {
  const n = (name || '').toLowerCase().replace(/\s/g, '')
  return EXCLUDED_BRANDS.some(b => n.includes(b.replace(/\s/g, '')))
}

function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)))
}

/**
 * Check if a place is open or opens within 30 minutes.
 * Returns { isOpenOrSoon: boolean, openingSoon: boolean, opensIn: number|null }
 */
function checkOpenStatus(place) {
  // opening_hours may not be available for all places
  if (!place.opening_hours) {
    // If no hours data, assume open (don't filter out)
    return { isOpenOrSoon: true, openingSoon: false, opensIn: null }
  }

  // If currently open, show it
  if (place.opening_hours.isOpen?.()) {
    return { isOpenOrSoon: true, openingSoon: false, opensIn: null }
  }

  // Try to check if it opens within 30 minutes
  // opening_hours.periods gives us the weekly schedule
  if (place.opening_hours.periods) {
    const now = new Date()
    const day = now.getDay() // 0=Sun, 6=Sat
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    for (const period of place.opening_hours.periods) {
      if (period.open && period.open.day === day) {
        const openMinutes = period.open.hours * 60 + period.open.minutes
        const diff = openMinutes - nowMinutes
        if (diff > 0 && diff <= 30) {
          return { isOpenOrSoon: true, openingSoon: true, opensIn: diff }
        }
      }
    }
  }

  // Closed and not opening soon
  return { isOpenOrSoon: false, openingSoon: false, opensIn: null }
}

// Uses Google Maps JS PlacesService (CORS-safe, works in browser)
async function searchNearbyViaPlacesService(lat, lng, radius = 300) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places) { resolve([]); return }

    const mapDiv = document.createElement('div')
    const tempMap = new window.google.maps.Map(mapDiv, { center: { lat, lng }, zoom: 15 })
    const service = new window.google.maps.places.PlacesService(tempMap)

    const types = ['convenience_store', 'gas_station', 'beauty_salon']
    const results = []
    let remaining = types.length

    types.forEach(type => {
      service.nearbySearch({
        location: { lat, lng },
        radius,
        type,
      }, (places, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && places) {
          for (const p of places.slice(0, 5)) {
            if (isBrandExcluded(p.name)) continue
            if (results.find(r => r.name === p.name)) continue

            // Filter closed stores (with 30-min grace for opening soon)
            const { isOpenOrSoon, openingSoon, opensIn } = checkOpenStatus(p)
            if (!isOpenOrSoon) continue

            results.push({
              name: p.name,
              address: p.vicinity,
              type,
              rating: p.rating,
              distance: getDistance(lat, lng, p.geometry.location.lat(), p.geometry.location.lng()),
              placeId: p.place_id,
              openingSoon,
              opensIn,
            })
          }
        }
        remaining--
        if (remaining === 0) {
          const ORDER = { convenience_store: 0, gas_station: 1, beauty_salon: 2 }
          results.sort((a, b) => (ORDER[a.type] - ORDER[b.type]) || (a.distance - b.distance))
          resolve(results.slice(0, 5))
        }
      })
    })
  })
}

export function useNearbyBusinesses() {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchNearby = useCallback(async (lat, lng) => {
    if (!lat || !lng) return
    setLoading(true); setSuggestions([])
    try {
      await loadGoogleMaps()
      const results = await searchNearbyViaPlacesService(lat, lng, 300)
      setSuggestions(results)
    } catch (err) {
      console.error('Nearby search error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return { suggestions, loading, fetchNearby, clearSuggestions: () => setSuggestions([]) }
}

const TYPE_LABELS = {
  gas_station: '⛽ Gas Station',
  convenience_store: '🏪 Convenience Store',
  beauty_salon: '💄 Beauty Supply',
}

export function NearbyBusinessSuggestions({ suggestions, loading, onSelect }) {
  if (!loading && suggestions.length === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
        📍 Nearby — tap to auto-fill:
      </p>
      {loading && (
        <div style={{ padding: '10px 14px', background: 'var(--gray-light)', borderRadius: 10, fontSize: 14, color: 'var(--text-muted)' }}>
          Searching nearby...
        </div>
      )}
      {suggestions.map((biz, i) => (
        <div key={i} onClick={() => onSelect(biz)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6,
            background: 'white', borderRadius: 10, border: '1.5px solid var(--border)', cursor: 'pointer' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{biz.name}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {TYPE_LABELS[biz.type]} · {biz.distance}m{biz.rating ? ` · ⭐${biz.rating}` : ''}
              {biz.openingSoon && <span style={{ color: '#d97706', fontWeight: 600 }}> · Opens in {biz.opensIn} min</span>}
            </p>
          </div>
          <span style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, flexShrink: 0 }}>Use →</span>
        </div>
      ))}
    </div>
  )
}
