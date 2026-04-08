import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { getCurrentPosition, findNearbyCustomers } from '../lib/geo'
import NearbyCustomerModal from '../components/NearbyCustomerModal'
import { loadGoogleMaps } from '../lib/mapsLoader'
import { getCustomerColor, applySmartFilter, SMART_FILTERS } from '../lib/customerAvailability'

const EXCLUDED_NEARBY = ['circle k', 'circlek']
function isExcluded(name) {
  const n = (name || '').toLowerCase().replace(/\s/g, '')
  return EXCLUDED_NEARBY.some(b => n.includes(b.replace(/\s/g, '')))
}

const STATUS_COLORS = {
  active: '#16a34a',
  priority: '#d97706',
  follow_up: '#0891b2',
  avoid: '#dc2626',
  do_not_visit: '#6b7280',
}


export default function MapPage() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const { customers } = useCustomers()
  const navigate = useNavigate()
  const [smartFilter, setSmartFilter] = useState('all')
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [nearbyCustomers, setNearbyCustomers] = useState([])
  const [capturedLocation, setCapturedLocation] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  const [poiLoading, setPoiLoading] = useState(false)
  const [poiMarkers, setPoiMarkers] = useState([])
  const [poiVisible, setPoiVisible] = useState(false)
  const poiMarkersRef = useRef([])
  const [mapError, setMapError] = useState('')
  const currentLocMarker = useRef(null)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    if (!apiKey) {
      setMapError('Google Maps API key not configured.')
      return
    }
    loadGoogleMaps().then((ok) => {
      if (!ok || !mapRef.current) return
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 25.2048, lng: 55.2708 },
        zoom: 12,
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM,
        },
        styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }],
      })
      setMapReady(true)
      // Trigger resize so map knows its actual pixel dimensions
      window.google.maps.event.trigger(mapInstance.current, 'resize')
      navigator.geolocation?.getCurrentPosition((pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        mapInstance.current.setCenter({ lat, lng })
        // Blue dot for current location
        currentLocMarker.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance.current,
          title: 'You are here',
          zIndex: 999,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#2563eb',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          },
        })
      })
    }).catch(() => setMapError('Failed to load Google Maps.'))
  }, [])

  // Re-draw markers when customers or filter changes
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    // applySmartFilter handles all logic; 'all' now includes avoid customers
    let visible = applySmartFilter(customers, smartFilter)

    visible.forEach((customer) => {
      if (!customer.lat || !customer.lng) return
      const { color } = getCustomerColor(customer)
      const marker = new window.google.maps.Marker({
        position: { lat: customer.lat, lng: customer.lng },
        map: mapInstance.current,
        title: customer.full_name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      })
      marker.addListener('click', () => setSelectedCustomer(customer))
      markersRef.current.push(marker)
    })
  }, [customers, smartFilter, mapReady])

  const handleCheckInHere = async () => {
    setGpsLoading(true)
    try {
      const pos = await getCurrentPosition()
      const { latitude: lat, longitude: lng } = pos.coords
      setCapturedLocation({ lat, lng })
      mapInstance.current?.panTo({ lat, lng })
      const nearby = findNearbyCustomers(customers, lat, lng, 250)
      if (nearby.length > 0) setNearbyCustomers(nearby)
      else navigate(`/customers/new?lat=${lat}&lng=${lng}`)
    } catch {
      alert('Could not get location.')
    } finally {
      setGpsLoading(false)
    }
  }

  const [searchRadius, setSearchRadius] = useState(3000) // meters, default 3km
  const [searchCenter, setSearchCenter] = useState(null) // tapped point or current location
  const searchCircleRef = useRef(null) // circle showing search radius

  const clearPoiMarkers = useCallback(() => {
    poiMarkersRef.current.forEach(m => m.setMap(null))
    poiMarkersRef.current = []
    setPoiVisible(false)
    setPoiMarkers([])
    if (searchCircleRef.current) { searchCircleRef.current.setMap(null); searchCircleRef.current = null }
  }, [])

  // Search for POIs around a given lat/lng
  const searchPOIsAt = useCallback(async (lat, lng) => {
    if (!mapInstance.current) return
    setPoiLoading(true)
    clearPoiMarkers()

    try {
      setSearchCenter({ lat, lng })
      mapInstance.current.panTo({ lat, lng })

      // Draw a circle showing the search radius
      if (searchCircleRef.current) searchCircleRef.current.setMap(null)
      searchCircleRef.current = new window.google.maps.Circle({
        center: { lat, lng },
        radius: searchRadius,
        map: mapInstance.current,
        strokeColor: '#2563eb',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        fillColor: '#2563eb',
        fillOpacity: 0.06,
      })

      // Auto-zoom to fit the circle
      mapInstance.current.fitBounds(searchCircleRef.current.getBounds())

      const types = [
        { type: 'gas_station',     label: '⛽', color: '#f59e0b' },
        { type: 'convenience_store', label: '🏪', color: '#7c3aed' },
        { type: 'beauty_salon',    label: '💄', color: '#ec4899' },
      ]

      const mapDiv = document.createElement('div')
      const tempMap = new window.google.maps.Map(mapDiv, { center: { lat, lng }, zoom: 14 })
      const service = new window.google.maps.places.PlacesService(tempMap)
      const newMarkers = []

      await Promise.all(types.map(({ type, label, color }) =>
        new Promise(resolve => {
          service.nearbySearch({ location: { lat, lng }, radius: searchRadius, type }, (places, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && places) {
              for (const place of places.slice(0, 20)) {
                if (isExcluded(place.name)) continue
                const marker = new window.google.maps.Marker({
                  position: place.geometry.location,
                  map: mapInstance.current,
                  title: place.name,
                  icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 11,
                    fillColor: color, fillOpacity: 0.95,
                    strokeColor: 'white', strokeWeight: 2.5,
                  },
                  label: { text: label, fontSize: '13px' },
                  zIndex: 10,
                })
                const infoWindow = new window.google.maps.InfoWindow({
                  content: `<div style="font-family:sans-serif;padding:6px 4px;max-width:220px">
                    <strong style="font-size:14px">${place.name}</strong><br/>
                    <span style="color:#64748b;font-size:12px">${place.vicinity || ''}</span>
                    ${place.rating ? `<br/><span style="font-size:12px">⭐ ${place.rating}</span>` : ''}
                    <br/><button onclick="window.open('https://www.google.com/maps/search/?q=${encodeURIComponent(place.name)}')" 
                      style="margin-top:6px;padding:4px 10px;border-radius:6px;border:none;background:#2563eb;color:white;cursor:pointer;font-size:12px">
                      View on Maps
                    </button>
                  </div>`,
                })
                marker.addListener('click', () => infoWindow.open(mapInstance.current, marker))
                poiMarkersRef.current.push(marker)
                newMarkers.push({ name: place.name, type, label })
              }
            }
            resolve()
          })
        })
      ))

      setPoiMarkers(newMarkers)
      setPoiVisible(true)

      if (newMarkers.length === 0) {
        alert(`No gas stations, convenience stores or beauty salons found within ${searchRadius >= 1000 ? (searchRadius/1000).toFixed(1)+'km' : searchRadius+'m'}. Try a larger radius.`)
        clearPoiMarkers()
      }
    } catch (e) {
      alert('Search failed: ' + e.message)
    } finally {
      setPoiLoading(false)
    }
  }, [searchRadius, clearPoiMarkers])

  const handleFindNearby = async () => {
    if (poiVisible) { clearPoiMarkers(); return }
    if (!mapInstance.current) return
    // Use map center — already on your location, no GPS hang
    const center = mapInstance.current.getCenter()
    if (!center) {
      try {
        const pos = await getCurrentPosition()
        await searchPOIsAt(pos.coords.latitude, pos.coords.longitude)
      } catch { alert('Could not get location.') }
    } else {
      await searchPOIsAt(center.lat(), center.lng())
    }
  }



  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div id="map-header" style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'var(--white)', borderBottom: '1px solid var(--border)',
        padding: '10px 16px 8px',
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <h1 style={{ fontSize: 18 }}>Map</h1>
            <button onClick={() => navigate('/route')}
              style={{ padding:'5px 12px', borderRadius:20, border:'1.5px solid var(--blue)', background:'var(--blue-light)', color:'var(--blue)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
              🗺️ Trip Planner
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Radius selector */}
            <select value={searchRadius} onChange={e => { setSearchRadius(Number(e.target.value)); if(poiVisible) clearPoiMarkers() }}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 600 }}>
              <option value={1000}>1 km</option>
              <option value={2000}>2 km</option>
              <option value={3000}>3 km</option>
              <option value={5000}>5 km</option>
              <option value={8000}>8 km</option>
              <option value={16000}>10 mi</option>
            </select>
            <span style={{ fontSize:13, color:'var(--text-muted)' }}>{customers.length} customers</span>
          </div>
        </div>

        {/* Smart filter pills */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none' }}>
          {SMART_FILTERS.map(f => {
            const isAvailNow = f.id === 'available_now'
            const isActive = smartFilter === f.id
            return (
              <button key={f.id} onClick={() => setSmartFilter(f.id)} style={{
                flexShrink:0, padding:'5px 12px', borderRadius:20, cursor:'pointer',
                fontSize:12, fontWeight:700, whiteSpace:'nowrap', transition:'all 0.15s',
                border: isAvailNow && !isActive ? '2px solid #f59e0b' : '1.5px solid transparent',
                background: isActive
                  ? (isAvailNow ? '#f59e0b' : 'var(--blue)')
                  : 'var(--gray-light)',
                color: isActive ? 'white' : (isAvailNow ? '#92400e' : 'var(--text)'),
                fontWeight: isAvailNow ? 800 : 600,
              }}>
                {f.label}
              </button>
            )
          })}
        </div>

        {/* Hint when POIs visible */}
        {poiVisible && (
          <div style={{ marginTop: 6, fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>
            ⛽ {poiMarkers.filter(p=>p.type==='gas_station').length} gas &nbsp;
            🏪 {poiMarkers.filter(p=>p.type==='convenience_store').length} convenience &nbsp;
            💄 {poiMarkers.filter(p=>p.type==='beauty_salon').length} beauty
          </div>
        )}
      </div>

      {/* Map — fills the space BELOW the header using absolute inset */}
      {mapError ? (
        <div style={{ position:'absolute', inset:0, paddingTop:110, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:32, textAlign:'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🗺️</div>
          <p style={{ color: 'var(--red)', fontSize: 15, marginBottom: 8 }}>{mapError}</p>
          <p className="text-muted text-sm">Map API key not configured.</p>
        </div>
      ) : (
        <div
          ref={mapRef}
          style={{
            position: 'absolute',
            top: 120,
            left: 0, right: 0, bottom: 0, width: '100%',
          }}
        />
      )}

      {/* FAB: Add Customer */}
      <button className="fab" onClick={handleCheckInHere} disabled={gpsLoading} style={{ bottom: 90 }}>
        {gpsLoading ? '📡...' : '📍 Add Customer Here'}
      </button>


      {/* Customer popup */}
      {selectedCustomer && (
        <div style={{
          position: 'absolute', bottom: 'calc(var(--nav-height) + 90px)',
          left: 16, right: 16, zIndex: 50,
          background: 'var(--white)', borderRadius: 16, padding: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
            <div>
              <h3 style={{ fontSize: 16 }}>{selectedCustomer.full_name}</h3>
              {selectedCustomer.business_name && <p className="text-sm text-muted">{selectedCustomer.business_name}</p>}
            </div>
            <button onClick={() => setSelectedCustomer(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', padding: 4 }}>✕</button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span className={`badge badge-${selectedCustomer.status}`} style={{ fontSize: 12 }}>
              {selectedCustomer.status?.replace('_', ' ')}
            </span>
            {selectedCustomer.next_visit_date && (
              <span className="text-xs text-muted" style={{ display: 'flex', alignItems: 'center' }}>
                📅 {new Date(selectedCustomer.next_visit_date).toLocaleDateString()}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {selectedCustomer.phone && (
              <a href={`tel:${selectedCustomer.phone}`} className="btn btn-ghost btn-sm" onClick={(e) => e.stopPropagation()}>📞 Call</a>
            )}
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/visit/${selectedCustomer.id}`)}>✅ Visit</button>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/customers/${selectedCustomer.id}`)}>👤 Profile</button>
          </div>
        </div>
      )}

      {/* Nearby modal */}
      {nearbyCustomers.length > 0 && capturedLocation && (
        <NearbyCustomerModal
          customers={nearbyCustomers}
          onUseExisting={(c) => navigate(`/customers/${c.id}`)}
          onLogVisit={(c) => navigate(`/visit/${c.id}`)}
          onCreateNew={() => navigate(`/customers/new?lat=${capturedLocation.lat}&lng=${capturedLocation.lng}`)}
          onClose={() => setNearbyCustomers([])}
        />
      )}
    </div>
  )
}
