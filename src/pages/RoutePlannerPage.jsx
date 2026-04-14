import { useState, useCallback, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { useAuth } from '../hooks/useAuth'
import { getCurrentPosition } from '../lib/geo'
import { applySmartFilter, getCustomerColor } from '../lib/customerAvailability'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

// ── Nearest-neighbour optimization ──
function optimizeStops(stops, startLat, startLng) {
  if (!stops.length) return []
  const rem = [...stops]; const ordered = []; let lat = startLat, lng = startLng
  while (rem.length) {
    let best = 0, bestD = Infinity
    rem.forEach((s, i) => { const d = Math.hypot(s.lat - lat, s.lng - lng); if (d < bestD) { bestD = d; best = i } })
    ordered.push(rem.splice(best, 1)[0]); lat = ordered.at(-1).lat; lng = ordered.at(-1).lng
  }
  return ordered
}

// ── Build Google Maps URL for a SINGLE leg (max 10 locations) ──
// Google allows origin + up to 8 waypoints + destination = 10 total
function buildLegUrl(startCoord, stops, endCoord) {
  const enc = s => encodeURIComponent(s)
  const origin = enc(startCoord)
  const destination = endCoord ? enc(endCoord) : enc(`${stops.at(-1).lat},${stops.at(-1).lng}`)
  // If endCoord is set, all stops are waypoints. Otherwise last stop is destination.
  const waypointStops = endCoord ? stops : stops.slice(0, -1)
  const waypoints = waypointStops.map(s => enc(`${s.lat},${s.lng}`)).join('|')
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
  if (waypoints) url += `&waypoints=${waypoints}`
  return url
}

// ── Chunk route into legs of max 9 waypoints (10 locations) ──
// Each leg: [start, ...up to 8 waypoints, destination]
// The first location of leg N+1 = last location of leg N (chained)
function chunkRoute(startCoord, stops, endCoord) {
  if (stops.length === 0) return []

  const MAX_WAYPOINTS = 9 // 9 stops per leg (origin counts as 1, so 10 total)
  const legs = []
  let currentStart = startCoord
  let remaining = [...stops]

  while (remaining.length > 0) {
    const chunk = remaining.slice(0, MAX_WAYPOINTS)
    remaining = remaining.slice(MAX_WAYPOINTS)

    const isLastLeg = remaining.length === 0
    const legEnd = isLastLeg && endCoord ? endCoord : null

    legs.push({
      start: currentStart,
      stops: chunk,
      end: legEnd,
      url: buildLegUrl(currentStart, chunk, legEnd),
    })

    // Next leg starts at the last stop of this leg
    const lastStop = chunk.at(-1)
    currentStart = `${lastStop.lat},${lastStop.lng}`
  }

  return legs
}

export default function RoutePlannerPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { customers } = useCustomers()

  const [tab, setTab] = useState('plan')
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress] = useState('')
  const [useHome, setUseHome] = useState(false)
  const [filterMode, setFilterMode] = useState('available_now')
  const [selected, setSelected] = useState(new Set())
  const [route, setRoute] = useState([])
  const [gpsLoading, setGpsLoading] = useState(false)
  const [optimized, setOptimized] = useState(false)
  const [routeLegs, setRouteLegs] = useState([])
  const [routeName, setRouteName] = useState('')
  const [saving, setSaving] = useState(false)
  const [poiStops, setPoiStops] = useState([])
  const [savedRoutes, setSavedRoutes] = useState([])
  const [loadingSaved, setLoadingSaved] = useState(false)

  // Pick up imported stores from Map
  useEffect(() => {
    const stopsParam = searchParams.get('stops')
    const startLat = searchParams.get('startLat')
    const startLng = searchParams.get('startLng')
    if (stopsParam) {
      try {
        const stops = JSON.parse(decodeURIComponent(stopsParam))
        setPoiStops(stops)
        const ids = new Set()
        stops.forEach(s => ids.add(`poi_${s.name}_${s.lat}`))
        setSelected(ids)
      } catch {}
    }
    if (startLat && startLng) setStartAddress(`${startLat},${startLng}`)
  }, [searchParams])

  const loadSavedRoutes = useCallback(async () => {
    if (!user) return
    setLoadingSaved(true)
    const { data } = await supabase.from('saved_routes').select('*').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20)
    setSavedRoutes(data || [])
    setLoadingSaved(false)
  }, [user])

  useEffect(() => { loadSavedRoutes() }, [loadSavedRoutes])

  const pool = useMemo(() => applySmartFilter(customers, filterMode).filter(c => c.lat && c.lng), [customers, filterMode])

  const allStops = useMemo(() => {
    const cs = pool.filter(c => selected.has(c.id)).map(c => ({
      id: c.id, name: c.business_name || c.full_name, lat: c.lat, lng: c.lng,
      area: c.area, type: 'customer', phone: c.phone, original: c,
    }))
    const ps = poiStops.filter(s => selected.has(`poi_${s.name}_${s.lat}`)).map(s => ({
      id: `poi_${s.name}_${s.lat}`, name: s.name, lat: s.lat, lng: s.lng,
      area: s.vicinity || s.area || '', type: 'poi',
    }))
    return [...cs, ...ps]
  }, [pool, poiStops, selected])

  const toggle = id => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
    setOptimized(false); setRoute([]); setRouteLegs([])
  }
  const selectAll = () => {
    const ids = new Set(pool.map(c => c.id))
    poiStops.forEach(s => ids.add(`poi_${s.name}_${s.lat}`))
    setSelected(ids); setOptimized(false); setRoute([]); setRouteLegs([])
  }
  const clearAll = () => { setSelected(new Set()); setOptimized(false); setRoute([]); setRouteLegs([]) }

  const pinGPS = useCallback(async () => {
    setGpsLoading(true)
    try {
      const pos = await getCurrentPosition()
      setStartAddress(`${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`)
      showToast('📍 Location pinned')
    } catch { showToast('Could not get location', 'error') }
    finally { setGpsLoading(false) }
  }, [])

  // Remove a stop from the optimized route
  const removeFromRoute = (idx) => {
    const updated = route.filter((_, i) => i !== idx)
    setRoute(updated)
    if (updated.length === 0) {
      setOptimized(false); setRouteLegs([])
    } else {
      const startCoord = startAddress.trim()
      const endCoord = useHome && endAddress.trim() ? endAddress.trim() : null
      setRouteLegs(chunkRoute(startCoord, updated, endCoord))
    }
  }

  // Reorder a stop (move up/down)
  const moveStop = (idx, dir) => {
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= route.length) return
    const updated = [...route]
    ;[updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]]
    setRoute(updated)
    const startCoord = startAddress.trim()
    const endCoord = useHome && endAddress.trim() ? endAddress.trim() : null
    setRouteLegs(chunkRoute(startCoord, updated, endCoord))
  }

  const buildRoute = useCallback(() => {
    if (!startAddress.trim()) { showToast('Enter a starting address or pin GPS', 'warning'); return }
    if (!allStops.length) { showToast('Select at least one stop', 'warning'); return }
    let startLat = 29.95, startLng = -90.07
    const m = startAddress.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/)
    if (m) { startLat = parseFloat(m[1]); startLng = parseFloat(m[2]) }
    const ordered = optimizeStops(allStops, startLat, startLng)
    setRoute(ordered); setOptimized(true)
    const startCoord = startAddress.trim()
    const endCoord = useHome && endAddress.trim() ? endAddress.trim() : null
    setRouteLegs(chunkRoute(startCoord, ordered, endCoord))
  }, [startAddress, endAddress, useHome, allStops])

  const handleSave = async () => {
    if (!routeName.trim()) { showToast('Give your route a name', 'warning'); return }
    if (!route.length) { showToast('Build the route first', 'warning'); return }
    setSaving(true)
    try {
      const m = startAddress.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/)
      await supabase.from('saved_routes').insert([{
        user_id: user.id, name: routeName.trim(),
        start_address: startAddress, start_lat: m ? parseFloat(m[1]) : null, start_lng: m ? parseFloat(m[2]) : null,
        end_address: useHome ? endAddress : null,
        stops: route.map(s => ({ name: s.name, lat: s.lat, lng: s.lng, area: s.area || '', type: s.type || 'customer' })),
      }])
      showToast('✅ Route saved'); setRouteName(''); loadSavedRoutes()
    } catch (e) { showToast('❌ ' + e.message, 'error') }
    finally { setSaving(false) }
  }

  // Update a saved route (after removing stops)
  const updateSavedRoute = async (savedId, newStops) => {
    const { error } = await supabase.from('saved_routes')
      .update({ stops: newStops, updated_at: new Date().toISOString() })
      .eq('id', savedId)
    if (error) showToast('❌ ' + error.message, 'error')
    else { showToast('✅ Route updated'); loadSavedRoutes() }
  }

  const loadRoute = (saved) => {
    setStartAddress(saved.start_address || ''); setEndAddress(saved.end_address || ''); setUseHome(!!saved.end_address)
    const stops = saved.stops || []
    setPoiStops(stops.filter(s => s.type === 'poi'))
    const ids = new Set()
    stops.forEach(s => {
      if (s.type === 'poi') ids.add(`poi_${s.name}_${s.lat}`)
      else {
        const match = customers.find(c => Math.abs(c.lat - s.lat) < 0.0001 && Math.abs(c.lng - s.lng) < 0.0001)
        if (match) ids.add(match.id)
        else { setPoiStops(prev => [...prev, s]); ids.add(`poi_${s.name}_${s.lat}`) }
      }
    })
    setSelected(ids); setOptimized(false); setRoute([]); setRouteLegs([]); setTab('plan')
    showToast(`📋 Loaded: ${saved.name}`)
  }

  const deleteRoute = async (id) => {
    await supabase.from('saved_routes').delete().eq('id', id)
    setSavedRoutes(prev => prev.filter(r => r.id !== id)); showToast('Route deleted')
  }

  // Remove a stop from a saved route
  const removeFromSaved = (savedRoute, stopIdx) => {
    const newStops = (savedRoute.stops || []).filter((_, i) => i !== stopIdx)
    if (newStops.length === 0) {
      deleteRoute(savedRoute.id)
    } else {
      updateSavedRoute(savedRoute.id, newStops)
    }
  }

  const selectedCount = allStops.length
  const FILTERS = [
    { id: 'available_now', label: '🌟 Available' },
    { id: 'due_today', label: '📅 Due Today' },
    { id: 'overdue', label: '🔷 Overdue' },
    { id: 'all', label: '👥 All' },
  ]

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1>🗺️ Trip Planner</h1>
        <div style={{ width:36 }} />
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', background:'var(--gray-light)', borderRadius:10, padding:4, margin:'0 16px 14px' }}>
        {[['plan','📋 Plan'], ['saved',`💾 Saved (${savedRoutes.length})`]].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: tab===t ? 'white' : 'transparent', color: tab===t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      {/* ── SAVED TAB ── */}
      {tab === 'saved' && (
        <div className="page" style={{ paddingTop:0 }}>
          {loadingSaved && <div style={{ textAlign:'center', padding:20 }}><div style={{ width:32, height:32, border:'3px solid var(--border)', borderTopColor:'var(--blue)', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto' }} /></div>}
          {!loadingSaved && savedRoutes.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🗺️</div>
              <p className="text-muted">No saved routes yet</p>
              <p className="text-xs text-muted" style={{ marginTop:4 }}>Build and save a route to access it later</p>
            </div>
          )}
          {savedRoutes.map(r => {
            const stops = r.stops || []
            const legs = chunkRoute(
              r.start_address || (stops[0] ? `${stops[0].lat},${stops[0].lng}` : '0,0'),
              stops,
              r.end_address || null
            )
            return (
              <div key={r.id} className="card" style={{ marginBottom:10, padding:'12px 14px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:15 }}>{r.name}</p>
                    <p className="text-xs text-muted">
                      {stops.length} stops · {legs.length} leg{legs.length !== 1 ? 's' : ''} · {new Date(r.updated_at).toLocaleDateString('en-US',{month:'short',day:'numeric'})}
                    </p>
                  </div>
                  <button onClick={() => deleteRoute(r.id)} style={{ padding:'4px 8px', borderRadius:6, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>🗑️</button>
                </div>

                {/* Stops with remove buttons */}
                <div style={{ marginBottom:8 }}>
                  {stops.map((s, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                      <span style={{ width:20, height:20, borderRadius:'50%', background: s.type==='poi'?'#7c3aed':'var(--blue)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:800, flexShrink:0 }}>{i+1}</span>
                      <span style={{ fontSize:12, fontWeight:600, flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
                      <button onClick={() => removeFromSaved(r, i)} style={{ padding:'2px 6px', borderRadius:6, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:10, cursor:'pointer', fontWeight:700, flexShrink:0 }}>✕</button>
                    </div>
                  ))}
                </div>

                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  <button onClick={() => loadRoute(r)} className="btn btn-primary btn-sm" style={{ flex:1 }}>📋 Load & Edit</button>
                  {legs.map((leg, li) => (
                    <a key={li} href={leg.url} target="_blank" rel="noopener noreferrer"
                      className="btn btn-ghost btn-sm" style={{ flex: legs.length === 1 ? 1 : 'none', textDecoration:'none', textAlign:'center' }}>
                      {legs.length === 1 ? '🗺️ Open Maps' : `🗺️ Leg ${li+1} (${leg.stops.length})`}
                    </a>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── PLAN TAB ── */}
      {tab === 'plan' && (
        <div className="page" style={{ paddingTop:0, paddingBottom:120 }}>
          <p className="section-header">Starting Point</p>
          <div style={{ display:'flex', gap:8, marginBottom:8 }}>
            <input className="form-input" value={startAddress} onChange={e => setStartAddress(e.target.value)} placeholder="e.g. 123 Main St, New Orleans" style={{ flex:1 }} />
            <button onClick={pinGPS} disabled={gpsLoading} style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background:'white', cursor:'pointer', flexShrink:0, fontSize:18 }}>
              {gpsLoading ? '⏳' : '📍'}
            </button>
          </div>
          <div onClick={() => setUseHome(v => !v)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background: useHome?'var(--blue-light)':'white', cursor:'pointer', marginBottom:8 }}>
            <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${useHome?'var(--blue)':'var(--border)'}`, background: useHome?'var(--blue)':'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              {useHome && <span style={{ color:'white', fontSize:13, fontWeight:900 }}>✓</span>}
            </div>
            <span style={{ fontWeight:600, fontSize:14 }}>🏠 Return to a different address (end point)</span>
          </div>
          {useHome && <input className="form-input" value={endAddress} onChange={e => setEndAddress(e.target.value)} placeholder="Home address / end point" style={{ marginBottom:14 }} />}

          {/* POI stops from Map */}
          {poiStops.length > 0 && (<>
            <p className="section-header" style={{ marginTop:4 }}>📍 Stores from Map</p>
            {poiStops.map(s => {
              const sid = `poi_${s.name}_${s.lat}`; const on = selected.has(sid)
              return (
                <div key={sid} onClick={() => toggle(sid)} style={{
                  display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, marginBottom:6, cursor:'pointer',
                  border:`1.5px solid ${on?'#7c3aed':'var(--border)'}`, background: on?'#7c3aed12':'white', borderLeft:'4px solid #7c3aed',
                }}>
                  <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, border:`2px solid ${on?'#7c3aed':'var(--border)'}`, background: on?'#7c3aed':'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {on && <span style={{ color:'white', fontSize:13, fontWeight:900 }}>✓</span>}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14 }}>{s.name}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)' }}>{s.vicinity||s.area||''}</p>
                  </div>
                  <span style={{ fontSize:10, color:'#7c3aed', fontWeight:700 }}>📍 Store</span>
                </div>
              )
            })}
          </>)}

          {/* Customers */}
          <p className="section-header" style={{ marginTop:4 }}>Customers</p>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
            {FILTERS.map(f => (
              <button key={f.id} onClick={() => setFilterMode(f.id)} style={{
                padding:'7px 14px', borderRadius:20, border:'1.5px solid', cursor:'pointer', fontWeight:700, fontSize:12,
                borderColor: filterMode===f.id?'var(--blue)':'var(--border)',
                background: filterMode===f.id?'var(--blue)':'white', color: filterMode===f.id?'white':'var(--text)',
              }}>{f.label}</button>
            ))}
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <p style={{ fontWeight:700, fontSize:13 }}>{pool.length} customers · {selectedCount} selected</p>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={selectAll} style={{ fontSize:12, color:'var(--blue)', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>All</button>
              <button onClick={clearAll} style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>Clear</button>
            </div>
          </div>
          {pool.length === 0 && <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}><div style={{ fontSize:36, marginBottom:8 }}>👥</div><p>No customers match this filter.</p></div>}
          {pool.map(c => {
            const { color, label } = getCustomerColor(c); const on = selected.has(c.id)
            return (
              <div key={c.id} onClick={() => toggle(c.id)} style={{
                display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:12, marginBottom:6, cursor:'pointer',
                border:`1.5px solid ${on?color:'var(--border)'}`, background: on?`${color}12`:'white', borderLeft:`4px solid ${color}`,
              }}>
                <div style={{ width:22, height:22, borderRadius:6, flexShrink:0, border:`2px solid ${on?color:'var(--border)'}`, background: on?color:'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {on && <span style={{ color:'white', fontSize:13, fontWeight:900 }}>✓</span>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.business_name||c.full_name}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>{c.area||c.full_name}</p>
                </div>
                <span style={{ fontSize:10, color, fontWeight:700, flexShrink:0 }}>{label}</span>
              </div>
            )
          })}

          {selectedCount > 0 && (
            <div style={{ position:'fixed', bottom:'calc(var(--nav-height) + var(--safe-bottom) + 12px)', left:'50%', transform:'translateX(-50%)', width:'calc(100% - 32px)', maxWidth:600, zIndex:50 }}>
              <button onClick={buildRoute} style={{
                width:'100%', padding:'15px', borderRadius:14, border:'none', cursor:'pointer',
                background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', fontWeight:800, fontSize:16,
                boxShadow:'0 4px 20px rgba(37,99,235,0.4)',
              }}>🗺️ Build Route ({selectedCount} stop{selectedCount!==1?'s':''})</button>
            </div>
          )}
        </div>
      )}

      {/* ── ROUTE RESULT ── */}
      {optimized && route.length > 0 && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200, display:'flex', alignItems:'flex-end' }} onClick={() => setOptimized(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'85vh', overflowY:'auto', padding:'20px 20px 40px' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 16px' }} />
            <h2 style={{ fontSize:18, marginBottom:4 }}>🗺️ Route – {route.length} stops</h2>
            <p className="text-xs text-muted" style={{ marginBottom:4 }}>
              Optimized nearest-neighbour order
              {routeLegs.length > 1 && ` · split into ${routeLegs.length} legs for Google Maps`}
            </p>
            {routeLegs.length > 1 && (
              <p style={{ fontSize:11, color:'#d97706', fontWeight:600, marginBottom:12 }}>
                ⚠️ Google Maps allows max 10 locations per trip – open each leg separately
              </p>
            )}

            <div style={{ marginBottom:16 }}>
              {/* Start */}
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#16a34a', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>S</div>
                <p style={{ fontSize:13, fontWeight:600, color:'#16a34a', flex:1 }}>{startAddress.match(/^-?\d+/)?'📍 Current location':startAddress}</p>
              </div>

              {/* Stops with leg dividers */}
              {route.map((s, i) => {
                const isPoi = s.type === 'poi'
                const clr = isPoi ? '#7c3aed' : (s.original ? getCustomerColor(s.original).color : 'var(--blue)')
                // Show leg divider
                const legBoundary = routeLegs.length > 1 && i > 0 && i % 9 === 0
                return (
                  <div key={s.id||i}>
                    {legBoundary && (
                      <div style={{ display:'flex', alignItems:'center', gap:8, margin:'12px 0', padding:'6px 12px', background:'#fef3c7', borderRadius:8, border:'1px solid #fde68a' }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#92400e' }}>🗺️ Leg {Math.ceil((i+1)/9)} starts here</span>
                      </div>
                    )}
                    <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                      <div style={{ width:28, height:28, borderRadius:'50%', background:clr, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>{i+1}</div>
                      <div style={{ flex:1 }}><p style={{ fontSize:13, fontWeight:700 }}>{s.name}</p><p style={{ fontSize:10, color:'var(--text-muted)' }}>{s.area}{isPoi?' · 📍 Store':''}</p></div>
                      <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                        {s.phone && <a href={`tel:${s.phone}`} onClick={e => e.stopPropagation()} style={{ fontSize:18, textDecoration:'none' }}>📞</a>}
                        <button onClick={() => moveStop(i, -1)} disabled={i===0} style={{ padding:'2px 6px', borderRadius:6, border:'1px solid var(--border)', background:'white', fontSize:12, cursor:'pointer', opacity:i===0?0.3:1 }}>↑</button>
                        <button onClick={() => moveStop(i, 1)} disabled={i===route.length-1} style={{ padding:'2px 6px', borderRadius:6, border:'1px solid var(--border)', background:'white', fontSize:12, cursor:'pointer', opacity:i===route.length-1?0.3:1 }}>↓</button>
                        <button onClick={() => removeFromRoute(i)} style={{ padding:'2px 6px', borderRadius:6, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:12, cursor:'pointer', fontWeight:700 }}>✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* End point */}
              {useHome && endAddress && (
                <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#7c3aed', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>🏠</div>
                  <p style={{ fontSize:13, fontWeight:600, color:'#7c3aed' }}>{endAddress}</p>
                </div>
              )}
            </div>

            {/* Save */}
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              <input className="form-input" value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="Route name (e.g. East NOLA Tue)" style={{ flex:1, fontSize:14 }} />
              <button onClick={handleSave} disabled={saving} style={{ padding:'10px 18px', borderRadius:10, border:'none', background:'#7c3aed', color:'white', fontWeight:700, fontSize:14, cursor:'pointer', flexShrink:0 }}>
                {saving ? '...' : '💾 Save'}
              </button>
            </div>

            {/* Open Maps buttons – one per leg */}
            {routeLegs.map((leg, li) => (
              <a key={li} href={leg.url} target="_blank" rel="noopener noreferrer" style={{
                display:'block', width:'100%', padding:'14px', borderRadius:12,
                background: li === 0 ? 'linear-gradient(135deg,#16a34a,#15803d)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
                color:'white', fontWeight:800, fontSize:15, textAlign:'center', textDecoration:'none',
                boxShadow: li === 0 ? '0 4px 16px rgba(22,163,74,0.4)' : '0 4px 16px rgba(37,99,235,0.3)',
                boxSizing:'border-box', marginBottom:8,
              }}>
                {routeLegs.length === 1
                  ? `🗺️ Open in Google Maps (${route.length} stops)`
                  : `🗺️ Open Leg ${li+1} – stops ${li*9+1}–${Math.min((li+1)*9, route.length)}`
                }
              </a>
            ))}

            <button onClick={() => setOptimized(false)} style={{ width:'100%', marginTop:4, padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'white', color:'var(--text-muted)', fontSize:14, cursor:'pointer' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
