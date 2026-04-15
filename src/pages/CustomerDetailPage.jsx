import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { useVisits } from '../hooks/useVisits'
import { useAuth } from '../hooks/useAuth'
import { StatusBadge, AreaBadge } from '../components/CustomerCard'
import InvoiceModal from '../components/InvoiceModal'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import { buildCalendarUrl } from '../lib/calendarUtils'

function daysUntilVisit(dateStr) {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0,0,0,0)
  const visit = new Date(dateStr + 'T00:00:00')
  const diff = Math.round((visit - today) / 86400000)
  if (diff === 0) return 'Visit today!'
  if (diff === 1) return 'Visit tomorrow'
  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff)!==1?'s':''} overdue`
  return `Visit in ${diff} day${diff!==1?'s':''}`
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, canSeeProfit } = useAuth()
  const { customers, loading: customersLoading, deleteCustomer, updateCustomer } = useCustomers()
  const { visits, fetchVisitsForCustomer } = useVisits()
  const [showDelete, setShowDelete] = useState(false)
  const [invoiceVisit, setInvoiceVisit] = useState(null) // visit to show invoice for

  const customer = customers.find(c => c.id === id)

  useEffect(() => { if (id) fetchVisitsForCustomer(id) }, [id, fetchVisitsForCustomer])

  // Show loading while customers are still being fetched
  if (customersLoading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p className="text-muted text-sm">Loading customer...</p>
    </div>
  )

  if (!customer) return (
    <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
      <p className="text-muted">Customer not found.</p>
      <button className="btn btn-ghost" onClick={() => navigate('/customers')} style={{ marginTop: 16 }}>Back</button>
    </div>
  )

  const today = new Date().toISOString().split('T')[0]
  const isOverdue = customer.next_visit_date && customer.next_visit_date < today
  const profit = (customer.sale_amount || 0) - (customer.cost || 0)

  const handleDelete = async () => {
    await deleteCustomer(id)
    navigate('/customers')
  }

  const openMaps = () => {
    if (customer.lat && customer.lng) {
      window.open(`https://maps.google.com/?q=${customer.lat},${customer.lng}`, '_blank')
    }
  }

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <h1 style={{ fontSize: 17, flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.full_name}</h1>
        <button onClick={() => navigate(`/customers/${id}/edit`)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✏️</button>
      </div>

      <div className="page" style={{ paddingTop: 12 }}>

        {/* Identity card */}
        <div className="card" style={{ marginBottom: 10 }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
            <StatusBadge status={customer.status} />
            {customer.rating && <span>{'⭐'.repeat(customer.rating)}</span>}
          </div>
          <h2 style={{ fontSize: 18, marginBottom: 2 }}>{customer.full_name}</h2>
          {customer.business_name && <p className="text-muted" style={{ fontSize: 14 }}>{customer.business_name}</p>}
          {customer.area && <div style={{ marginTop: 6 }}><AreaBadge area={customer.area} /></div>}
          {customer.address && <p className="text-xs text-muted" style={{ marginTop: 6 }}>{customer.address}</p>}
          {customer.tags?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {customer.tags.map(t => (
                <span key={t} style={{ fontSize: 12, background: 'var(--blue-light)', color: 'var(--blue-dark)', padding: '2px 10px', borderRadius: 20 }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* ─── AVAILABILITY / CONTACT CARD ─── */}
        {(customer.decision_maker || customer.best_time || customer.decision_maker_schedule) && (
          <div className="card" style={{ marginBottom: 10, background: '#fffbeb', border: '1.5px solid #fde68a' }}>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#92400e', marginBottom: 8 }}>🕐 When to visit</p>
            {customer.decision_maker && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>👤</span>
                <div>
                  <p style={{ fontSize: 12, color: '#78350f', fontWeight: 700 }}>Contact / Decision Maker</p>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{customer.decision_maker}</p>
                </div>
              </div>
            )}
            {customer.best_time && (
              <div style={{ display: 'flex', gap: 10, marginBottom: 6, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                <div>
                  <p style={{ fontSize: 12, color: '#78350f', fontWeight: 700 }}>Best time to visit</p>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{customer.best_time}</p>
                </div>
              </div>
            )}
            {customer.decision_maker_schedule && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 18 }}>📅</span>
                <div>
                  <p style={{ fontSize: 12, color: '#78350f', fontWeight: 700 }}>{'Their schedule'}</p>
                  <p style={{ fontSize: 14, fontWeight: 600 }}>{customer.decision_maker_schedule}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── ACTION BUTTONS ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          {customer.phone && (
            <a href={`tel:${customer.phone}`} className="btn btn-ghost" style={{ textAlign: 'center' }}>📞 Call</a>
          )}
          {customer.lat && customer.lng && (
            <button className="btn btn-ghost" onClick={openMaps}>🗺️ Navigate</button>
          )}
          {/* Log Visit — full flow (visited + optional sale) */}
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/visit/${id}?mode=visit`)}
            style={{ background: 'var(--blue)' }}
          >
            📋 Log Visit
          </button>
          {/* Log Sale — skips visit question, goes straight to sale */}
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/visit/${id}?mode=sale`)}
            style={{ background: 'var(--green)' }}
          >
            💰 Log Sale
          </button>
        </div>

        {/* Visit schedule */}
        <div className="card" style={{ marginBottom: 10 }}>
          <p className="section-header" style={{ padding: 0, marginBottom: 10 }}>📅 Visit Schedule</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <p className="text-xs text-muted">Last Visit</p>
              <p className="text-sm" style={{ fontWeight: 600, marginTop: 2 }}>
                {customer.last_visit_date ? new Date(customer.last_visit_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted">Next Visit</p>
              <p className="text-sm" style={{ fontWeight: 600, marginTop: 2, color: isOverdue ? 'var(--red)' : 'var(--text)' }}>
{customer.next_visit_date ? (
                  <span>
                    <span style={{ display:'block' }}>{new Date(customer.next_visit_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span style={{ fontSize:11, color: (() => { const d = daysUntilVisit(customer.next_visit_date); return d?.includes('overdue') ? 'var(--red)' : d?.includes('today') ? '#16a34a' : 'var(--blue)' })(), fontWeight:700 }}>
                      {daysUntilVisit(customer.next_visit_date)}
                    </span>
                  </span>
                ) : '—'}
                {isOverdue && ' ⚠️'}
              </p>
              {customer.next_visit_date && (
                <a href={buildCalendarUrl(customer.next_visit_date, customer.business_name || customer.full_name, {
                  address: customer.address, area: customer.area, phone: customer.phone,
                  notes: customer.wants_next || '',
                })} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-block', marginTop: 4, padding: '2px 8px', borderRadius: 6, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', fontSize: 10, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}>
                  📅 Calendar
                </a>
              )}
            </div>
            <div>
              <p className="text-xs text-muted">Frequency</p>
              <p className="text-sm" style={{ fontWeight: 600, marginTop: 2 }}>Every {customer.visit_frequency_days || 14} days</p>
            </div>
            <div>
              <p className="text-xs text-muted">{'Total Visits'}</p>
              <p className="text-sm" style={{ fontWeight: 600, marginTop: 2 }}>{visits.length}</p>
            </div>
          </div>
        </div>

        {/* Sales summary */}
        {(customer.sale_amount > 0 || customer.bought_before || customer.wants_next) && (
          <div className="card" style={{ marginBottom: 10 }}>
            <p className="section-header" style={{ padding: 0, marginBottom: 10 }}>💰 Sales</p>
            {customer.sale_amount > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: canSeeProfit ? '1fr 1fr 1fr' : '1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <p className="text-xs text-muted">{'Revenue'}</p>
                  <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--green)' }}>${(customer.sale_amount || 0).toFixed(0)}</p>
                </div>
                {canSeeProfit && (
                <div>
                  <p className="text-xs text-muted">{'Cost'}</p>
                  <p style={{ fontWeight: 700, fontSize: 16 }}>${(customer.cost || 0).toFixed(0)}</p>
                </div>
                )}
                {canSeeProfit && (
                <div>
                  <p className="text-xs text-muted">Profit</p>
                  <p style={{ fontWeight: 700, fontSize: 16, color: profit >= 0 ? 'var(--green)' : 'var(--red)' }}>${profit.toFixed(0)}</p>
                </div>
                )}
              </div>
            )}
            {customer.bought_before && (
              <div style={{ marginBottom: 8 }}>
                <p className="text-xs text-muted">{'Bought before'}</p>
                <p className="text-sm" style={{ marginTop: 2 }}>{customer.bought_before}</p>
              </div>
            )}
            {customer.wants_next && (
              <div style={{ padding: '8px 12px', background: 'var(--blue-light)', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                <p className="text-xs" style={{ color: 'var(--blue-dark)', fontWeight: 700, marginBottom: 2 }}>📋 Wants next time</p>
                <p className="text-sm" style={{ color: 'var(--blue-dark)' }}>{customer.wants_next}</p>
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {customer.notes && (
          <div className="card" style={{ marginBottom: 10 }}>
            <p className="section-header" style={{ padding: 0, marginBottom: 6 }}>📝 Notes</p>
            <p className="text-sm">{customer.notes}</p>
          </div>
        )}

        {/* Visit history */}
        <p className="section-header">🕒 Visit History</p>
        {visits.length === 0 && <p className="text-muted text-sm" style={{ marginBottom: 16 }}>No visits yet.</p>}
        {visits.map(v => {
          const saleTotal = v.sale_items?.reduce((s, i) => s + i.qty * i.unit_price, 0) || v.sale_amount || 0
          return (
            <div key={v.id} className="card" style={{ marginBottom: 8, padding: '10px 14px' }}>
              <div className="flex justify-between items-center">
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>
                    {v.was_visited ? '✅ Visited' : '📞 Follow-up'}
                    {v.had_sale ? ' · 💰 Sale' : ''}
                  </p>
                  <p className="text-xs text-muted">{new Date(v.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  {saleTotal > 0 && (
                    <span style={{ fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>${saleTotal.toFixed(0)}</span>
                  )}
                  {v.had_sale && v.sale_items?.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setInvoiceVisit(v) }}
                      style={{ padding:'3px 8px', borderRadius:8, border:'1px solid #bfdbfe', background:'#eff6ff', color:'var(--blue)', fontSize:11, fontWeight:700, cursor:'pointer' }}>🧾</button>
                  )}
                  <button onClick={async () => {
                    if (!window.confirm('Delete this visit record?')) return
                    await supabase.from('visits').update({ deleted_at: new Date().toISOString() }).eq('id', v.id)
                    fetchVisitsForCustomer(id)
                    showToast('Visit deleted')
                  }} style={{ padding:'3px 8px', borderRadius:8, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>🗑️</button>
                </div>
              </div>
              {v.notes && <p className="text-xs text-muted" style={{ marginTop: 6 }}>{v.notes}</p>}
              {v.sale_items?.length > 0 && (
                <div style={{ marginTop:6, paddingTop:6, borderTop:'1px solid var(--border)' }}>
                  {v.sale_items.map((item, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text-muted)' }}>
                      <span>{item.product_name} × {item.qty}</span>
                      <span>${(item.qty * item.unit_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {/* Danger zone */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => updateCustomer(id, { status: 'avoid' })}
            style={{ color: 'var(--amber)', borderColor: 'var(--amber)', marginRight: 8, marginBottom: 8 }}
          >⛔ Mark Avoid</button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setShowDelete(true)}
            style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
          >🗑️ Delete</button>
        </div>

      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="modal-overlay" onClick={() => setShowDelete(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom: 8 }}>Delete {customer.full_name}?</h2>
            <p className="text-muted" style={{ marginBottom: 20 }}>This will permanently remove this customer and all their visits.</p>
            <button className="btn btn-danger btn-full" onClick={handleDelete}>Delete permanently</button>
            <button className="btn btn-ghost btn-full" onClick={() => setShowDelete(false)} style={{ marginTop: 10 }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Invoice modal */}
      {invoiceVisit && (
        <InvoiceModal
          visit={invoiceVisit}
          customer={customer}
          profile={profile}
          onClose={() => setInvoiceVisit(null)}
        />
      )}
    </div>
  )
}
