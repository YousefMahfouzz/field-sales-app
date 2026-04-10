import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { getCustomerColor } from '../lib/customerAvailability'

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

export default function CustomerCard({ customer, onQuickAction, onQuickSale }) {
  const navigate = useNavigate()
  const isOverdue = customer.next_visit_date && new Date(customer.next_visit_date) < new Date()
  const isDueToday = customer.next_visit_date &&
    new Date(customer.next_visit_date).toDateString() === new Date().toDateString()

  const { color: smartColor, label: availLabel } = getCustomerColor(customer)
  return (
    <div
      className="card card-tap"
      onClick={() => navigate(`/customers/${customer.id}`)}
      style={{ borderLeft: `4px solid ${smartColor}` }}
    >
      <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 15, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.full_name}</h3>
          {customer.business_name && (
            <p className="text-muted" style={{ fontSize: 13 }}>{customer.business_name}</p>
          )}
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
          <StatusBadge status={customer.status} />
          {customer.best_time && <span style={{ fontSize:10, color:'var(--text-muted)' }}>⏰ {customer.best_time}</span>}
        </div>
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
            style={{ color: 'var(--blue)', display:'flex', alignItems:'center', gap:4, fontSize:13, textDecoration:'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            <><Icon name='phone' size={13} color='var(--blue)' strokeWidth={2} /> {customer.phone}</>
          </a>
        )}
      </div>

      {/* What they wanted last time */}
      {customer.wants_next && (
        <div style={{ marginBottom: 8, padding: '5px 10px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
          <p style={{ fontSize: 11, color: '#1d4ed8', fontWeight: 600 }}>📋 {customer.wants_next}</p>
        </div>
      )}

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

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="btn btn-sm"
            style={{ background: 'var(--green)', color: 'white', fontSize: 12, padding: '5px 10px' }}
            onClick={(e) => {
              e.stopPropagation()
              if (onQuickSale) onQuickSale(customer)
              else navigate(`/visit/${customer.id}?mode=sale`)
            }}
          >
            💰 Sale
          </button>
          <button
            className="btn btn-sm btn-primary"
            style={{ fontSize: 12, padding: '5px 10px' }}
            onClick={(e) => {
              e.stopPropagation()
              onQuickAction?.(customer)
            }}
          >
            📋 Visit
          </button>
        </div>
      </div>
    </div>
  )
}
