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
 * Check if a place is open. Only skip if explicitly closed (open_now === false).
 * nearbySearch returns opening_hours.open_now as a boolean, NOT isOpen() function.
 */
function checkOpenStatus(place) {
  if (!place.opening_hours) {
    return { isOpenOrSoon: true, openingSoon: false, opensIn: null }
  }
  // open_now is a simple boolean from nearbySearch
  if (place.opening_hours.open_now === false) {
    return { isOpenOrSoon: false, openingSoon: false, opensIn: null }
  }
  return { isOpenOrSoon: true, openingSoon: false, opensIn: null }
}

// Uses Google Maps JS PlacesService (CORS-safe, works in browser)
async function searchNearbyViaPlacesService(lat, lng, radius = 300) {
  return new Promise((resolve) => {
    if (!window.google?.maps?.places) { resolve([]); return }

    const mapDiv = document.createElement('div')
    const tempMap = new window.google.maps.Map(mapDiv, { center: { lat, lng }, zoom: 15 })
    const service = new window.google.maps.places.PlacesService(tempMap)

    const searches = [
      { type: 'convenience_store' },
      { type: 'grocery_or_supermarket' },
      { keyword: 'grocery store', typeTag: 'grocery_or_supermarket' },
      { keyword: 'smoke shop', typeTag: 'smoke_shop' },
      { keyword: 'vape shop', typeTag: 'smoke_shop' },
      { keyword: 'beauty supply store', typeTag: 'beauty_salon' },
      { type: 'gas_station' },
    ]
    const results = []
    let remaining = searches.length

    searches.forEach(({ type, keyword, typeTag }) => {
      const req = { location: { lat, lng }, radius }
      if (keyword) req.keyword = keyword
      else req.type = type
      const tag = typeTag || type
      service.nearbySearch(req, (places, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && places) {
          for (const p of places.slice(0, 10)) {
            if (isBrandExcluded(p.name)) continue
            if (results.find(r => r.name === p.name)) continue

            // Filter closed stores (with 30-min grace for opening soon)
            const { isOpenOrSoon, openingSoon, opensIn } = checkOpenStatus(p)
            if (!isOpenOrSoon) continue

            results.push({
              name: p.name,
              address: p.vicinity,
              type: tag,
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
          const ORDER = { convenience_store: 0, grocery_or_supermarket: 1, smoke_shop: 2, beauty_salon: 3, gas_station: 4 }
          results.sort((a, b) => (ORDER[a.type] - ORDER[b.type]) || (a.distance - b.distance))
          resolve(results.slice(0, 12))
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
  grocery_or_supermarket: '🛒 Grocery',
  smoke_shop: '💨 Smoke / Vape Shop',
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
