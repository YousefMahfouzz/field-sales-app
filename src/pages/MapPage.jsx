import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { getCurrentPosition, findNearbyCustomers } from '../lib/geo'
import NearbyCustomerModal from '../components/NearbyCustomerModal'
import { loadGoogleMaps } from '../lib/mapsLoader'
import { getCustomerColor, applySmartFilter, SMART_FILTERS } from '../lib/customerAvailability'
import { showToast } from '../components/Toast'
import Icon from '../components/Icon'

// ── Exclude chain stores, medical offices, and big-box retailers ──
const EXCLUDED_NAMES = [
  // Gas station chains (not independent)
  'circle k', 'racetrac', 'racetrack', 'race trac', 'qt ', 'quiktrip', 'loves travel',
  'buc-ee', 'bucees', 'pilot travel', 'flying j', 'wawa', 'sheetz', 'speedway',
  'marathon', 'bp ', 'chevron', 'exxon', 'mobil', 'shell ', 'valero', 'citgo',
  'murphy usa', 'murphyusa', 'sams fuel', "sam's fuel", 'costco gas', 'kroger fuel',
  // Big-box grocery (not independent)
  'walmart', 'wal-mart', 'target', 'costco', 'sams club', "sam's club",
  'whole foods', 'trader joe', 'aldi', 'lidl', 'kroger', 'publix', 'safeway',
  'albertsons', 'winn-dixie', 'winn dixie', 'food lion',
  // Beauty chains (not beauty supply stores)
  'ulta', 'ultra beauty', 'sephora', 'sally beauty', 'bath & body',
  'bath and body', 'the body shop', 'bluemercury', 'morphe',
  // Medical / dermatology (not retail)
  'dermatolog', 'derma ', 'derm ', 'skin care clinic', 'skin clinic',
  'medical', 'doctor', ' md', ' m.d', 'physician', 'pediatr', 'dentist',
  'dental', 'orthodont', 'chiropract', 'optometr', 'ophthalmol',
  'urgent care', 'hospital', 'clinic', 'surgery center', 'medspa', 'med spa',
  // Pharmacy chains
  'cvs', 'walgreens', 'rite aid',
]
function isExcluded(name) {
  const n = (name || '').toLowerCase()
  return EXCLUDED_NAMES.some(b => n.includes(b))
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
  const mapHeaderRef = useRef(null)
  const [mapTop, setMapTop] = useState(108)
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

  useEffect(() => {
    if (mapHeaderRef.current) {
      const h = mapHeaderRef.current.offsetHeight
      setMapTop(h + 2)
    }
  }, [])
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
      showToast('Could not get location – enable GPS', 'error')
    } finally {
      setGpsLoading(false)
    }
  }

  const [searchRadius, setSearchRadius] = useState(3219) // meters, default 2 miles
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
        { type: 'convenience_store', label: '🏪', color: '#7c3aed' },
        { type: 'gas_station',       label: '⛽', color: '#f59e0b' },
        { type: 'grocery_or_supermarket', label: '🛒', color: '#16a34a' },
        { type: 'liquor_store',      label: '🍺', color: '#dc2626' },
        // Use keyword search for beauty supply stores (not salons/dermatologists)
        { keyword: 'beauty supply store', label: '💄', color: '#ec4899', typeTag: 'beauty_supply' },
      ]

      const mapDiv = document.createElement('div')
      const tempMap = new window.google.maps.Map(mapDiv, { center: { lat, lng }, zoom: 14 })
      const service = new window.google.maps.places.PlacesService(tempMap)
      const newMarkers = []

      await Promise.all(types.map(({ type, keyword, label, color, typeTag }) =>
        new Promise(resolve => {
          const req = { location: { lat, lng }, radius: searchRadius }
          if (keyword) req.keyword = keyword
          else req.type = type
          service.nearbySearch(req, (places, status) => {
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
                newMarkers.push({ name: place.name, type: typeTag || type, label })
              }
            }
            resolve()
          })
        })
      ))

      setPoiMarkers(newMarkers)
      setPoiVisible(true)

      if (newMarkers.length === 0) {
        const miles = (searchRadius / 1609).toFixed(1)
        showToast(`No stores within ${miles} mi – try larger radius`, 'warning')
        clearPoiMarkers()
      }
    } catch (e) {
      showToast('Search failed: ' + e.message, 'error')
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
      } catch { showToast('Could not get location', 'error') }
    } else {
      await searchPOIsAt(center.lat(), center.lng())
    }
  }



  return (
    <div style={{ position: 'relative', height: '100dvh', overflow: 'hidden' }}>
      {/* Header */}
      <div ref={mapHeaderRef} style={{
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
            {/* Radius selector — miles */}
            <select value={searchRadius} onChange={e => { setSearchRadius(Number(e.target.value)); if(poiVisible) clearPoiMarkers() }}
              style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)', fontWeight: 600 }}>
              <option value={805}>0.5 mi</option>
              <option value={1609}>1 mi</option>
              <option value={3219}>2 mi</option>
              <option value={4828}>3 mi</option>
              <option value={8047}>5 mi</option>
              <option value={16093}>10 mi</option>
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
          <div style={{ marginTop: 6, fontSize: 11, color: '#7c3aed', fontWeight: 600, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span>🏪 {poiMarkers.filter(p=>p.type==='convenience_store').length}</span>
            <span>⛽ {poiMarkers.filter(p=>p.type==='gas_station').length}</span>
            <span>🛒 {poiMarkers.filter(p=>p.type==='grocery_or_supermarket').length}</span>
            <span>🍺 {poiMarkers.filter(p=>p.type==='liquor_store').length}</span>
            <span>💄 {poiMarkers.filter(p=>p.type==='beauty_supply').length}</span>
            <span style={{ color: 'var(--text-muted)' }}>({poiMarkers.length} total)</span>
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
            top: mapTop,
            left: 0, right: 0, bottom: 0, width: '100%',
            touchAction: 'none',
          }}
        />
      )}

      {/* FAB: Find Nearby Stores */}
      <button
        onClick={handleFindNearby}
        disabled={poiLoading}
        style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 68px)',
          left: '50%',
          transform: 'translateX(-50%) translateZ(0)',
          zIndex: 40,
          background: poiVisible ? '#7c3aed' : 'white',
          color: poiVisible ? 'white' : '#7c3aed',
          border: poiVisible ? 'none' : '2px solid #7c3aed',
          borderRadius: 28,
          padding: '10px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          whiteSpace: 'nowrap',
          fontFamily: 'var(--font)',
        }}
      >
        {poiLoading ? '🔍 Searching...' : poiVisible ? '✕ Clear Stores' : '🔍 Find Nearby Stores'}
      </button>

      {/* FAB: Add Customer */}
      <button className="fab" onClick={handleCheckInHere} disabled={gpsLoading}>
        {gpsLoading ? 'Getting location...' : '+ Add Customer Here'}
      </button>


      {/* Customer popup */}
      {selectedCustomer && (() => {
        const { color, label } = getCustomerColor(selectedCustomer)
        return (
          <div style={{
            position: 'absolute',
            bottom: 'calc(var(--nav-height) + var(--safe-bottom) + 12px)',
            left: 12, right: 12, zIndex: 100,
            background: '#ffffff',
            borderRadius: 18,
            padding: 16,
            boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)',
            borderTop: `4px solid ${color}`,
          }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 10 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <h3 style={{ fontSize: 17, fontWeight: 800, color:'#14171e', lineHeight:1.2, marginBottom: 2 }}>
                  {selectedCustomer.business_name || selectedCustomer.full_name}
                </h3>
                {selectedCustomer.business_name && (
                  <p style={{ fontSize: 13, color:'#4a5260', fontWeight:500 }}>{selectedCustomer.full_name}</p>
                )}
              </div>
              <button onClick={() => setSelectedCustomer(null)}
                style={{ background:'#f4f6f9', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:8, color:'#7a8394' }}>
                <Icon name="close" size={14} />
              </button>
            </div>

            {/* Status + next visit */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
              <span style={{ fontSize:11, fontWeight:700, color, background: color + '18', padding:'3px 10px', borderRadius:20 }}>
                {label}
              </span>
              {selectedCustomer.next_visit_date && (
                <span style={{ fontSize:12, color:'#7a8394', fontWeight:500 }}>
                  {new Date(selectedCustomer.next_visit_date + 'T00:00:00').toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                </span>
              )}
              {selectedCustomer.area && (
                <span style={{ fontSize:12, color:'#7a8394' }}>· {selectedCustomer.area}</span>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display:'flex', gap:8 }}>
              {selectedCustomer.phone && (
                <a href={`tel:${selectedCustomer.phone}`}
                  onClick={e => e.stopPropagation()}
                  style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 0', borderRadius:10, border:'1.5px solid #d4d8e0', background:'white', textDecoration:'none', color:'#14171e', fontWeight:700, fontSize:13 }}>
                  <Icon name="phone" size={15} color="#3563e9" /> Call
                </a>
              )}
              <button onClick={() => navigate(`/visit/${selectedCustomer.id}`)}
                style={{ flex:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 0', borderRadius:10, border:'none', background:'#3563e9', color:'white', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                <Icon name="check" size={15} color="white" /> Log Visit
              </button>
              <button onClick={() => navigate(`/customers/${selectedCustomer.id}`)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 0', borderRadius:10, border:'1.5px solid #d4d8e0', background:'white', color:'#14171e', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                <Icon name="user" size={15} /> Info
              </button>
            </div>
          </div>
        )
      })()}

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
