import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { getCurrentPosition, findNearbyCustomers } from '../lib/geo'
import NearbyCustomerModal from '../components/NearbyCustomerModal'
import { loadGoogleMaps } from '../lib/mapsLoader'
import { getCustomerColor, applySmartFilter, SMART_FILTERS } from '../lib/customerAvailability'
import { showToast } from '../components/Toast'
import Icon from '../components/Icon'

// ── Exclude corporate chains, medical offices, and big-box retailers ──
// NOTE: Shell, Chevron, Exxon, Valero, Citgo, Marathon, BP are NOT excluded
// because many Gulf Coast gas stations under these brands are independently owned.
const EXCLUDED_NAMES = [
  // Corporate-operated gas station chains (never independent)
  'circle k', 'racetrac', 'racetrack', 'race trac', 'qt ', 'quiktrip', 'loves travel',
  'buc-ee', 'bucees', 'pilot travel', 'flying j', 'wawa', 'sheetz', 'speedway',
  'murphy usa', 'murphyusa', 'sams fuel', "sam's fuel", 'costco gas', 'kroger fuel',
  // Big-box grocery (not independent)
  'walmart', 'wal-mart', 'target', 'costco', 'sams club', "sam's club",
  'whole foods', 'trader joe', 'aldi', 'lidl', 'kroger', 'publix', 'safeway',
  'albertsons', 'winn-dixie', 'winn dixie', 'food lion',
  // Beauty chains (not beauty supply stores)
  'ulta ', 'ulta beauty', 'sephora', 'sally beauty', 'bath & body',
  'bath and body', 'the body shop', 'bluemercury', 'morphe',
  // Medical / dermatology (not retail)
  'dermatolog', 'derma ', 'derm ', 'skin care clinic', 'skin clinic',
  'medical center', 'doctor', ' md', ' m.d', 'physician', 'pediatr', 'dentist',
  'dental', 'orthodont', 'chiropract', 'optometr', 'ophthalmol',
  'urgent care', 'hospital', 'surgery center', 'medspa', 'med spa',
  // Pharmacy chains
  'cvs', 'walgreens', 'rite aid',
  // Wine-only stores
  'wine bar', 'wine shop', 'wine cellar', 'wine merchant', 'wine house',
  'wine & spirits', 'wine and spirits', 'wine boutique', 'wine store',
  'total wine', 'spec\'s', 'binny\'s',
  // Hair extension / wig suppliers (not beauty supply retail)
  'hair extension', 'hair extensions', 'wig ', 'wigs ', 'wig outlet',
  'hair wholesale', 'hair vendor', 'hair distributor', 'lace front',
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
  const [poiMarkers, setPoiMarkers] = useState([]) // { name, type, label, lat, lng, vicinity, rating }
  const [poiVisible, setPoiVisible] = useState(false)
  const poiMarkersRef = useRef([])
  const [mapError, setMapError] = useState('')
  const currentLocMarker = useRef(null)
  const activeInfoWindow = useRef(null) // track open info window to auto-close
  const [selectedPoi, setSelectedPoi] = useState(null) // tapped POI store
  const [selectedPois, setSelectedPois] = useState([]) // stores selected for route

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
      marker.addListener('click', () => { setSelectedPoi(null); setSelectedCustomer(customer) })
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
    setSelectedPoi(null)
    setSelectedPois([])
    if (activeInfoWindow.current) { activeInfoWindow.current.close(); activeInfoWindow.current = null }
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
        { type: 'liquor_store',      label: '🏬', color: '#dc2626' },
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
                const plat = place.geometry.location.lat()
                const plng = place.geometry.location.lng()
                const poiData = {
                  name: place.name,
                  type: typeTag || type,
                  label,
                  lat: plat,
                  lng: plng,
                  vicinity: place.vicinity || '',
                  rating: place.rating || null,
                }
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
                marker.addListener('click', () => {
                  // Close any previous customer popup
                  setSelectedCustomer(null)
                  // Show POI popup
                  setSelectedPoi(poiData)
                })
                poiMarkersRef.current.push(marker)
                newMarkers.push(poiData)
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
            <span>🏬 {poiMarkers.filter(p=>p.type==='liquor_store').length}</span>
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

      {/* ── BOTTOM STACK (from bottom up): nav → route bar → Find Nearby → Add Customer → popups ── */}

      {/* Selected stores route bar — compact strip right above bottom nav */}
      {selectedPois.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 'calc(var(--nav-height) + var(--safe-bottom))',
          left: 0, right: 0, zIndex: 55,
          background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
          padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>
              {selectedPois.length} store{selectedPois.length !== 1 ? 's' : ''} selected
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedPois.map(p => p.name.split(' ').slice(0,2).join(' ')).join(', ')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setSelectedPois([])}
              style={{ padding: '8px 12px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
              Clear
            </button>
            <button onClick={() => {
              const origin = searchCenter
                ? `${searchCenter.lat},${searchCenter.lng}`
                : `${selectedPois[0].lat},${selectedPois[0].lng}`
              const lastStop = selectedPois[selectedPois.length - 1]
              const destination = `${lastStop.lat},${lastStop.lng}`
              const waypoints = selectedPois.slice(0, -1)
                .map(p => `${p.lat},${p.lng}`)
                .join('|')
              let url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
              if (waypoints) url += `&waypoints=${encodeURIComponent(waypoints)}`
              window.open(url, '_blank')
            }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'white', color: '#7c3aed', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
              🗺️ Route
            </button>
          </div>
        </div>
      )}

      {/* FAB row: Find Nearby + Add Customer side by side */}
      <div style={{
        position: 'fixed',
        bottom: selectedPois.length > 0
          ? 'calc(var(--nav-height) + var(--safe-bottom) + 56px)'
          : 'calc(var(--nav-height) + var(--safe-bottom) + 12px)',
        left: '50%',
        transform: 'translateX(-50%) translateZ(0)',
        zIndex: 40,
        display: 'flex', gap: 8,
        transition: 'bottom 0.2s ease',
      }}>
        <button
          onClick={handleFindNearby}
          disabled={poiLoading}
          style={{
            background: poiVisible ? '#7c3aed' : 'white',
            color: poiVisible ? 'white' : '#7c3aed',
            border: poiVisible ? 'none' : '2px solid #7c3aed',
            borderRadius: 28,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font)',
          }}
        >
          {poiLoading ? '🔍...' : poiVisible ? '✕ Clear' : '🔍 Find Stores'}
        </button>
        <button
          onClick={handleCheckInHere}
          disabled={gpsLoading}
          style={{
            background: 'var(--blue)',
            color: 'white',
            border: 'none',
            borderRadius: 28,
            padding: '10px 16px',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(53,99,233,0.4)',
            whiteSpace: 'nowrap',
            fontFamily: 'var(--font)',
          }}
        >
          {gpsLoading ? '📡...' : '+ Add Customer'}
        </button>
      </div>

      {/* Customer popup — above FABs */}
      {selectedCustomer && !selectedPoi && (() => {
        const { color, label } = getCustomerColor(selectedCustomer)
        const popupBottom = selectedPois.length > 0
          ? 'calc(var(--nav-height) + var(--safe-bottom) + 108px)'
          : 'calc(var(--nav-height) + var(--safe-bottom) + 60px)'
        return (
          <div style={{
            position: 'absolute',
            bottom: popupBottom,
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

      {/* POI store popup — above FABs and route bar */}
      {selectedPoi && (
        <div style={{
          position: 'absolute',
          bottom: selectedPois.length > 0
            ? 'calc(var(--nav-height) + var(--safe-bottom) + 108px)'
            : 'calc(var(--nav-height) + var(--safe-bottom) + 60px)',
          left: 12, right: 12, zIndex: 100,
          background: '#ffffff',
          borderRadius: 18,
          padding: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)',
          borderTop: '4px solid #7c3aed',
          transition: 'bottom 0.2s ease',
        }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 10 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color:'#14171e', lineHeight:1.2, marginBottom: 2 }}>
                {selectedPoi.name}
              </h3>
              <p style={{ fontSize: 12, color:'#7a8394' }}>{selectedPoi.vicinity}</p>
              {selectedPoi.rating && <p style={{ fontSize: 12, marginTop: 2 }}>⭐ {selectedPoi.rating}</p>}
            </div>
            <button onClick={() => setSelectedPoi(null)}
              style={{ background:'#f4f6f9', border:'none', borderRadius:'50%', width:30, height:30, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginLeft:8, color:'#7a8394' }}>
              <Icon name="close" size={14} />
            </button>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => {
              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPoi.name + ' ' + selectedPoi.vicinity)}`, '_blank')
            }}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 0', borderRadius:10, border:'1.5px solid #d4d8e0', background:'white', color:'#14171e', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              🗺️ Google Maps
            </button>
            <button onClick={() => {
              navigate(`/customers/new?lat=${selectedPoi.lat}&lng=${selectedPoi.lng}&name=${encodeURIComponent(selectedPoi.name)}&address=${encodeURIComponent(selectedPoi.vicinity)}`)
              }}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 0', borderRadius:10, border:'none', background:'#3563e9', color:'white', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              + Add Customer
            </button>
            <button onClick={() => {
              const isSelected = selectedPois.some(p => p.name === selectedPoi.name && p.lat === selectedPoi.lat)
              if (isSelected) {
                setSelectedPois(prev => prev.filter(p => !(p.name === selectedPoi.name && p.lat === selectedPoi.lat)))
              } else {
                setSelectedPois(prev => [...prev, selectedPoi])
              }
              setSelectedPoi(null)
            }}
              style={{
                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:4, padding:'10px 0', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:13,
                background: selectedPois.some(p => p.name === selectedPoi.name && p.lat === selectedPoi.lat) ? '#fee2e2' : '#f0fdf4',
                color: selectedPois.some(p => p.name === selectedPoi.name && p.lat === selectedPoi.lat) ? '#dc2626' : '#16a34a',
                border: `1.5px solid ${selectedPois.some(p => p.name === selectedPoi.name && p.lat === selectedPoi.lat) ? '#fca5a5' : '#bbf7d0'}`,
              }}>
              {selectedPois.some(p => p.name === selectedPoi.name && p.lat === selectedPoi.lat) ? '✕ Remove' : '✓ Select'}
            </button>
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
