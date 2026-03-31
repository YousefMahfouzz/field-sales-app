import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { getCurrentPosition, findNearbyCustomers } from '../lib/geo'
import CustomerCard from '../components/CustomerCard'
import NearbyCustomerModal from '../components/NearbyCustomerModal'

const STATUSES = ['all', 'active', 'priority', 'follow_up', 'avoid', 'do_not_visit']
const STATUS_LABELS = { all: 'All', active: 'Active', priority: 'Priority', follow_up: 'Follow Up', avoid: 'Avoid', do_not_visit: 'Do Not Visit' }

export default function CustomersPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { customers, loading } = useCustomers()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') === 'overdue' ? 'all' : 'all')
  const [sortBy, setSortBy] = useState('next_visit')
  const [gpsLoading, setGpsLoading] = useState(false)
  const [nearbyCustomers, setNearbyCustomers] = useState([])
  const [capturedLocation, setCapturedLocation] = useState(null)

  const today = new Date().toISOString().split('T')[0]
  const filterOverdue = searchParams.get('filter') === 'overdue'

  const filtered = useMemo(() => {
    let list = [...customers]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (c) =>
          c.full_name?.toLowerCase().includes(q) ||
          c.business_name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.area?.toLowerCase().includes(q)
      )
    }
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter)
    if (filterOverdue) list = list.filter((c) => c.next_visit_date && c.next_visit_date < today && c.status !== 'avoid')

    if (sortBy === 'next_visit') list.sort((a, b) => (a.next_visit_date || '9999') < (b.next_visit_date || '9999') ? -1 : 1)
    else if (sortBy === 'last_visit') list.sort((a, b) => (b.last_visit_date || '') < (a.last_visit_date || '') ? -1 : 1)
    else if (sortBy === 'name') list.sort((a, b) => a.full_name.localeCompare(b.full_name))
    return list
  }, [customers, search, statusFilter, sortBy, filterOverdue, today])

  const handleAddHere = async () => {
    setGpsLoading(true)
    try {
      const pos = await getCurrentPosition()
      const { latitude: lat, longitude: lng } = pos.coords
      setCapturedLocation({ lat, lng })
      const nearby = findNearbyCustomers(customers, lat, lng, 20)
      if (nearby.length > 0) setNearbyCustomers(nearby)
      else navigate(`/customers/new?lat=${lat}&lng=${lng}`)
    } catch {
      alert('Could not get location. Please allow location access.')
    } finally {
      setGpsLoading(false)
    }
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
          onChange={(e) => setSearch(e.target.value)}
          style={{ background: 'var(--gray-light)', border: '1.5px solid var(--border)', borderRadius: 24, padding: '11px 14px 11px 40px', width: '100%', fontSize: 16 }}
        />
      </div>

      {/* Status filter pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 12px', scrollbarWidth: 'none' }}>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              flexShrink: 0,
              padding: '6px 14px',
              borderRadius: 20,
              border: '1.5px solid',
              borderColor: statusFilter === s ? 'var(--blue)' : 'var(--border)',
              background: statusFilter === s ? 'var(--blue)' : 'var(--white)',
              color: statusFilter === s ? 'white' : 'var(--text)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="text-sm text-muted">Sort:</span>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{ fontSize: 14, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--white)' }}
        >
          <option value="next_visit">Next visit</option>
          <option value="last_visit">Last visit</option>
          <option value="name">Name</option>
        </select>
        <span className="text-sm text-muted" style={{ marginLeft: 'auto' }}>{filtered.length} customers</span>
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
        {filtered.map((c) => (
          <CustomerCard key={c.id} customer={c} onQuickAction={(c) => navigate(`/visit/${c.id}`)} />
        ))}
      </div>

      <button className="fab" onClick={handleAddHere} disabled={gpsLoading}>
        {gpsLoading ? '📡 Getting location...' : '📍 Add Customer Here'}
      </button>

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
