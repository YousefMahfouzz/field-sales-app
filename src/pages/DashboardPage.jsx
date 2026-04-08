import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCustomers } from '../hooks/useCustomers'
import { supabase } from '../lib/supabase'
import Icon from '../components/Icon'

// ── Reschedule Modal ──────────────────────────────────────────────
function RescheduleModal({ overdue, onClose, onDone}) {
  const today = new Date().toLocaleDateString('en-CA')
  const [selected, setSelected] = useState(new Set(overdue.map(c => c.id)))
  const [targetDate, setTargetDate] = useState(today)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const quickDates = [
    { label: 'Today',      days: 0 },
    { label: 'Tomorrow',   days: 1 },
    { label: 'In 2 days',  days: 2 },
    { label: 'This week',  days: 4 },
    { label: 'Next week',  days: 7 },
    { label: '2 weeks',    days: 14 },
  ]

  const dateFor = (days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    return d.toLocaleDateString('en-CA')
  }

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const toggleAll = () => {
    if (selected.size === overdue.length) setSelected(new Set())
    else setSelected(new Set(overdue.map(c => c.id)))
  }

  const handleSave = async () => {
    if (!selected.size || !targetDate) return
    setSaving(true)
    try {
      const ids = [...selected]
      // Update all selected in parallel
      await Promise.all(ids.map(id =>
        supabase.from('customers')
          .update({ next_visit_date: targetDate, updated_at: new Date().toISOString() })
          .eq('id', id)
      ))
      setDone(true)
      setTimeout(() => { onDone(); onClose() }, 1200)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  const prettyDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh' }}>
        <div className="modal-handle" />

        {done ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>{'Rescheduled'} {selected.size} customer{selected.size > 1 ? 's' : ''}!</p>
          </div>
        ) : <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18 }}>{'Reschedule Overdue'}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
          </div>

          {/* Quick date buttons */}
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{'Move visits to'}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {quickDates.map(({ label, days }) => {
              const d = dateFor(days)
              return (
                <button key={label} onClick={() => setTargetDate(d)} style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 600,
                  background: targetDate === d ? 'var(--blue)' : 'var(--gray-light)',
                  color: targetDate === d ? 'white' : 'var(--text)',
                  border: `1.5px solid ${targetDate === d ? 'var(--blue)' : 'var(--border)'}`,
                }}>
                  {label}
                </button>
              )
            })}
          </div>

          {/* Custom date picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)', flexShrink: 0 }}>{'Or pick:'}</span>
            <input type="date" value={targetDate} min={today}
              onChange={e => setTargetDate(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14 }} />
          </div>

          {/* Target date display */}
          <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, border: '1px solid #bfdbfe' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>
              📅 {'Moving selected to:'} {prettyDate(targetDate)}
            </p>
          </div>

          {/* Customer list with checkboxes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Customers ({selected.size}/{overdue.length} {'selected)'}
            </p>
            <button onClick={toggleAll} style={{ fontSize: 12, fontWeight: 600, color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {selected.size === overdue.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
            {overdue.map(c => {
              const isSelected = selected.has(c.id)
              const daysPast = Math.floor((new Date(today) - new Date(c.next_visit_date)) / (1000 * 60 * 60 * 24))
              return (
                <div key={c.id}
                  onClick={() => toggle(c.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10, marginBottom: 6, cursor: 'pointer',
                    background: isSelected ? 'var(--blue-light)' : 'var(--gray-light)',
                    border: `1.5px solid ${isSelected ? '#bfdbfe' : 'transparent'}`,
                    transition: 'all 0.15s',
                  }}>
                  {/* Checkbox */}
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: isSelected ? 'var(--blue)' : 'white',
                    border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: 13, fontWeight: 700,
                  }}>
                    {isSelected && '✓'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
                      {c.business_name || c.full_name}
                    </p>
                    <p style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
                      {daysPast === 1 ? '1 day overdue' : `${daysPast} days overdue`}
                      {c.area ? ` · ${c.area}` : ''}
                    </p>
                  </div>
                  {c.status === 'priority' && (
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>{'Priority'}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={!selected.size || saving}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, border: 'none',
              background: !selected.size ? '#d1d5db' : 'linear-gradient(135deg, var(--blue), var(--blue-dark))',
              color: 'white', fontWeight: 700, fontSize: 16, cursor: selected.size ? 'pointer' : 'not-allowed',
            }}>
            {saving ? '⏳ Saving...' : `📅 Reschedule ${selected.size} customer${selected.size !== 1 ? 's' : ''} → ${prettyDate(targetDate)}`}
          </button>
        </>}
      </div>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { customers, restoreCustomer, fetchCustomers } = useCustomers()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [recentVisits, setRecentVisits] = useState([])
  const [deletedCustomers, setDeletedCustomers] = useState([])
  const [pendingOrders, setPendingOrders] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const [tab, setTab] = useState('overview')
  const [showReschedule, setShowReschedule] = useState(false)

  // CT day boundaries — compute fresh each render so day change auto-updates
  const todayCT = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
  const today = todayCT()
  // Reliable CT → UTC converter using Intl API (handles DST automatically)
  const ctMidnightToUTC = (ctDateStr) => {
    // Parse the CT date and find midnight CT in UTC
    const [y,m,d] = ctDateStr.split('-').map(Number)
    // Create a date at noon CT to avoid DST edge cases, then find that day's midnight
    const noonCT = new Date(`${ctDateStr}T18:00:00Z`) // noon CT ≈ 18:00 UTC (rough)
    const ctDateAtNoon = noonCT.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
    // Binary search for CT midnight: find UTC time where CT date changes
    // Simpler: use the fact that CT is either UTC-5 or UTC-6
    // Get the actual offset by checking what UTC time corresponds to CT midnight
    const testMidnight = new Date(`${ctDateStr}T00:00:00`)
    // Format as if it were UTC and see what CT gives
    const jan = new Date(`${y}-01-15T12:00:00Z`)
    const jul = new Date(`${y}-07-15T12:00:00Z`)
    const janOffset = -jan.toLocaleString('en-US', { timeZone: 'America/Chicago', timeZoneName: 'shortOffset' }).match(/GMT([+-]\d+)/)?.[1] || 6
    const julOffset = -jul.toLocaleString('en-US', { timeZone: 'America/Chicago', timeZoneName: 'shortOffset' }).match(/GMT([+-]\d+)/)?.[1] || 5
    // Check if this date is DST (summer = CDT = UTC-5) or CST (winter = UTC-6)
    const testDate = new Date(`${ctDateStr}T12:00:00Z`)
    const isDST = testDate.toLocaleString('en-US', { timeZone: 'America/Chicago', timeZoneName: 'short' }).includes('CDT')
    const offsetHours = isDST ? 5 : 6
    return `${ctDateStr}T${String(offsetHours).padStart(2,'0')}:00:00.000Z`
  }
  const weekAgo = (() => { const d = new Date(Date.now() - 7*24*60*60*1000); return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) })()

  const dueToday = customers.filter(c => c.next_visit_date?.startsWith(today) && c.status !== 'avoid')
  const overdue  = customers.filter(c => c.next_visit_date && c.next_visit_date < today && c.status !== 'avoid')
  const active   = customers.filter(c => c.status === 'active' || c.status === 'priority')
  const addedToday = customers.filter(c => {
    if (!c.created_at) return false
    return new Date(c.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) === today
  })

  const loadStats = useCallback(async () => {
    if (!user) return
    setLoadingStats(true)
    try {
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
      const { data: visits } = await supabase
        .from('visits').select('id,had_sale,sale_amount,cost,outcome,created_at')
        .eq('user_id', user.id)
        .gte('created_at', ctMidnightToUTC(weekAgo))
        .lte('created_at', new Date().toISOString())
        .is('deleted_at', null)
        .order('created_at', { ascending: false }).limit(50)
      const v = visits || []
      // Filter today using CT timezone comparison
      const todayV = v.filter(x => x.created_at &&
        new Date(x.created_at).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }) === todayStr)
      const sales  = v.filter(x => x.had_sale)
      const rev    = sales.reduce((s, x) => s + (x.sale_amount || 0), 0)
      const cst    = sales.reduce((s, x) => s + (x.cost || 0), 0)
      // Also pull today's revenue from sale_items (more accurate)
      const { data: todaySales } = await supabase
        .from('sale_items').select('total_price,total_profit')
        .eq('user_id', user.id)
        .gte('created_at', ctMidnightToUTC(todayStr))
        .lte('created_at', new Date().toISOString())
      const todayRev  = (todaySales||[]).reduce((s,i) => s+(i.total_price||0), 0)
      const todayProf = (todaySales||[]).reduce((s,i) => s+(i.total_profit||0), 0)
      setStats({
        todayVisits:  todayV.length,
        todayRevenue: todayRev,
        todayProfit:  todayProf,
        weekVisits:   v.length,
        weekSales:    sales.length,
        weekRevenue:  rev,
        weekProfit:   rev - cst,
      })
      setRecentVisits(v.slice(0, 6))

      const { count } = await supabase.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('seller_user_id', user.id).eq('status', 'pending')
      setPendingOrders(count || 0)

      const { data: deleted } = await supabase.from('customers')
        .select('id,full_name,business_name,deleted_at')
        .eq('user_id', user.id).not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }).limit(20)
      setDeletedCustomers(deleted || [])
    } catch (e) { console.error(e) }
    finally { setLoadingStats(false) }
  }, [user, today, weekAgo])

  useEffect(() => { loadStats() }, [loadStats])

  const handleRestore = async (id) => {
    await restoreCustomer(id)
    setDeletedCustomers(p => p.filter(c => c.id !== id))
  }

  const name = profile?.display_name?.split(' ')[0] || ''
  const hr = new Date().getHours()
  const greeting = hr < 12 ? ('Good morning') : hr < 17 ? ('Good afternoon') : ('Good evening')

  const Metric = ({ icon, label, value, color, onClick }) => (
    <div className="card" onClick={onClick} style={{ textAlign: 'center', padding: '14px 8px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display:'flex', justifyContent:'center', marginBottom: 6, color: color || 'var(--text-muted)' }}>{icon}</div>
      <p style={{ fontWeight: 800, fontSize: 19, color: color || 'var(--text)', lineHeight:1 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight:500 }}>{label}</p>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: 18 }}>{name ? `${greeting}, ${name}` : 'Dashboard'}</h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22 }}>⚙️</button>
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: 'var(--gray-light)', borderRadius: 10, padding: 4, margin: '0 16px 14px' }}>
        {[['overview', '📊 Overview'], ['deleted', '🗑️ Deleted']].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        {tab === 'overview' && <>

          {/* Alert banners */}
          {pendingOrders > 0 && (
            <button onClick={() => navigate('/orders')} className="card" style={{
              width: '100%', marginBottom: 10, background: 'linear-gradient(135deg,#f59e0b,#d97706)',
              color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 12,
            }}>
              <span style={{ fontSize: 20 }}>📋</span>
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{pendingOrders} new order{pendingOrders > 1 ? 's' : ''} waiting</span>
              <span>→</span>
            </button>
          )}

          {/* Overdue banner — with Reschedule button */}
          {overdue.length > 0 && (
            <div className="card" style={{
              marginBottom: 10, background: 'linear-gradient(135deg,#dc2626,#b91c1c)',
              border: 'none', display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 12,
            }}>
              <span style={{ fontSize: 20 }}>⚠️</span>
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1, color: 'white' }}>
                {`${overdue.length} overdue visit${overdue.length > 1 ? 's' : ''}`}
              </span>
              <button
                onClick={() => setShowReschedule(true)}
                style={{
                  padding: '6px 12px', borderRadius: 8, border: '1.5px solid white',
                  background: 'rgba(255,255,255,0.2)', color: 'white',
                  fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                📅 Reschedule
              </button>
              <button onClick={() => navigate('/customers?filter=overdue')} style={{
                background: 'none', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', padding: '0 0 0 4px',
              }}>→</button>
            </div>
          )}

          {dueToday.length > 0 && (
            <button onClick={() => navigate('/customers')} className="card" style={{
              width: '100%', marginBottom: 10, background: 'linear-gradient(135deg,#2563eb,#1d4ed8)',
              color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px', borderRadius: 12,
            }}>
              <span style={{ fontSize: 20 }}>📅</span>
              <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{`${dueToday.length} visit${dueToday.length > 1 ? 's' : ''} due today`}</span>
              <span>→</span>
            </button>
          )}

          {/* Today */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
            <p className="section-header" style={{ margin:0 }}>{'Today'}</p>
            <button onClick={() => navigate('/analytics')} style={{ fontSize:12, color:'var(--blue)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>📊 Analytics →</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius:12, padding:'12px 14px' }}>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Revenue {'Today'}</p>
              <p style={{ color:'white', fontWeight:900, fontSize:22, marginTop:4 }}>{loadingStats ? '...' : `$${(stats?.todayRevenue??0).toFixed(2)}`}</p>
            </div>
            <div style={{ background:'linear-gradient(135deg,#14532d,#16a34a)', borderRadius:12, padding:'12px 14px' }}>
              <p style={{ color:'rgba(255,255,255,0.7)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>Profit {'Today'}</p>
              <p style={{ color:'white', fontWeight:900, fontSize:22, marginTop:4 }}>{loadingStats ? '...' : `$${(stats?.todayProfit??0).toFixed(2)}`}</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <Metric icon={<Icon name="user" size={18} />} label={'Visits'} value={loadingStats ? '...' : stats?.todayVisits ?? 0} color="var(--blue)" />
            <Metric icon={<Icon name="map-pin" size={18} />} label={'Added'} value={addedToday.length} color="#7c3aed" />
            <Metric icon={<Icon name="orders" size={18} />} label={'Orders'} value={pendingOrders} color="#f59e0b" onClick={() => navigate('/orders')} />
          </div>

          {/* This week */}
          <p className="section-header">{'This Week'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <Metric icon={<Icon name="map-pin" size={18} />} label={'Visits'} value={loadingStats ? '...' : stats?.weekVisits ?? 0} color="var(--blue)" />
            <Metric icon={<Icon name="dollar" size={18} />} label={'Sales'} value={loadingStats ? '...' : stats?.weekSales ?? 0} color="#16a34a" />
            <Metric icon={<Icon name="trending-up" size={18} />} label={'Revenue'} value={loadingStats ? '...' : `$${(stats?.weekRevenue ?? 0).toFixed(0)}`} color="#d97706" />
            <Metric icon={<Icon name="bar-chart" size={18} />} label={'Profit'} value={loadingStats ? '...' : `$${(stats?.weekProfit ?? 0).toFixed(0)}`} color={(stats?.weekProfit ?? 0) >= 0 ? '#16a34a' : '#dc2626'} />
          </div>

          {/* Customers */}
          <p className="section-header">{'Customers'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            <Metric icon={<Icon name="users" size={18} />} label={'Active'} value={active.length} />
            <Metric icon={<Icon name="calendar" size={18} />} label={'Due Today'} value={dueToday.length} color="var(--blue)" />
            <Metric icon={<Icon name="alert" size={18} />} label={'Overdue'} value={overdue.length} color="#dc2626" onClick={() => overdue.length > 0 && setShowReschedule(true)} />
          </div>

          {/* Recent activity */}
          {recentVisits.length > 0 && <>
            <p className="section-header">{'Recent Activity'}</p>
            {recentVisits.map(v => (
              <div key={v.id} className="card" style={{ marginBottom: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 13 }}>
                    {v.had_sale ? '💰 Sale' : v.outcome === 'come_back' ? '📅 Follow-up' : v.outcome === 'avoid' ? '⛔ Avoided' : '🤝 Visit'}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {v.had_sale && v.sale_amount > 0 && (
                  <p style={{ fontWeight: 700, color: 'var(--green)' }}>${v.sale_amount.toFixed(2)}</p>
                )}
              </div>
            ))}
          </>}

          {/* Quick actions */}
          <p className="section-header">{'Quick Actions'}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Add Customer', to: '/customers/new', icon: 'map-pin' },
              { label: 'Record Purchase', to: '/purchases', icon: 'truck' },
              { label: 'View Orders', to: '/orders', icon: 'orders' },
              { label: 'Analytics', to: '/analytics', icon: 'bar-chart' },
            ].map(a => (
              <button key={a.to} onClick={() => navigate(a.to)} style={{
                padding: '12px 14px', borderRadius: 12, border: '1.5px solid var(--border)',
                background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                color: 'var(--text)',
              }}>
                <span style={{ color: 'var(--blue)', display:'flex' }}><Icon name={a.icon || 'zap'} size={18} /></span>
                {a.label}
              </button>
            ))}
          </div>
        </>}

        {tab === 'deleted' && <>
          <p className="section-header">Deleted {'Customers'}</p>
          <p className="text-xs text-muted" style={{ marginBottom: 12 }}>{'Soft-deleted — tap Restore to bring them back.'}</p>
          {deletedCustomers.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
              <p className="text-muted">No deleted customers.</p>
            </div>
          )}
          {deletedCustomers.map(c => (
            <div key={c.id} className="card" style={{ marginBottom: 8, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{c.business_name || c.full_name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  Deleted {new Date(c.deleted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => handleRestore(c.id)} style={{
                padding: '7px 14px', borderRadius: 8, border: '1px solid var(--green)',
                background: 'var(--green-light)', color: 'var(--green)', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              }}>↩ Restore</button>
            </div>
          ))}
        </>}
      </div>

      {/* Reschedule Modal */}
      {showReschedule && overdue.length > 0 && (
        <RescheduleModal
          overdue={overdue}
          onClose={() => setShowReschedule(false)}
          onDone={() => { fetchCustomers(); loadStats() }}
        />
      )}
    </div>
  )
}
