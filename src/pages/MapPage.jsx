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
  // Big-box / chain grocery (not independent)
  'walmart', 'wal-mart', 'target', 'costco', 'sams club', "sam's club",
  'whole foods', 'trader joe', 'aldi', 'lidl', 'kroger', 'publix', 'safeway',
  'albertsons', 'winn-dixie', 'winn dixie', 'food lion',
  'rouses', "rouse's", 'rouse market',
  'dollar general', 'dg market', 'dollar tree', 'family dollar',
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
  // Big-box hardware / home improvement (not retail we sell to)
  'home depot', 'lowe\'s', 'lowes home', 'menards', 'ace hardware',
  'harbor freight', 'tractor supply', 'best buy', 'autozone', "o'reilly",
  'advance auto', 'napa auto', 'pep boys',
  // Restaurants / food service (should never appear)
  'restaurant', 'cafe', 'café', 'coffee', 'starbucks', 'mcdonald',
  'burger king', 'wendy', 'taco bell', 'subway', 'popeyes', 'chick-fil',
  'chipotle', 'pizza', 'sushi', 'grill', 'kitchen', 'diner', 'bistro',
  'bakery', 'donut', 'doughnut', 'ice cream', 'smoothie', 'juice bar',
  'bar & grill', 'sports bar', 'pub', 'eatery', 'taqueria', 'cantina',
  'buffet', 'steakhouse', 'seafood', 'chicken', 'wings', 'deli ',
  // Wine stores
  'wine bar', 'wine shop', 'wine cellar', 'wine merchant', 'wine house',
  'wine & spirits', 'wine and spirits', 'wine boutique', 'wine store',
  'wine tasting', 'winery', 'vineyard',
  'total wine', 'spec\'s', 'binny\'s',
  // Hair extension / wig suppliers (not beauty supply retail)
  'hair extension', 'hair extensions', 'wig ', 'wigs ', 'wig outlet',
  'hair wholesale', 'hair vendor', 'hair distributor', 'lace front',
  // Production / manufacturing / warehouse (not retail)
  'production', 'manufacturing', 'warehouse', 'distribution center',
  'bottling', 'packaging', 'factory', 'plant ', 'processing',
  'wholesale only', 'trade only',
  // Produce markets / food-product suppliers / malls (not our product fit)
  'produce market', 'produce stand', 'farmers market', 'farmer market',
  'fruit market', 'fruit stand', 'food products supplier', 'food product supplier',
  'food supplier', 'food distributor', 'food service', 'food bank',
  'shopping mall', 'shopping center', 'shopping centre', 'mall ', ' mall',
  'outlet mall', 'plaza mall',
  // Specialty ethnic markets (own supply chains – not a fit for our line)
  'mercado', 'carniceria', 'carnicería', 'tienda', 'supermercado',
  'latino market', 'latina market', 'latin market', 'hispanic market',
  'mexican market', 'mexican store', 'mexican grocery',
  'asian market', 'asian grocery', 'asian food', 'oriental market',
  'oriental food', 'oriental grocery', 'chinese market', 'chinese grocery',
  'korean market', 'korean grocery', 'japanese market', 'japanese grocery',
  'vietnamese market', 'vietnamese grocery', 'thai market', 'thai grocery',
  'filipino market', 'filipino store', 'indian grocery', 'indian market',
  'india bazaar', 'halal market', 'halal grocery', 'h mart', 'hmart',
  'international market', 'international grocery', 'international foods',
]

// Reject ONLY clear restaurants / eateries / services that should never show.
// Everything else (any kind of store, even loosely typed) is allowed through;
// the name blocklist (EXCLUDED_NAMES) handles big-box chains like Home Depot.
// We deliberately keep this list short so we don't accidentally hide real
// independent stores that Google mistypes.
const REJECT_TYPES = [
  'restaurant', 'meal_takeaway', 'meal_delivery', 'cafe', 'bar',
  'lodging', 'doctor', 'dentist', 'hospital', 'school', 'bank',
  'car_repair', 'car_dealer', 'place_of_worship', 'night_club', 'lawyer',
  'shopping_mall', 'department_store',
]
function hasRejectedType(place) {
  const t = place.types || []
  return t.some(x => REJECT_TYPES.includes(x))
}
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
  const currentAccuracyRing = useRef(null)
  const watchIdRef = useRef(null)
  const locationPollRef = useRef(null)
  const activeInfoWindow = useRef(null) // track open info window to auto-close
  const [selectedPoi, setSelectedPoi] = useState(null) // tapped POI store
  const [selectedPois, setSelectedPois] = useState([]) // stores selected for route
  const [showRoutePickerModal, setShowRoutePickerModal] = useState(false)

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

      // Live location: update marker every time the device reports a new position
      let initialCenter = false
      const updateMyLocation = (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const point = { lat, lng }
        if (!initialCenter) {
          mapInstance.current.setCenter(point)
          initialCenter = true
        }
        if (currentLocMarker.current) {
          // Just move the existing marker
          currentLocMarker.current.setPosition(point)
        } else {
          // Outer pulsing ring (live indicator)
          currentAccuracyRing.current = new window.google.maps.Marker({
            position: point,
            map: mapInstance.current,
            zIndex: 998,
            clickable: false,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 18,
              fillColor: '#2563eb',
              fillOpacity: 0.18,
              strokeColor: '#2563eb',
              strokeOpacity: 0.4,
              strokeWeight: 1,
            },
          })
          // Inner solid blue dot
          currentLocMarker.current = new window.google.maps.Marker({
            position: point,
            map: mapInstance.current,
            title: 'You are here (live)',
            zIndex: 999,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 9,
              fillColor: '#2563eb',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 3,
            },
          })
        }
        if (currentAccuracyRing.current) currentAccuracyRing.current.setPosition(point)
      }

      // Use watchPosition for continuous updates from the OS (more efficient than polling)
      if (navigator.geolocation) {
        watchIdRef.current = navigator.geolocation.watchPosition(
          updateMyLocation,
          (err) => console.warn('Geolocation watch error:', err.message),
          { enableHighAccuracy: true, maximumAge: 4000, timeout: 10000 }
        )

        // Also poll every 5 seconds as a fallback to ensure the marker keeps moving
        // even if watchPosition stalls (some browsers throttle when the page is mostly static)
        locationPollRef.current = setInterval(() => {
          navigator.geolocation.getCurrentPosition(
            updateMyLocation,
            () => {},
            { enableHighAccuracy: true, maximumAge: 4000, timeout: 8000 }
          )
        }, 5000)
      }
    }).catch(() => setMapError('Failed to load Google Maps.'))
  }, [])

  // Cleanup location watchers on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current != null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
      if (locationPollRef.current) clearInterval(locationPollRef.current)
    }
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
      const hasSales = customer.sale_amount > 0
      const marker = new window.google.maps.Marker({
        position: { lat: customer.lat, lng: customer.lng },
        map: mapInstance.current,
        title: customer.full_name,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: hasSales ? 12 : 10,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: hasSales ? '#f0d078' : '#ffffff',
          strokeWeight: hasSales ? 3 : 2,
        },
        label: hasSales ? { text: '💲', fontSize: '12px' } : undefined,
        zIndex: hasSales ? 10 : 5,
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

      // mustMatch: for keyword searches, the result name must contain one of
      // these words (otherwise Google's loose keyword match pulls in unrelated
      // nearby places). requireStoreType: result must carry the 'store' Google
      // type so we don't show services/restaurants.
      const SMOKE_WORDS = ['smoke', 'vape', 'tobacco', 'cigar', 'hookah', 'puff', 'vapor', 'kratom', 'cbd']
      const GROCERY_WORDS = ['grocery', 'market', 'supermarket', 'mart', 'foods', 'food', 'produce', 'mercado', 'grocer', 'store', 'shop']
      const CORNER_WORDS = ['store', 'mart', 'market', 'corner', 'mini', 'deli', 'stop', 'food', 'grocery', 'shop', 'quick', 'express']
      const BEAUTY_WORDS = ['beauty', 'cosmetic', 'hair', 'nail', 'salon supply']

      const types = [
        { type: 'convenience_store', label: '🏪', color: '#7c3aed' },
        { type: 'grocery_or_supermarket', label: '🛒', color: '#16a34a' },
        { type: 'supermarket',       label: '🛒', color: '#16a34a', typeTag: 'grocery_or_supermarket' },
        { type: 'liquor_store',      label: '🛒', color: '#16a34a', typeTag: 'grocery_or_supermarket' },
        // Keyword searches catch independent stores that Google mistypes as generic 'store'
        { keyword: 'food mart',      label: '🏪', color: '#7c3aed', typeTag: 'convenience_store', mustMatch: CORNER_WORDS },
        { keyword: 'grocery store',  label: '🛒', color: '#16a34a', typeTag: 'grocery_or_supermarket', mustMatch: GROCERY_WORDS },
        { keyword: 'supermarket',    label: '🛒', color: '#16a34a', typeTag: 'grocery_or_supermarket', mustMatch: GROCERY_WORDS },
        { keyword: 'corner store',   label: '🏪', color: '#7c3aed', typeTag: 'convenience_store', mustMatch: CORNER_WORDS },
        { keyword: 'mini market',    label: '🏪', color: '#7c3aed', typeTag: 'convenience_store', mustMatch: CORNER_WORDS },
        // Smoke / vape shops
        { keyword: 'smoke shop',     label: '💨', color: '#0891b2', typeTag: 'smoke_shop', mustMatch: SMOKE_WORDS },
        { keyword: 'vape shop',      label: '💨', color: '#0891b2', typeTag: 'smoke_shop', mustMatch: SMOKE_WORDS },
        { keyword: 'tobacco store',  label: '💨', color: '#0891b2', typeTag: 'smoke_shop', mustMatch: SMOKE_WORDS },
        { keyword: 'hookah',         label: '💨', color: '#0891b2', typeTag: 'smoke_shop', mustMatch: SMOKE_WORDS },
        // Beauty supply stores (not salons/dermatologists)
        { keyword: 'beauty supply store', label: '💄', color: '#ec4899', typeTag: 'beauty_supply', mustMatch: BEAUTY_WORDS },
      ]

      const mapDiv = document.createElement('div')
      const tempMap = new window.google.maps.Map(mapDiv, { center: { lat, lng }, zoom: 14 })
      const service = new window.google.maps.places.PlacesService(tempMap)
      const newMarkers = []

      // Distance between two GPS points in meters
      const metersApart = (lat1, lng1, lat2, lng2) => {
        const dlat = (lat1 - lat2) * 111000
        const dlng = (lng1 - lng2) * 111000 * Math.cos(lat1 * Math.PI / 180)
        return Math.sqrt(dlat * dlat + dlng * dlng)
      }

      await Promise.all(types.map(({ type, keyword, label, color, typeTag, mustMatch }) =>
        new Promise(resolve => {
          const req = { location: { lat, lng }, radius: searchRadius }
          if (keyword) req.keyword = keyword
          else req.type = type

          const processPlaces = (places) => {
            for (const place of places) {
              if (isExcluded(place.name)) continue

              // Reject anything Google tags as a restaurant/bar/service/etc.
              // regardless of how it matched the search
              if (hasRejectedType(place)) continue

              // For keyword searches: require the name to actually contain a
              // relevant word so we don't show unrelated nearby businesses
              if (mustMatch) {
                const n = (place.name || '').toLowerCase()
                if (!mustMatch.some(w => n.includes(w))) continue
              }

              // Skip stores that are explicitly closed right now
              // opening_hours.open_now is a boolean from nearbySearch (not a function)
              // Only skip if we KNOW it's closed (open_now === false)
              if (place.opening_hours && place.opening_hours.open_now === false) continue

              const plat = place.geometry.location.lat()
              const plng = place.geometry.location.lng()

              // Skip if duplicate (within 50m of already-added POI)
              if (newMarkers.some(m => metersApart(plat, plng, m.lat, m.lng) < 50)) continue

              // Check if already one of your customers (within 80m)
              const existingCust = customers.find(c =>
                c.lat && c.lng && metersApart(plat, plng, c.lat, c.lng) < 80
              )

              const poiData = {
                name: place.name,
                type: typeTag || type,
                label,
                lat: plat,
                lng: plng,
                vicinity: place.vicinity || '',
                rating: place.rating || null,
                isExisting: !!existingCust,
                existingCustomer: existingCust || null,
              }

              const mColor = existingCust ? '#16a34a' : color
              const marker = new window.google.maps.Marker({
                position: place.geometry.location,
                map: mapInstance.current,
                title: existingCust ? `\u2705 ${place.name} (your customer)` : place.name,
                icon: {
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 11,
                  fillColor: mColor, fillOpacity: existingCust ? 0.4 : 0.95,
                  strokeColor: existingCust ? '#16a34a' : 'white',
                  strokeWeight: existingCust ? 3 : 2.5,
                },
                label: { text: existingCust ? '\u2705' : label, fontSize: '13px' },
                zIndex: existingCust ? 5 : 10,
              })
              marker.addListener('click', () => {
                setSelectedCustomer(null)
                setSelectedPoi(poiData)
              })
              poiMarkersRef.current.push(marker)
              newMarkers.push(poiData)
            }
          }

          // Google returns up to 20 results per page, up to 3 pages (60 total).
          // Walk all pages so dense areas (lots of groceries) aren't cut off at 20.
          let pagesFetched = 0
          const handler = (places, status, pagination) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && places) {
              processPlaces(places)
            }
            pagesFetched++
            if (pagination && pagination.hasNextPage && pagesFetched < 3) {
              // Google requires a short delay before nextPage() is valid
              setTimeout(() => pagination.nextPage(), 400)
            } else {
              resolve()
            }
          }
          service.nearbySearch(req, handler)
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

        {/* Hint when POIs visible + Select All for Route */}
        {poiVisible && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600, display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span>🏪 {poiMarkers.filter(p=>p.type==='convenience_store').length} convenience</span>
              <span>🛒 {poiMarkers.filter(p=>p.type==='grocery_or_supermarket').length} grocery/liquor</span>
              <span>💨 {poiMarkers.filter(p=>p.type==='smoke_shop').length} smoke/vape</span>
              <span>💄 {poiMarkers.filter(p=>p.type==='beauty_supply').length} beauty</span>
              <span style={{ color: 'var(--text-muted)' }}>({poiMarkers.length} total)</span>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => {
                // Add all non-existing POIs to the route selection
                const newPois = poiMarkers.filter(p => !p.isExisting)
                setSelectedPois(newPois)
              }}
                style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #7c3aed', background: '#ede9fe', color: '#7c3aed', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                ✅ Select All ({poiMarkers.filter(p => !p.isExisting).length}) → Route
              </button>
              {selectedPois.length > 0 && (
                <button onClick={() => setShowRoutePickerModal(true)}
                  style={{ padding: '5px 12px', borderRadius: 8, border: '1.5px solid #7c3aed', background: '#7c3aed', color: 'white', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>
                  ✏️ Edit Selection ({selectedPois.length})
                </button>
              )}
            </div>
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
              const stopsData = selectedPois.map(p => ({ name: p.name, lat: p.lat, lng: p.lng, vicinity: p.vicinity || '', type: 'poi' }))
              const params = new URLSearchParams()
              params.set('stops', JSON.stringify(stopsData))
              if (searchCenter) { params.set('startLat', searchCenter.lat); params.set('startLng', searchCenter.lng) }
              navigate(`/route?${params.toString()}`)
            }}
              style={{ padding: '8px 16px', borderRadius: 10, border: 'none', background: 'white', color: '#7c3aed', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
              🗺️ Plan Route
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
          borderTop: `4px solid ${selectedPoi.isExisting ? '#16a34a' : '#7c3aed'}`,
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

          {/* Existing customer badge */}
          {selectedPoi.isExisting && (
            <div style={{ background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:10, padding:'8px 12px', marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:16 }}>✅</span>
              <div>
                <p style={{ fontSize:13, fontWeight:700, color:'#16a34a' }}>Already your customer</p>
                <p style={{ fontSize:11, color:'var(--text-muted)' }}>{selectedPoi.existingCustomer?.business_name || selectedPoi.existingCustomer?.full_name}</p>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={() => {
              window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPoi.name + ' ' + selectedPoi.vicinity)}`, '_blank')
            }}
              style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 0', borderRadius:10, border:'1.5px solid #d4d8e0', background:'white', color:'#14171e', fontWeight:700, fontSize:13, cursor:'pointer' }}>
              🗺️ Maps
            </button>

            {/* Show Log Visit for existing customers, Add Customer for new ones */}
            {selectedPoi.isExisting ? (
              <button onClick={() => navigate(`/visit/${selectedPoi.existingCustomer.id}`)}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 0', borderRadius:10, border:'none', background:'#16a34a', color:'white', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                📋 Log Visit
              </button>
            ) : (
              <button onClick={() => {
                navigate(`/customers/new?lat=${selectedPoi.lat}&lng=${selectedPoi.lng}&name=${encodeURIComponent(selectedPoi.name)}&address=${encodeURIComponent(selectedPoi.vicinity)}`)
              }}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 0', borderRadius:10, border:'none', background:'#3563e9', color:'white', fontWeight:700, fontSize:13, cursor:'pointer' }}>
                + Add Customer
              </button>
            )}

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

      {/* Route Picker Modal – edit which stores go to the route */}
      {showRoutePickerModal && (
        <div className="modal-overlay" onClick={() => setShowRoutePickerModal(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '85vh' }}>
            <div className="modal-handle" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800 }}>Edit Route Stores</h2>
              <button onClick={() => setShowRoutePickerModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
              {selectedPois.length} store{selectedPois.length !== 1 ? 's' : ''} selected · remove ones you don't want, then plan route
            </p>

            {/* All found stores with toggle */}
            <div style={{ maxHeight: 'calc(85vh - 220px)', overflowY: 'auto', marginBottom: 14 }}>
              {poiMarkers.filter(p => !p.isExisting).map((poi, i) => {
                const isSelected = selectedPois.some(p => p.name === poi.name && p.lat === poi.lat)
                const TYPE_LABELS = { convenience_store: '🏪', gas_station: '⛽', beauty_supply: '💄', grocery_or_supermarket: '🛒', beauty_salon: '💄', smoke_shop: '💨' }
                return (
                  <div key={i} onClick={() => {
                    if (isSelected) {
                      setSelectedPois(prev => prev.filter(p => !(p.name === poi.name && p.lat === poi.lat)))
                    } else {
                      setSelectedPois(prev => [...prev, poi])
                    }
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', marginBottom: 6, cursor: 'pointer',
                    borderRadius: 12, border: `1.5px solid ${isSelected ? '#7c3aed' : 'var(--border)'}`,
                    background: isSelected ? '#f5f3ff' : 'white',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                      border: `2px solid ${isSelected ? '#7c3aed' : 'var(--border)'}`,
                      background: isSelected ? '#7c3aed' : 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {isSelected && <span style={{ color: 'white', fontSize: 14, fontWeight: 900 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {TYPE_LABELS[poi.type] || '📍'} {poi.name}
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{poi.vicinity}</p>
                    </div>
                    {poi.rating && <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>⭐{poi.rating}</span>}
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => {
                setSelectedPois(poiMarkers.filter(p => !p.isExisting))
              }} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                Select All
              </button>
              <button onClick={() => setSelectedPois([])} style={{ flex: 1, padding: '12px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: 'var(--text-muted)' }}>
                Clear All
              </button>
            </div>
            {selectedPois.length > 0 && (
              <button onClick={() => {
                setShowRoutePickerModal(false)
                const stopsData = selectedPois.map(p => ({ name: p.name, lat: p.lat, lng: p.lng, vicinity: p.vicinity || '', type: 'poi' }))
                const params = new URLSearchParams()
                params.set('stops', JSON.stringify(stopsData))
                if (searchCenter) { params.set('startLat', searchCenter.lat); params.set('startLng', searchCenter.lng) }
                navigate(`/route?${params.toString()}`)
              }}
                style={{ width: '100%', marginTop: 8, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>
                🗺️ Plan Route ({selectedPois.length} store{selectedPois.length !== 1 ? 's' : ''})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
