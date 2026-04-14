import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import InvoiceModal from './InvoiceModal'

/**
 * Sales Log Modal – shows all sales for today or this week
 * Each sale shows customer, items, total, and an invoice button.
 *
 * Props:
 *   initialPeriod – 'today' | 'week' (default: 'today')
 *   onClose       – callback to close
 */
export default function SalesLogModal({ initialPeriod = 'today', onClose, onSalesChanged }) {
  const { user, profile, canSeeProfit } = useAuth()
  const [period, setPeriod] = useState(initialPeriod)
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [invoiceVisit, setInvoiceVisit] = useState(null)
  const [invoiceCustomer, setInvoiceCustomer] = useState(null)

  // CT-aware date helpers
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const ctMidnightToUTC = (ctDateStr) => {
    const probe = new Date(`${ctDateStr}T12:00:00Z`)
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      timeZoneName: 'shortOffset',
    }).formatToParts(probe)
    const tzPart = parts.find(p => p.type === 'timeZoneName')?.value || 'GMT-6'
    const match = tzPart.match(/([+-])(\d+)(?::(\d+))?/)
    const offsetSign = match?.[1] === '-' ? 1 : -1
    const offsetH = parseInt(match?.[2] || '6')
    const offsetM = parseInt(match?.[3] || '0')
    const midnight = new Date(`${ctDateStr}T00:00:00Z`)
    midnight.setMinutes(midnight.getMinutes() + offsetSign * (offsetH * 60 + offsetM))
    return midnight.toISOString()
  }

  const loadSales = useCallback(async () => {
    if (!user) return
    setLoading(true)

    let since
    if (period === 'today') {
      since = ctMidnightToUTC(todayStr)
    } else {
      const weekAgoDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const weekAgoStr = weekAgoDate.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      since = ctMidnightToUTC(weekAgoStr)
    }

    // Fetch visits with sale_items that had a sale
    const { data: visits } = await supabase
      .from('visits')
      .select('id, customer_id, had_sale, sale_amount, cost, outcome, notes, created_at, sale_items(id, product_name, qty, unit_price, unit_cost, total_price, total_profit)')
      .eq('user_id', user.id)
      .eq('had_sale', true)
      .gte('created_at', since)
      .lte('created_at', new Date().toISOString())
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (!visits || visits.length === 0) {
      setSales([])
      setLoading(false)
      return
    }

    // Fetch customer names for all visits
    const customerIds = [...new Set(visits.map(v => v.customer_id).filter(Boolean))]
    let customerMap = {}
    if (customerIds.length > 0) {
      const { data: custs } = await supabase
        .from('customers')
        .select('id, full_name, business_name, phone, address, area, payment_status')
        .in('id', customerIds)
      for (const c of (custs || [])) {
        customerMap[c.id] = c
      }
    }

    // Merge customer info into visits
    const enriched = visits.map(v => ({
      ...v,
      customer: customerMap[v.customer_id] || null,
    }))

    setSales(enriched)
    setLoading(false)
  }, [user, period, todayStr])

  useEffect(() => { loadSales() }, [loadSales])

  // Totals
  const totalRevenue = sales.reduce((s, v) => s + (v.sale_amount || 0), 0)
  const totalProfit = sales.reduce((s, v) => {
    return s + (v.sale_items || []).reduce((ps, si) => ps + (si.total_profit || 0), 0)
  }, 0)
  const totalUnits = sales.reduce((s, v) => {
    return s + (v.sale_items || []).reduce((us, si) => us + (si.qty || 0), 0)
  }, 0)

  // Open invoice for a sale
  const handleInvoice = (sale) => {
    setInvoiceVisit(sale)
    setInvoiceCustomer(sale.customer)
  }

  // Delete a sale (soft-delete visit, hard-delete sale_items)
  const [deleting, setDeleting] = useState(null)
  const handleDelete = async (sale) => {
    if (!window.confirm(`Delete this sale ($${(sale.sale_amount || 0).toFixed(2)})? This cannot be undone.`)) return
    setDeleting(sale.id)
    try {
      // Delete sale_items
      await supabase.from('sale_items').delete().eq('visit_id', sale.id)
      // Soft-delete the visit
      await supabase.from('visits').update({ deleted_at: new Date().toISOString() }).eq('id', sale.id)
      // Remove from local state
      setSales(prev => prev.filter(s => s.id !== sale.id))
      if (onSalesChanged) onSalesChanged()
    } catch (err) {
      console.error('Delete failed:', err)
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '92vh' }}>
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Sales Log</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['today', 'Today'], ['week', 'This Week']].map(([p, l]) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 700,
              background: period === p ? 'var(--blue)' : 'var(--gray-light)',
              color: period === p ? 'white' : 'var(--text)',
              border: `1.5px solid ${period === p ? 'var(--blue)' : 'var(--border)'}`,
            }}>{l}</button>
          ))}
        </div>

        {/* Summary strip */}
        {!loading && sales.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: canSeeProfit ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
            <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--gray-light)', borderRadius: 10 }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--blue)' }}>{sales.length}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Sales</p>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--gray-light)', borderRadius: 10 }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: '#d97706' }}>${totalRevenue.toFixed(0)}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Revenue</p>
            </div>
            {canSeeProfit && (
            <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--gray-light)', borderRadius: 10 }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: '#16a34a' }}>${totalProfit.toFixed(0)}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Profit</p>
            </div>
            )}
            <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--gray-light)', borderRadius: 10 }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: '#7c3aed' }}>{totalUnits}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Units</p>
            </div>
          </div>
        )}

        {/* Sales list */}
        <div style={{ maxHeight: 'calc(92vh - 240px)', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ width: 36, height: 36, border: '4px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            </div>
          ) : sales.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 40, marginBottom: 8 }}>📋</p>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>No sales {period === 'today' ? 'today' : 'this week'}</p>
              <p className="text-sm text-muted">Sales will appear here when you log them</p>
            </div>
          ) : (
            sales.map(sale => {
              const cust = sale.customer
              const items = sale.sale_items || []
              const saleDate = new Date(sale.created_at)
              const isToday = saleDate.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) === todayStr
              const saleProfit = items.reduce((s, i) => s + (i.total_profit || 0), 0)

              return (
                <div key={sale.id} className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
                  {/* Top row: customer + total + invoice button */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>
                        {cust?.business_name || cust?.full_name || 'Unknown customer'}
                      </p>
                      <p className="text-xs text-muted">
                        {isToday
                          ? saleDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
                          : saleDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' })
                        }
                        {cust?.area ? ` · ${cust.area}` : ''}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--green)' }}>
                          ${(sale.sale_amount || 0).toFixed(2)}
                        </p>
                        {canSeeProfit && (
                          <p style={{ fontSize: 11, color: saleProfit >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                            +${saleProfit.toFixed(2)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleInvoice(sale)}
                        style={{
                          padding: '6px 10px', borderRadius: 8,
                          border: '1.5px solid #bfdbfe', background: '#eff6ff',
                          color: 'var(--blue)', fontSize: 14, fontWeight: 700,
                          cursor: 'pointer', lineHeight: 1,
                        }}
                        title="View Invoice"
                      >
                        🧾
                      </button>
                      <button
                        onClick={() => handleDelete(sale)}
                        disabled={deleting === sale.id}
                        style={{
                          padding: '6px 8px', borderRadius: 8,
                          border: '1.5px solid #fecaca', background: '#fef2f2',
                          color: '#dc2626', fontSize: 14, fontWeight: 700,
                          cursor: 'pointer', lineHeight: 1,
                          opacity: deleting === sale.id ? 0.5 : 1,
                        }}
                        title="Delete Sale"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* Items */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
                    {items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', padding: '2px 0' }}>
                        <span>{item.qty}× {item.product_name}</span>
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>${(item.qty * item.unit_price).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>

    {/* Invoice sub-modal */}
    {invoiceVisit && invoiceCustomer && (
      <InvoiceModal
        visit={invoiceVisit}
        customer={invoiceCustomer}
        profile={profile}
        onClose={() => { setInvoiceVisit(null); setInvoiceCustomer(null) }}
      />
    )}
    </>
  )
}
