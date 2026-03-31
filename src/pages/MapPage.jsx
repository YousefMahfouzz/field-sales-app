import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { getCurrentPosition, findNearbyCustomers } from '../lib/geo'
import NearbyCustomerModal from '../components/NearbyCustomerModal'
import { loadGoogleMaps } from '../lib/mapsLoader'

const EXCLUDED_NEARBY = ['circle k', 'circlek']
function isExcluded(name) {
  const n = (name || '').toLowerCase().replace(/\s/g, '')
  return EXCLUDED_NEARBY.some(b => n.includes(b.replace(/\s/g, '')))
}

const STATUS_COLORS = {
  active: '#16a34a',
  priority: '#d97706',
  follow_up: '#2563eb',
  avoid: '#dc2626',
  do_not_visit: '#6b7280',
}

const STATUS_ICONS = {
  active: '🟢',
  priority: '🟡',
  follow_up: '🔵',
  avoid: '🔴',
  do_not_visit: '⚫',
}

export default function MapPage() {
  const mapRef = useRef(null)
  const mapInstance = useRef(null)
  const markersRef = useRef([])
  const { customers } = useCustomers()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('all')
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
        mapInstance.current.setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      })
    }).catch(() => setMapError('Failed to load Google Maps.'))
  }, [])

  // Re-draw markers when customers or filter changes
  useEffect(() => {
    if (!mapReady || !mapInstance.current) return
    markersRef.current.forEach((m) => m.setMap(null))
    markersRef.current = []

    const visible = statusFilter === 'all' ? customers : customers.filter((c) => c.status === statusFilter)

    visible.forEach((customer) => {
      if (!customer.lat || !customer.lng) return
      const color = STATUS_COLORS[customer.status] || '#6b7280'
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
  }, [customers, statusFilter, mapReady])

  const handleCheckInHere = async () => {
    setGpsLoading(true)
    try {
      const pos = await getCurrentPosition()
      const { latitude: lat, longitude: lng } = pos.coords
      setCapturedLocation({ lat, lng })
      mapInstance.current?.panTo({ lat, lng })
      const nearby = findNearbyCustomers(customers, lat, lng, 20)
      if (nearby.length > 0) setNearbyCustomers(nearby)
      else navigate(`/customers/new?lat=${lat}&lng=${lng}`)
    } catch {
      alert('Could not get location.')
    } finally {
      setGpsLoading(false)
    }
  }

  const clearPoiMarkers = useCallback(() => {
    poiMarkersRef.current.forEach(m => m.setMap(null))
    poiMarkersRef.current = []
    setPoiVisible(false)
  }, [])

  const handleFindNearby = async () => {
    if (poiVisible) { clearPoiMarkers(); return }
    if (!mapInstance.current) return
    setPoiLoading(true)
    try {
      const pos = await getCurrentPosition()
      const { latitude: lat, longitude: lng } = pos.coords
      mapInstance.current.panTo({ lat, lng })
      mapInstance.current.setZoom(15)

      const types = [
        { type: 'gas_station', label: '⛽', color: '#f59e0b' },
        { type: 'beauty_salon', label: '💄', color: '#ec4899' },
      ]
      const newMarkers = []

      // Use PlacesService (CORS-safe) instead of REST fetch (CORS-blocked)
      const mapDiv = document.createElement('div')
      const tempMap = new window.google.maps.Map(mapDiv, { center: { lat, lng }, zoom: 15 })
      const service = new window.google.maps.places.PlacesService(tempMap)

      await Promise.all(types.map(({ type, label, color }) =>
        new Promise(resolve => {
          service.nearbySearch({ location: { lat, lng }, radius: 1500, type }, (places, status) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && places) {
              for (const place of places.slice(0, 10)) {
                if (isExcluded(place.name)) continue
                const marker = new window.google.maps.Marker({
                  position: place.geometry.location,
                  map: mapInstance.current,
                  title: place.name,
                  icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: color, fillOpacity: 0.9,
                    strokeColor: 'white', strokeWeight: 2,
                  },
                  label: { text: label, fontSize: '14px' },
                  zIndex: 5,
                })
                const infoWindow = new window.google.maps.InfoWindow({
                  content: `<div style="font-family:sans-serif;padding:4px 2px;max-width:200px"><strong style="font-size:14px">${place.name}</strong><br/><span style="color:#64748b;font-size:12px">${place.vicinity || ''}</span>${place.rating ? `<br/><span style="font-size:12px">⭐ ${place.rating}</span>` : ''}</div>`,
                })
                marker.addListener('click', () => infoWindow.open(mapInstance.current, marker))
                poiMarkersRef.current.push(marker)
                newMarkers.push({ name: place.name, type })
              }
            }
            resolve()
          })
        })
      ))
      setPoiMarkers(newMarkers)
      setPoiVisible(true)
    } catch { alert('Could not get location.') }
    finally { setPoiLoading(false) }
  }

  return (
    <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Header — fixed at top, measured height ~110px */}
      <div id="map-header" style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'white', borderBottom: '1px solid var(--border)',
        padding: '12px 16px 10px',
      }}>
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 18 }}>Map</h1>
          <span className="text-sm text-muted">{customers.length} customers</span>
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {['all', 'active', 'priority', 'follow_up', 'avoid'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 20,
                border: '1.5px solid',
                borderColor: statusFilter === s ? 'var(--blue)' : 'var(--border)',
                background: statusFilter === s ? 'var(--blue)' : 'white',
                color: statusFilter === s ? 'white' : 'var(--text)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {s !== 'all' && STATUS_ICONS[s]} {s === 'all' ? 'All' : s.replace('_', ' ')}
            </button>
          ))}
        </div>
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
            top: 110,     /* matches header height */
            left: 0,
            right: 0,
            bottom: 0,    /* fills to bottom of screen */
            width: '100%',
          }}
        />
      )}

      {/* FAB: Add Customer */}
      <button className="fab" onClick={handleCheckInHere} disabled={gpsLoading} style={{ bottom: 90 }}>
        {gpsLoading ? '📡...' : '📍 Add Customer Here'}
      </button>

      {/* FAB: Find Nearby POI */}
      <button
        onClick={handleFindNearby}
        disabled={poiLoading}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 20,
          padding: '11px 18px', borderRadius: 28, border: 'none', cursor: 'pointer',
          fontSize: 14, fontWeight: 700,
          background: poiVisible ? '#7c3aed' : 'white',
          color: poiVisible ? 'white' : '#374151',
          boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'all 0.2s',
        }}
      >
        {poiLoading ? '🔍 Searching...' : poiVisible ? `⛽💄 Hide (${poiMarkersRef.current.length})` : '⛽💄 Find Nearby'}
      </button>

      {/* Customer popup */}
      {selectedCustomer && (
        <div style={{
          position: 'absolute', bottom: 'calc(var(--nav-height) + 90px)',
          left: 16, right: 16, zIndex: 50,
          background: 'white', borderRadius: 16, padding: 16,
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
