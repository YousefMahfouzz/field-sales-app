import { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { getCurrentPosition } from '../lib/geo'
import { applySmartFilter, getCustomerColor } from '../lib/customerAvailability'

// ── Nearest-neighbour route optimizer ──────────────────────────
function optimizeStops(stops, startLat, startLng) {
  if (!stops.length) return []
  const rem = [...stops]
  const ordered = []
  let lat = startLat, lng = startLng
  while (rem.length) {
    let best = 0, bestD = Infinity
    rem.forEach((s, i) => {
      const d = Math.hypot(s.lat - lat, s.lng - lng)
      if (d < bestD) { bestD = d; best = i }
    })
    ordered.push(rem.splice(best, 1)[0])
    lat = ordered.at(-1).lat
    lng = ordered.at(-1).lng
  }
  return ordered
}

// Build a Google Maps URL with waypoints
function buildGoogleMapsUrl(start, stops, end) {
  const enc = (s) => encodeURIComponent(s)
  const origin = enc(start)
  const destination = end ? enc(end) : enc(`${stops.at(-1).lat},${stops.at(-1).lng}`)

  const waypoints = (end ? stops : stops.slice(0, -1))
    .map(s => enc(`${s.lat},${s.lng}`))
    .join('|')

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=driving`
  if (waypoints) url += `&waypoints=${waypoints}`
  return url
}

export default function RoutePlannerPage() {
  const navigate = useNavigate()
  const { customers } = useCustomers()

  // ── State ──
  const [startAddress, setStartAddress] = useState('')
  const [endAddress, setEndAddress]     = useState('')
  const [useHome, setUseHome]           = useState(false)
  const [filterMode, setFilterMode]     = useState('available_now')
  const [selected, setSelected]         = useState(new Set()) // customer ids
  const [route, setRoute]               = useState([])        // ordered stops
  const [gpsLoading, setGpsLoading]     = useState(false)
  const [optimized, setOptimized]       = useState(false)
  const [mapsUrl, setMapsUrl]           = useState('')

  // ── Filtered customer pool ──
  const pool = useMemo(() => {
    const base = applySmartFilter(customers, filterMode)
    return base.filter(c => c.lat && c.lng)
  }, [customers, filterMode])

  const toggleCustomer = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    setOptimized(false)
    setRoute([])
    setMapsUrl('')
  }

  const selectAll = () => {
    setSelected(new Set(pool.map(c => c.id)))
    setOptimized(false)
    setRoute([])
    setMapsUrl('')
  }

  const clearAll = () => {
    setSelected(new Set())
    setOptimized(false)
    setRoute([])
    setMapsUrl('')
  }

  // ── GPS pin current location as start ──
  const pinGPS = useCallback(async () => {
    setGpsLoading(true)
    try {
      const pos = await getCurrentPosition()
      setStartAddress(`${pos.lat},${pos.lng}`)
    } catch { alert('Could not get location') }
    finally { setGpsLoading(false) }
  }, [])

  // ── Build optimized route ──
  const buildRoute = useCallback(() => {
    if (!startAddress.trim()) { alert('Enter a starting address or pin your location'); return }
    const stops = pool.filter(c => selected.has(c.id))
    if (!stops.length) { alert('Select at least one customer'); return }

    // Parse start coords if GPS was used, otherwise use a fake centroid offset
    // (Google Maps will handle the actual geocoding of text addresses)
    let startLat = 29.95, startLng = -90.07 // NOLA default
    const gpsMatch = startAddress.match(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/)
    if (gpsMatch) { startLat = parseFloat(gpsMatch[1]); startLng = parseFloat(gpsMatch[2]) }

    const ordered = optimizeStops(stops, startLat, startLng)
    setRoute(ordered)
    setOptimized(true)

    const end = useHome && endAddress.trim() ? endAddress.trim() : null
    const url = buildGoogleMapsUrl(startAddress.trim(), ordered, end)
    setMapsUrl(url)
  }, [startAddress, endAddress, useHome, pool, selected])

  const selectedCount = selected.size

  // ── FILTER TABS ──
  const FILTERS = [
    { id: 'available_now', label: '🌟 Available Now' },
    { id: 'due_today',     label: '📅 Due Today' },
    { id: 'overdue',       label: '🔷 Overdue' },
    { id: 'all',           label: '👥 All' },
  ]

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1>🗺️ Trip Planner</h1>
        <div style={{ width:36 }} />
      </div>

      <div className="page" style={{ paddingTop:12, paddingBottom:120 }}>

        {/* ── START ADDRESS ── */}
        <p className="section-header">Starting Point</p>
        <div style={{ display:'flex', gap:8, marginBottom:8 }}>
          <input
            className="form-input"
            value={startAddress}
            onChange={e => setStartAddress(e.target.value)}
            placeholder="e.g. 123 Main St, New Orleans"
            style={{ flex:1 }}
          />
          <button onClick={pinGPS} disabled={gpsLoading}
            style={{ padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background:'white', cursor:'pointer', flexShrink:0, fontSize:18 }}>
            {gpsLoading ? '⏳' : '📍'}
          </button>
        </div>
        <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:14 }}>
          Type an address or tap 📍 to use your current GPS location.
        </p>

        {/* ── END ADDRESS (home/return) ── */}
        <div onClick={() => setUseHome(v => !v)}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:10, border:'1.5px solid var(--border)', background: useHome ? 'var(--blue-light)' : 'white', cursor:'pointer', marginBottom:8 }}>
          <div style={{ width:20, height:20, borderRadius:6, border:`2px solid ${useHome ? 'var(--blue)' : 'var(--border)'}`, background: useHome ? 'var(--blue)' : 'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            {useHome && <span style={{ color:'white', fontSize:13, fontWeight:900 }}>✓</span>}
          </div>
          <span style={{ fontWeight:600, fontSize:14 }}>🏠 Return to a different address</span>
        </div>
        {useHome && (
          <input
            className="form-input"
            value={endAddress}
            onChange={e => setEndAddress(e.target.value)}
            placeholder="Home address / last stop"
            style={{ marginBottom:14 }}
          />
        )}

        {/* ── FILTER MODE ── */}
        <p className="section-header" style={{ marginTop:4 }}>Pick Customers From</p>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => { setFilterMode(f.id); clearAll() }}
              style={{
                padding:'7px 14px', borderRadius:20, border:'1.5px solid', cursor:'pointer',
                fontWeight:700, fontSize:12,
                borderColor: filterMode === f.id ? 'var(--blue)' : 'var(--border)',
                background: filterMode === f.id ? 'var(--blue)' : 'white',
                color: filterMode === f.id ? 'white' : 'var(--text)',
              }}>
              {f.label}
            </button>
          ))}
        </div>

        {/* ── CUSTOMER SELECTION ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <p style={{ fontWeight:700, fontSize:13 }}>
            {pool.length} customer{pool.length !== 1 ? 's' : ''} · {selectedCount} selected
          </p>
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={selectAll} style={{ fontSize:12, color:'var(--blue)', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>Select All</button>
            <button onClick={clearAll} style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>Clear</button>
          </div>
        </div>

        {pool.length === 0 && (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--text-muted)' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
            <p>No customers match this filter right now.</p>
          </div>
        )}

        {pool.map(c => {
          const { color, label } = getCustomerColor(c)
          const isSelected = selected.has(c.id)
          return (
            <div key={c.id} onClick={() => toggleCustomer(c.id)}
              style={{
                display:'flex', alignItems:'center', gap:12, padding:'10px 14px',
                borderRadius:12, marginBottom:6, cursor:'pointer', transition:'all 0.15s',
                border: `1.5px solid ${isSelected ? color : 'var(--border)'}`,
                background: isSelected ? `${color}12` : 'white',
                borderLeft: `4px solid ${color}`,
              }}>
              {/* Checkbox */}
              <div style={{
                width:22, height:22, borderRadius:6, flexShrink:0,
                border: `2px solid ${isSelected ? color : 'var(--border)'}`,
                background: isSelected ? color : 'white',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {isSelected && <span style={{ color:'white', fontSize:13, fontWeight:900 }}>✓</span>}
              </div>

              {/* Info */}
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:14, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {c.business_name || c.full_name}
                </p>
                <p style={{ fontSize:11, color:'var(--text-muted)' }}>{c.area || c.full_name}</p>
              </div>

              {/* Status label */}
              <span style={{ fontSize:10, color, fontWeight:700, flexShrink:0, textAlign:'right', maxWidth:80 }}>{label}</span>
            </div>
          )
        })}

        {/* ── BUILD ROUTE BUTTON ── */}
        {selectedCount > 0 && (
          <div style={{ position:'fixed', bottom:'calc(var(--nav-height) + 12px)', left:'50%', transform:'translateX(-50%)', width:'calc(100% - 32px)', maxWidth:600, zIndex:50 }}>
            <button onClick={buildRoute}
              style={{
                width:'100%', padding:'15px', borderRadius:14, border:'none', cursor:'pointer',
                background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white',
                fontWeight:800, fontSize:16, boxShadow:'0 4px 20px rgba(37,99,235,0.4)',
              }}>
              🗺️ Build Route ({selectedCount} stop{selectedCount !== 1 ? 's' : ''})
            </button>
          </div>
        )}
      </div>

      {/* ── ROUTE RESULT MODAL ── */}
      {optimized && route.length > 0 && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', zIndex:200, display:'flex', alignItems:'flex-end' }}
          onClick={() => setOptimized(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'white', borderRadius:'20px 20px 0 0', width:'100%', maxHeight:'80vh', overflowY:'auto', padding:'20px 20px 40px' }}>
            <div style={{ width:40, height:4, borderRadius:2, background:'var(--border)', margin:'0 auto 16px' }} />

            <h2 style={{ fontSize:18, marginBottom:4 }}>
              🗺️ Optimized Route — {route.length} stops
            </h2>
            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>
              Nearest-neighbour order from your starting point
            </p>

            {/* Route list */}
            <div style={{ marginBottom:16 }}>
              {/* Start */}
              <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'#16a34a', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>S</div>
                <p style={{ fontSize:13, fontWeight:600, color:'#16a34a' }}>
                  {startAddress.match(/^-?\d+\.\d+,-?\d+\.\d+$/) ? '📍 Current location' : startAddress}
                </p>
              </div>

              {route.map((c, i) => {
                const { color, label } = getCustomerColor(c)
                return (
                  <div key={c.id} style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:color, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:13, fontWeight:700 }}>{c.business_name || c.full_name}</p>
                      <p style={{ fontSize:10, color:'var(--text-muted)' }}>{c.area} · {label}</p>
                    </div>
                    {c.phone && (
                      <a href={`tel:${c.phone}`} onClick={e => e.stopPropagation()}
                        style={{ fontSize:18, textDecoration:'none' }}>📞</a>
                    )}
                  </div>
                )
              })}

              {/* End */}
              {useHome && endAddress && (
                <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:8 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'#7c3aed', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:12, flexShrink:0 }}>🏠</div>
                  <p style={{ fontSize:13, fontWeight:600, color:'#7c3aed' }}>{endAddress}</p>
                </div>
              )}
            </div>

            {/* Open in Google Maps */}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              style={{
                display:'block', width:'100%', padding:'15px', borderRadius:12,
                background:'linear-gradient(135deg,#16a34a,#15803d)', color:'white',
                fontWeight:800, fontSize:16, textAlign:'center', textDecoration:'none',
                boxShadow:'0 4px 16px rgba(22,163,74,0.4)', boxSizing:'border-box',
                marginBottom:10,
              }}>
              🗺️ Open in Google Maps
            </a>

            <p style={{ fontSize:11, color:'var(--text-muted)', textAlign:'center' }}>
              Opens turn-by-turn navigation with all stops pre-loaded
            </p>

            <button onClick={() => setOptimized(false)}
              style={{ width:'100%', marginTop:8, padding:'12px', borderRadius:12, border:'1px solid var(--border)', background:'white', color:'var(--text-muted)', fontSize:14, cursor:'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
