import { useNavigate } from 'react-router-dom'

export default function NearbyCustomerModal({ customers, onUseExisting, onLogVisit, onCreateNew, onClose }) {
  const navigate = useNavigate()
  const first = customers[0]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 style={{ marginBottom: 8 }}>📍 Customer nearby</h2>
        <p className="text-muted" style={{ marginBottom: 20 }}>
          A customer already exists near this location (within 20m).
        </p>

        <div className="card" style={{ marginBottom: 16, background: '#eff6ff' }}>
          <h3>{first.full_name}</h3>
          {first.business_name && <p className="text-sm text-muted">{first.business_name}</p>}
          {first.phone && <p className="text-sm" style={{ marginTop: 4 }}>📞 {first.phone}</p>}
        </div>

        {customers.length > 1 && (
          <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
            +{customers.length - 1} more nearby customer{customers.length > 2 ? 's' : ''}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn btn-primary btn-full"
            onClick={() => { onUseExisting(first); onClose() }}
          >
            👤 View existing customer
          </button>
          <button
            className="btn btn-success btn-full"
            onClick={() => { onLogVisit(first); onClose() }}
          >
            ✅ Log visit for this customer
          </button>
          <button
            className="btn btn-ghost btn-full"
            onClick={() => { onCreateNew(); onClose() }}
          >
            ➕ Create new customer anyway
          </button>
        </div>
      </div>
    </div>
  )
}
