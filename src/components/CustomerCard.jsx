import { useNavigate } from 'react-router-dom'

const STATUS_LABELS = {
  active: 'Active',
  follow_up: 'Follow Up',
  priority: 'Priority',
  avoid: 'Avoid',
  do_not_visit: 'Do Not Visit',
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export function AreaBadge({ area }) {
  if (!area) return null
  const color = area.includes(' MS') ? '#dc2626'
    : area.includes(' AL') ? '#c2410c'
    : area.includes(' OH') || area.includes('Cleveland') || area.includes('Akron') || area.includes('Euclid') || area.includes('Warrensville') || area.includes('Maple Heights') || area.includes('Parma') || area.includes('Lorain') || area.includes('Canton') ? '#0284c7'
    : area.includes('East') || area.includes('Kenner') || area.includes('Westbank') || area.includes('Chalmette') || area.includes('Northshore') ? '#7c3aed'
    : area.includes('Baton Rouge') || area.includes('Baker') ? '#16a34a'
    : area.includes('Shreveport') || area.includes('Monroe') ? '#d97706'
    : '#2563eb'
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: color + '18', color, fontWeight: 600 }}>
      📍 {area}
    </span>
  )
}

export default function CustomerCard({ customer, onQuickAction }) {
  const navigate = useNavigate()
  const isOverdue = customer.next_visit_date && new Date(customer.next_visit_date) < new Date()
  const isDueToday = customer.next_visit_date &&
    new Date(customer.next_visit_date).toDateString() === new Date().toDateString()

  return (
    <div
      className="card card-tap"
      onClick={() => navigate(`/customers/${customer.id}`)}
    >
      <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.full_name}</h3>
          {customer.business_name && (
            <p className="text-muted" style={{ fontSize: 13 }}>{customer.business_name}</p>
          )}
        </div>
        <StatusBadge status={customer.status} />
      </div>

      {customer.area && (
        <div style={{ marginBottom: 6 }}>
          <AreaBadge area={customer.area} />
        </div>
      )}

      <div className="flex gap-8" style={{ flexWrap: 'wrap', marginBottom: 10 }}>
        {customer.phone && (
          <a
            href={`tel:${customer.phone}`}
            className="text-sm"
            style={{ color: 'var(--blue)' }}
            onClick={(e) => e.stopPropagation()}
          >
            📞 {customer.phone}
          </a>
        )}
        {customer.area && (
          <span className="text-sm text-muted">📍 {customer.area}</span>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div>
          {isDueToday && (
            <span style={{ fontSize: 13, color: 'var(--amber)', fontWeight: 600 }}>📅 Due today</span>
          )}
          {isOverdue && !isDueToday && (
            <span style={{ fontSize: 13, color: 'var(--red)', fontWeight: 600 }}>⚠️ Overdue</span>
          )}
          {!isOverdue && !isDueToday && customer.next_visit_date && (
            <span className="text-sm text-muted">
              Next: {new Date(customer.next_visit_date).toLocaleDateString()}
            </span>
          )}
        </div>

        <button
          className="btn btn-sm btn-primary"
          onClick={(e) => {
            e.stopPropagation()
            onQuickAction?.(customer)
          }}
        >
          Log Visit
        </button>
      </div>
    </div>
  )
}
