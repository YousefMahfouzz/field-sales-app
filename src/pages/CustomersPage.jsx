import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { getCurrentPosition, findNearbyCustomers } from '../lib/geo'
import CustomerCard from '../components/CustomerCard'
import NearbyCustomerModal from '../components/NearbyCustomerModal'

const STATUSES = ['all', 'active', 'priority', 'follow_up', 'do_not_visit', 'avoid']
// STATUS_LABELS defined inside component for Arabic support
const STATUS_COLORS = { active: '#16a34a', priority: '#d97706', follow_up: '#0891b2', avoid: '#dc2626', do_not_visit: '#6b7280' }

export default function CustomersPage() {
  const navigate = useNavigate()
  const { isArabic } = useSettings()
  const STATUS_LABELS = isArabic
    ? { all:'الكل', active:'نشط', priority:'أولوية', follow_up:'متابعة', do_not_visit:'لا تزور', avoid:'⛔ تجنب' }
    : { all:'All', active:'Active', priority:'Priority', follow_up:isArabic ? 'متابعة' : 'Follow Up', do_not_visit:isArabic ? 'لا تزور' : 'Do Not Visit', avoid:'⛔ Avoid' }
  const [searchParams] = useSearchParams()
  const { customers, loading } = useCustomers()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('next_visit')
  const [groupByArea, setGroupByArea] = useState(true)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [nearbyCustomers, setNearbyCustomers] = useState([])
  const [capturedLocation, setCapturedLocation] = useState(null)

  const today = useMemo(() => new Date().toLocaleDateString('en-CA'), [])
  const filterOverdue = searchParams.get('filter') === 'overdue'

  const filtered = useMemo(() => {
    let list = [...customers]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(c =>
        c.full_name?.toLowerCase().includes(q) ||
        c.business_name?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.area?.toLowerCase().includes(q)
      )
    }
    // 'all' hides avoid customers — they only appear in the dedicated 'avoid' tab
  if (statusFilter === 'all') list = list.filter(c => c.status !== 'avoid')
  else list = list.filter(c => c.status === statusFilter)
    if (filterOverdue) list = list.filter(c => c.next_visit_date && c.next_visit_date < today && c.status !== 'avoid')
    if (sortBy === 'next_visit') list.sort((a, b) => (a.next_visit_date || '9999') < (b.next_visit_date || '9999') ? -1 : 1)
    else if (sortBy === 'name') list.sort((a, b) => (a.business_name || a.full_name).localeCompare(b.business_name || b.full_name))
    else if (sortBy === 'last_visit') list.sort((a, b) => (b.last_visit_date || '') < (a.last_visit_date || '') ? -1 : 1)
    return list
  }, [customers, search, statusFilter, sortBy, filterOverdue, today])

  // Group by area
  const grouped = useMemo(() => {
    if (!groupByArea || search.trim() || statusFilter !== 'all') return null
    const map = {}
    for (const c of filtered) {
      const area = c.area?.trim() || 'No Area'
      if (!map[area]) map[area] = []
      map[area].push(c)
    }
    // Sort areas alphabetically, but put "No Area" last
    return Object.entries(map).sort(([a], [b]) => {
      if (a === 'No Area') return 1
      if (b === 'No Area') return -1
      return a.localeCompare(b)
    })
  }, [filtered, groupByArea, search, statusFilter])

  const handleAddHere = async () => {
    setGpsLoading(true)
    try {
      const pos = await getCurrentPosition()
      const { latitude: lat, longitude: lng } = pos.coords
      setCapturedLocation({ lat, lng })
      const nearby = findNearbyCustomers(customers, lat, lng, 250)
      if (nearby.length > 0) setNearbyCustomers(nearby)
      else navigate(`/customers/new?lat=${lat}&lng=${lng}`)
    } catch {
      alert('Could not get location. Please allow location access.')
    } finally {
      setGpsLoading(false)
    }
  }

  const AreaSection = ({ area, items }) => {
    const overdueCount = items.filter(c => c.next_visit_date && c.next_visit_date < today && c.status !== 'avoid').length
    const dueTodayCount = items.filter(c => c.next_visit_date?.startsWith(today) && c.status !== 'avoid').length
    return (
      <div style={{ marginBottom: 8 }}>
        {/* Area header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 0 6px', marginTop: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)', letterSpacing: 0.2 }}>
              📍 {area}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: 'var(--text-muted)',
              background: 'var(--gray-light)', borderRadius: 10,
              padding: '2px 8px', border: '1px solid var(--border)',
            }}>{items.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {dueTodayCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', background: '#eff6ff', borderRadius: 10, padding: '2px 7px', border: '1px solid #bfdbfe' }}>
                {dueTodayCount} isArabic ? 'مستحق اليوم' : 'due today'
              </span>
            )}
            {overdueCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', borderRadius: 10, padding: '2px 7px', border: '1px solid #fca5a5' }}>
                {overdueCount} isArabic ? 'متأخر' : 'overdue'
              </span>
            )}
          </div>
        </div>
        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
        {/* Cards */}
        {items.map(c => (
          <CustomerCard key={c.id} customer={c} onQuickAction={() => navigate(`/visit/${c.id}`)} />
        ))}
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn btn-primary btn-sm" onClick={() => navigate('/customers/new')}>+ Add</button>
      </div>

      {/* Search */}
      <div className="search-bar" style={{ marginTop: 12 }}>
        <span className="search-icon">🔍</span>
        <input
          type="search"
          placeholder="Search name, phone, area..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: 'var(--gray-light)', border: '1.5px solid var(--border)', borderRadius: 24, padding: '11px 14px 11px 40px', width: '100%', fontSize: 16 }}
        />
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 10px', scrollbarWidth: 'none' }}>
        {STATUSES.map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20,
            border: '1.5px solid',
            borderColor: statusFilter === s ? (STATUS_COLORS[s] || 'var(--blue)') : 'var(--border)',
            background: statusFilter === s ? (STATUS_COLORS[s] || 'var(--blue)') : 'var(--white)',
            color: statusFilter === s ? 'white' : 'var(--text)',
            fontSize: 13, fontWeight: statusFilter === s ? 700 : 500, cursor: 'pointer',
          }}>
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Sort + group toggle */}
      <div style={{ padding: '0 16px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)', color: 'var(--text)' }}>
          <option value="next_visit">Next visit</option>
          <option value="name">Name</option>
          <option value="last_visit">Last visit</option>
        </select>

        {/* Group by area toggle */}
        <button onClick={() => setGroupByArea(g => !g)} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 11px', borderRadius: 8, fontSize: 13,
          border: `1.5px solid ${groupByArea ? 'var(--blue)' : 'var(--border)'}`,
          background: groupByArea ? 'var(--blue-light)' : 'var(--white)',
          color: groupByArea ? 'var(--blue)' : 'var(--text-muted)',
          cursor: 'pointer', fontWeight: groupByArea ? 700 : 400,
        }}>
          📍 {groupByArea ? 'By Area' : 'By Area'}
          <span style={{
            width: 28, height: 16, borderRadius: 8, position: 'relative', display: 'inline-block',
            background: groupByArea ? 'var(--blue)' : '#d1d5db',
            transition: 'background 0.2s',
          }}>
            <span style={{
              position: 'absolute', top: 2, left: groupByArea ? 13 : 2,
              width: 12, height: 12, borderRadius: '50%', background: 'var(--white)',
              transition: 'left 0.2s',
            }} />
          </span>
        </button>

        <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{filtered.length}</span>
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        {loading && <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <h3>No customers found</h3>
            <p style={{ marginTop: 8 }}>Try changing your search or filters.</p>
          </div>
        )}

        {/* Grouped by area */}
        {!loading && grouped && grouped.map(([area, items]) => (
          <AreaSection key={area} area={area} items={items} />
        ))}

        {/* Flat list (search active or area grouping off) */}
        {!loading && !grouped && filtered.map(c => (
          <CustomerCard key={c.id} customer={c} onQuickAction={() => navigate(`/visit/${c.id}`)} />
        ))}
      </div>

      <button className="fab" onClick={handleAddHere} disabled={gpsLoading}>
        {gpsLoading ? '📡 Getting location...' : '📍 Add Customer Here'}
      </button>

      {nearbyCustomers.length > 0 && capturedLocation && (
        <NearbyCustomerModal
          customers={nearbyCustomers}
          onUseExisting={c => navigate(`/customers/${c.id}`)}
          onLogVisit={c => navigate(`/visit/${c.id}`)}
          onCreateNew={() => navigate(`/customers/new?lat=${capturedLocation.lat}&lng=${capturedLocation.lng}`)}
          onClose={() => setNearbyCustomers([])}
        />
      )}
    </div>
  )
}
