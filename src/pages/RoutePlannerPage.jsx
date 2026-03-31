import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { useTerritorySchedule } from '../hooks/useTerritorySchedule'
import { getCurrentPosition, optimizeRoute, routeTotalDistance } from '../lib/geo'

const REGION_COLORS = {
  GNO: '#7c3aed', 'SE Louisiana': '#0891b2', 'Central LA': '#16a34a',
  'N Louisiana': '#d97706', 'SW Louisiana': '#0369a1',
  Mississippi: '#dc2626', Alabama: '#c2410c',
}

function getAreaColor(area) {
  if (!area) return '#6b7280'
  if (area.includes(' MS')) return '#dc2626'
  if (area.includes(' AL')) return '#c2410c'
  if (area.includes('East') || area.includes('Kenner') || area.includes('Westbank') || area.includes('Chalmette') || area.includes('Northshore')) return '#7c3aed'
  if (area.includes('Baton Rouge') || area.includes('Baker')) return '#16a34a'
  if (area.includes('Shreveport') || area.includes('Monroe')) return '#d97706'
  return '#2563eb'
}

export default function RoutePlannerPage() {
  const navigate = useNavigate()
  const { customers } = useCustomers()
  const { schedule, DAYS } = useTerritorySchedule()
  const [selected, setSelected] = useState(new Set())
  const [route, setRoute] = useState([])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [optimized, setOptimized] = useState(false)
  const [filter, setFilter] = useState('suggested')

  const today = new Date().toISOString().split('T')[0]
  const todayName = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  const todayTerritories = Object.entries(schedule).filter(([, d]) => d === todayName).map(([b]) => b)

  // Suggested = due today + overdue, excluding avoid
  const suggested = customers.filter(
    (c) => c.status !== 'avoid' && c.next_visit_date && c.next_visit_date <= today
  )
  const priority = customers.filter((c) => c.status === 'priority')
  const active = customers.filter((c) => c.status === 'active')
  const allSelectable = customers.filter((c) => c.status !== 'avoid')

  const displayed = filter === 'suggested' ? suggested
    : filter === 'priority' ? priority
    : filter === 'active' ? active
    : allSelectable

  const toggleCustomer = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setOptimized(false)
    setRoute([])
  }

  const selectAll = () => {
    setSelected(new Set(displayed.map((c) => c.id)))
    setOptimized(false)
    setRoute([])
  }

  // Always get fresh GPS — route always starts from your current location
  const getMyLocation = async () => {
    const pos = await getCurrentPosition()
    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
    setCurrentLocation(loc)
    return loc
  }

  const handlePlanMyDay = async () => {
    setGpsLoading(true)
    try {
      const loc = await getMyLocation()
      const ids = new Set(suggested.map((c) => c.id))
      setSelected(ids)
      setRoute(optimizeRoute(suggested, loc.lat, loc.lng))
      setOptimized(true)
    } catch {
      alert('Could not get your location. Please allow location access and try again.')
    } finally {
      setGpsLoading(false)
    }
  }

  const handleOptimize = async () => {
    const toVisit = customers.filter((c) => selected.has(c.id))
    if (!toVisit.length) { alert('Select at least one customer.'); return }
    setGpsLoading(true)
    try {
      // Always get fresh location — never reuse stale location
      const loc = await getMyLocation()
      setRoute(optimizeRoute(toVisit, loc.lat, loc.lng))
      setOptimized(true)
    } catch {
      alert('Could not get your location. Please allow location access and try again.')
    } finally {
      setGpsLoading(false)
    }
  }

  const totalDist = currentLocation && route.length
    ? routeTotalDistance(route, currentLocation.lat, currentLocation.lng)
    : null

  const openGoogleMaps = () => {
    if (!route.length) return
    const waypoints = route.slice(0, -1).map((c) => `${c.lat},${c.lng}`).join('/')
    const dest = route[route.length - 1]
    const origin = currentLocation ? `${currentLocation.lat},${currentLocation.lng}` : ''
    const url = `https://www.google.com/maps/dir/${origin}/${waypoints}/${dest.lat},${dest.lng}`
    window.open(url, '_blank')
  }

  const openAppleMaps = () => {
    if (!route.length) return
    const dest = route[route.length - 1]
    const url = `http://maps.apple.com/?daddr=${dest.lat},${dest.lng}`
    window.open(url, '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <h1>Route Planner</h1>
        <span className="text-sm text-muted">{selected.size} selected</span>
      </div>

      <div className="page" style={{ paddingTop: 12 }}>

        {/* Today's Territories Banner */}
        {todayTerritories.length > 0 && (
          <div className="card" style={{ marginBottom: 12, background: '#f5f3ff', border: '1px solid #c4b5fd' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>
              📅 Today is {todayName} — {todayTerritories.length} territory{todayTerritories.length > 1 ? 's' : ''} scheduled
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {todayTerritories.map(block => {
                const color = getAreaColor(block)
                const count = customers.filter(c => c.area === block && c.status !== 'avoid' && c.status !== 'do_not_visit').length
                return (
                  <span key={block} style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                    background: color + '20', color, border: `1px solid ${color}40`
                  }}>
                    {block} {count > 0 ? `· ${count} active` : '· no active yet'}
                  </span>
                )
              })}
            </div>
            <button
              className="btn btn-sm"
              onClick={() => {
                // Select all active customers in today's territories
                const ids = customers
                  .filter(c => todayTerritories.includes(c.area) && c.status !== 'avoid' && c.status !== 'do_not_visit' && c.lat && c.lng)
                  .map(c => c.id)
                setSelected(new Set(ids))
              }}
              style={{ fontSize: 12, background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}
            >
              ✅ Select today's territories
            </button>
          </div>
        )}

        {/* Plan My Day */}
        <button
          className="btn btn-primary btn-full"
          onClick={handlePlanMyDay}
          disabled={gpsLoading}
          style={{ fontSize: 17, padding: '14px 20px', marginBottom: 12 }}
        >
          {gpsLoading ? '📡 Getting location...' : '🧭 Plan My Day'}
        </button>
        <p className="text-xs text-muted" style={{ textAlign: 'center', marginBottom: 16 }}>
          Auto-selects overdue + due today customers and optimizes route
        </p>

        {/* Optimized route result */}
        {optimized && route.length > 0 && (
          <div className="card" style={{ background: 'var(--blue-light)', marginBottom: 16, border: '1px solid #bfdbfe' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 12 }}>
              <div>
                <h3 style={{ color: 'var(--blue-dark)' }}>✅ Route ready</h3>
                <p className="text-sm text-muted">{route.length} stops · ~{totalDist} km</p>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              {route.map((c, i) => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < route.length - 1 ? '1px solid #dbeafe' : 'none' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    background: 'var(--blue)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</p>
                    {c.business_name && <p className="text-xs text-muted">{c.business_name}</p>}
                    {c.area && (
                      <span style={{ fontSize: 11, color: getAreaColor(c.area), fontWeight: 600 }}>📍 {c.area}</span>
                    )}
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate(`/visit/${c.id}`)}
                    style={{ flexShrink: 0, padding: '6px 10px', fontSize: 12 }}
                  >
                    Log
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={openGoogleMaps}>
                🗺️ Google Maps
              </button>
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={openAppleMaps}>
                🍎 Apple Maps
              </button>
            </div>
          </div>
        )}

        {/* Manual selection */}
        <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
          <p className="section-header" style={{ padding: 0 }}>Or select manually</p>
          <button className="btn btn-ghost btn-sm" onClick={selectAll}>Select all</button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { key: 'suggested', label: `Due (${suggested.length})` },
            { key: 'priority', label: `Priority (${priority.length})` },
            { key: 'active', label: 'Active' },
            { key: 'all', label: 'All' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              style={{
                padding: '6px 12px',
                borderRadius: 20,
                border: '1.5px solid',
                borderColor: filter === key ? 'var(--blue)' : 'var(--border)',
                background: filter === key ? 'var(--blue)' : 'white',
                color: filter === key ? 'white' : 'var(--text)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {displayed.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>No customers in this category.</p>
          </div>
        )}

        {displayed.map((c) => {
          const isSelected = selected.has(c.id)
          const isOverdue = c.next_visit_date && c.next_visit_date < today
          return (
            <div
              key={c.id}
              className="card card-tap"
              onClick={() => toggleCustomer(c.id)}
              style={{
                border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                background: isSelected ? 'var(--blue-light)' : 'white',
              }}
            >
              <div className="flex items-center gap-12">
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                  background: isSelected ? 'var(--blue)' : 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 14, color: 'white',
                }}>
                  {isSelected && '✓'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 15 }}>{c.full_name}</p>
                  {c.business_name && <p className="text-xs text-muted">{c.business_name}</p>}
                  {c.area && (
                    <p style={{ fontSize: 11, color: getAreaColor(c.area), fontWeight: 600, marginTop: 2 }}>📍 {c.area}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {isOverdue && <p style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600 }}>⚠️ Overdue</p>}
                  {c.next_visit_date && !isOverdue && (
                    <p className="text-xs text-muted">{new Date(c.next_visit_date).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {selected.size > 0 && !optimized && (
          <button
            className="btn btn-success btn-full"
            onClick={handleOptimize}
            disabled={gpsLoading}
            style={{ marginTop: 8, fontSize: 16, padding: '14px 20px' }}
          >
            {gpsLoading ? '📡 Getting location...' : `🔀 Optimize ${selected.size} Stops`}
          </button>
        )}
      </div>
    </div>
  )
}
