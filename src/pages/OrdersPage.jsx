import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useSettings } from '../hooks/useSettings'

const STATUS_COLOR = { pending:'#f59e0b', confirmed:'#2563eb', delivered:'#16a34a', cancelled:'#dc2626' }
// STATUS_LABEL is dynamic based on language
const STATUS_BG    = { pending:'#fffbeb', confirmed:'#eff6ff', delivered:'#f0fdf4', cancelled:'#fff1f2' }

export default function OrdersPage() {
  const { user } = useAuth()
  const { isArabic } = useSettings()
  const STATUS_LABEL = isArabic
    ? { pending:'⏳ قيد الانتظار', confirmed:'✅ مؤكد', delivered:'📦 تم التوصيل', cancelled:'✕ ملغى' }
    : { pending:isArabic ? '⏳ قيد الانتظار' : '⏳ Pending', confirmed:isArabic ? '✅ مؤكد' : '✅ Confirmed', delivered:isArabic ? '📦 تم التوصيل' : '📦 Delivered', cancelled:isArabic ? '✕ ملغى' : '✕ Cancelled' }
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [filter, setFilter] = useState('all')

  const load = useCallback(async (silent = false) => {
    if (!user) return
    if (!silent) setLoading(true); else setRefreshing(true)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('seller_user_id', user.id)
      .order('created_at', { ascending: false })
    setOrders(data || [])
    if (!silent) setLoading(false); else setRefreshing(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Poll every 30s for new orders
  useEffect(() => {
    const iv = setInterval(() => load(true), 30000)
    return () => clearInterval(iv)
  }, [load])

  const updateStatus = async (id, status) => {
    await supabase.from('orders').update({ status }).eq('id', id)
    setOrders(p => p.map(o => o.id === id ? { ...o, status } : o))
  }

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this order? This cannot be undone.')) return
    await supabase.from('orders').delete().eq('id', id)
    setOrders(p => p.filter(o => o.id !== id))
  }

  const pending  = orders.filter(o => o.status === 'pending')
  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + (o.total_amount || 0), 0)

  return (
    <div>
      <div className="page-header">
        <h1>
          Orders
          {pending.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: '#dc2626', color: 'white', borderRadius: 10,
              fontSize: 12, fontWeight: 800, padding: '2px 8px', marginLeft: 8,
            }}>{pending.length} new</span>
          )}
        </h1>
        <button onClick={() => load(true)} disabled={refreshing} style={{
          background: 'none', border: 'none', fontSize: 18, cursor: 'pointer',
          opacity: refreshing ? 0.5 : 1,
        }}>🔄</button>
      </div>

      <div className="page" style={{ paddingTop: 12 }}>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { label: isArabic?'إجمالي الطلبات':'Total Orders', val: orders.length, color: 'var(--blue)' },
            { label: isArabic?'قيد الانتظار':'Pending', val: pending.length, color: '#f59e0b' },
            { label: isArabic?'الإيرادات':'Revenue', val: `$${totalRevenue.toFixed(0)}`, color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ textAlign: 'center', padding: '10px 6px' }}>
              <p style={{ fontWeight: 800, fontSize: 17, color: s.color }}>{s.val}</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 14 }}>
          {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{
              flexShrink: 0, padding: '5px 12px', borderRadius: 20, fontSize: 13,
              fontWeight: filter === s ? 700 : 400, cursor: 'pointer',
              border: `1.5px solid ${filter === s ? (STATUS_COLOR[s] || 'var(--blue)') : 'var(--border)'}`,
              background: filter === s ? (STATUS_COLOR[s] || 'var(--blue)') : 'white',
              color: filter === s ? 'white' : 'var(--text)',
            }}>
              {STATUS_LABEL[s] || 'All'}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>Loading orders...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📋</div>
            <h3 style={{ marginBottom: 8 }}>No {filter !== 'all' ? filter : ''} orders yet</h3>
            <p className="text-sm text-muted" style={{ lineHeight: 1.6, marginBottom: 20 }}>
              Orders come in when customers visit your price list and tap "Request This Order".
            </p>
            <button
              className="btn btn-ghost"
              onClick={() => navigate('/products')}
            >
              👁️ View Your Price List
            </button>
          </div>
        )}

        {filtered.map(order => {
          const items = Array.isArray(order.items) ? order.items : []
          const isOpen = expanded === order.id
          const statusColor = STATUS_COLOR[order.status] || '#64748b'
          const statusBg = STATUS_BG[order.status] || '#f8fafc'

          return (
            <div key={order.id} className="card" style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}>
              {/* Header row — always visible, tap to expand */}
              <div
                onClick={() => setExpanded(isOpen ? null : order.id)}
                style={{ padding: '13px 14px', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{order.customer_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      📞 {order.phone}
                      {order.address ? ` · 📍 ${order.address}` : ''}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{items.length} item{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <p style={{ fontWeight: 900, fontSize: 18, color: 'var(--green)', marginBottom: 4 }}>
                      ${(order.total_amount || 0).toFixed(2)}
                    </p>
                    <span style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 10,
                      background: statusBg, color: statusColor, fontWeight: 700,
                    }}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px' }}>
                  {/* Items list */}
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                    {items.length === 0 ? (
                      <p className="text-xs text-muted">No items recorded</p>
                    ) : items.map((item, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        paddingBottom: i < items.length - 1 ? 6 : 0,
                        marginBottom: i < items.length - 1 ? 6 : 0,
                        borderBottom: i < items.length - 1 ? '1px solid #e2e8f0' : 'none',
                      }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</p>
                          {item.brand && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.brand}</p>}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontSize: 13, fontWeight: 600 }}>
                            {item.qty} × ${(item.unit_price || 0).toFixed(2)}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--green)', fontWeight: 700 }}>
                            ${(item.subtotal || item.qty * item.unit_price || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {items.length > 0 && (
                      <div style={{ borderTop: '1px solid #e2e8f0', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                        <p style={{ fontWeight: 700, fontSize: 14 }}>Total</p>
                        <p style={{ fontWeight: 900, fontSize: 16, color: 'var(--green)' }}>${(order.total_amount || 0).toFixed(2)}</p>
                      </div>
                    )}
                  </div>

                  {order.notes && (
                    <div style={{ background: '#fffbeb', borderRadius: 8, padding: '8px 12px', marginBottom: 12, border: '1px solid #fde68a' }}>
                      <p style={{ fontSize: 12, color: '#92400e' }}>💬 <em>{order.notes}</em></p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {order.phone && (
                      <a href={`tel:${order.phone}`} className="btn btn-ghost btn-sm">📞 Call</a>
                    )}
                    {order.status === 'pending' && (
                      <button
                        className="btn btn-sm"
                        onClick={() => updateStatus(order.id, 'confirmed')}
                        style={{ background: '#2563eb', color: 'white', border: 'none', flex: 1 }}
                      >✅ Confirm Order</button>
                    )}
                    {order.status === 'confirmed' && (
                      <button
                        className="btn btn-sm"
                        onClick={() => updateStatus(order.id, 'delivered')}
                        style={{ background: '#16a34a', color: 'white', border: 'none', flex: 1 }}
                      >📦 Mark Delivered</button>
                    )}
                    {order.status !== 'cancelled' && order.status !== 'delivered' && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => updateStatus(order.id, 'cancelled')}
                        style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
                      >✕ Cancel</button>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => deleteOrder(order.id)}
                      style={{ color: 'var(--red)', borderColor: '#fecaca', background:'#fef2f2', marginLeft:'auto' }}
                    >🗑️ Delete</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
