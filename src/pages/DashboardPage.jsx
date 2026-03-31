import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCustomers } from '../hooks/useCustomers'
import { supabase } from '../lib/supabase'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { customers, restoreCustomer } = useCustomers()
  const navigate = useNavigate()

  const [stats, setStats] = useState(null)
  const [recentVisits, setRecentVisits] = useState([])
  const [deletedCustomers, setDeletedCustomers] = useState([])
  const [pendingOrders, setPendingOrders] = useState(0)
  const [loadingStats, setLoadingStats] = useState(true)
  const [tab, setTab] = useState('overview') // 'overview' | 'deleted'

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]

  const dueToday   = customers.filter(c => c.next_visit_date?.startsWith(today) && c.status !== 'avoid')
  const overdue    = customers.filter(c => c.next_visit_date && c.next_visit_date < today && c.status !== 'avoid')
  const active     = customers.filter(c => c.status === 'active' || c.status === 'priority')
  const addedToday = customers.filter(c => c.created_at?.startsWith(today))

  const loadStats = useCallback(async () => {
    if (!user) return
    setLoadingStats(true)
    try {
      const { data: visits } = await supabase
        .from('visits').select('id,had_sale,sale_amount,cost,outcome,created_at')
        .eq('user_id', user.id).gte('created_at', weekAgo + 'T00:00:00')
        .is('deleted_at', null).order('created_at', { ascending: false }).limit(50)
      const v = visits || []
      const todayV = v.filter(x => x.created_at?.startsWith(today))
      const sales  = v.filter(x => x.had_sale)
      const rev    = sales.reduce((s, x) => s + (x.sale_amount || 0), 0)
      const cst    = sales.reduce((s, x) => s + (x.cost || 0), 0)
      setStats({
        todayVisits: todayV.length,
        weekVisits:  v.length,
        weekSales:   sales.length,
        weekRevenue: rev,
        weekProfit:  rev - cst,
        conversion:  v.length ? Math.round((sales.length / v.length) * 100) : 0,
      })
      setRecentVisits(v.slice(0, 6))

      const { count } = await supabase.from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('seller_user_id', user.id).eq('status', 'pending')
      setPendingOrders(count || 0)

      // Deleted customers
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
  const greeting = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening'

  const Metric = ({ icon, label, value, color, onClick }) => (
    <div className="card" onClick={onClick} style={{ textAlign:'center', padding:'14px 8px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ fontSize:22, marginBottom:4 }}>{icon}</div>
      <p style={{ fontWeight:900, fontSize:20, color: color || 'var(--text)' }}>{value}</p>
      <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{label}</p>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 style={{ fontSize:18 }}>{name ? `${greeting}, ${name} 👋` : 'Dashboard'}</h1>
          <p style={{ fontSize:12, color:'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
          </p>
        </div>
        <button onClick={() => navigate('/settings')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22 }}>⚙️</button>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', background:'var(--gray-light)', borderRadius:10, padding:4, margin:'0 16px 14px' }}>
        {[['overview','📊 Overview'],['deleted','🗑️ Deleted']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: tab===t ? 'white' : 'transparent',
            color: tab===t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <div className="page" style={{ paddingTop:0 }}>
        {tab === 'overview' && <>

          {/* Alert banners */}
          {pendingOrders > 0 && (
            <button onClick={() => navigate('/orders')} className="card" style={{
              width:'100%', marginBottom:10, background:'linear-gradient(135deg,#f59e0b,#d97706)',
              color:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10,
              padding:'12px 14px', borderRadius:12,
            }}>
              <span style={{ fontSize:20 }}>📋</span>
              <span style={{ fontWeight:700, fontSize:14, flex:1 }}>{pendingOrders} new order{pendingOrders>1?'s':''} waiting</span>
              <span>→</span>
            </button>
          )}
          {overdue.length > 0 && (
            <button onClick={() => navigate('/customers')} className="card" style={{
              width:'100%', marginBottom:10, background:'linear-gradient(135deg,#dc2626,#b91c1c)',
              color:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10,
              padding:'12px 14px', borderRadius:12,
            }}>
              <span style={{ fontSize:20 }}>⚠️</span>
              <span style={{ fontWeight:700, fontSize:14, flex:1 }}>{overdue.length} overdue visit{overdue.length>1?'s':''}</span>
              <span>→</span>
            </button>
          )}
          {dueToday.length > 0 && (
            <button onClick={() => navigate('/customers')} className="card" style={{
              width:'100%', marginBottom:10, background:'linear-gradient(135deg,#2563eb,#1d4ed8)',
              color:'white', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:10,
              padding:'12px 14px', borderRadius:12,
            }}>
              <span style={{ fontSize:20 }}>📅</span>
              <span style={{ fontWeight:700, fontSize:14, flex:1 }}>{dueToday.length} visit{dueToday.length>1?'s':''} due today</span>
              <span>→</span>
            </button>
          )}

          {/* Today */}
          <p className="section-header">Today</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
            <Metric icon="🚶" label="Visits" value={loadingStats ? '...' : stats?.todayVisits ?? 0} color="var(--blue)" />
            <Metric icon="📍" label="Added" value={addedToday.length} color="#7c3aed" />
            <Metric icon="📋" label="Orders" value={pendingOrders} color="#f59e0b" onClick={() => navigate('/orders')} />
          </div>

          {/* This week */}
          <p className="section-header">This Week</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            <Metric icon="📍" label="Visits" value={loadingStats ? '...' : stats?.weekVisits ?? 0} color="var(--blue)" />
            <Metric icon="💰" label="Sales" value={loadingStats ? '...' : stats?.weekSales ?? 0} color="#16a34a" />
            <Metric icon="💵" label="Revenue" value={loadingStats ? '...' : `$${(stats?.weekRevenue??0).toFixed(0)}`} color="#d97706" />
            <Metric icon="📈" label="Profit" value={loadingStats ? '...' : `$${(stats?.weekProfit??0).toFixed(0)}`} color={(stats?.weekProfit??0) >= 0 ? '#16a34a' : '#dc2626'} />
          </div>

          {/* Customers */}
          <p className="section-header">Customers</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:16 }}>
            <Metric icon="👥" label="Active" value={active.length} />
            <Metric icon="📅" label="Due Today" value={dueToday.length} color="var(--blue)" />
            <Metric icon="⚠️" label="Overdue" value={overdue.length} color="#dc2626" />
          </div>

          {/* Recent visits */}
          {recentVisits.length > 0 && <>
            <p className="section-header">Recent Activity</p>
            {recentVisits.map(v => (
              <div key={v.id} className="card" style={{ marginBottom:8, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontWeight:600, fontSize:13 }}>
                    {v.had_sale ? '💰 Sale' : v.outcome === 'come_back' ? '📅 Follow-up' : v.outcome === 'avoid' ? '⛔ Avoided' : '🤝 Visit'}
                  </p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                    {new Date(v.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </p>
                </div>
                {v.had_sale && v.sale_amount > 0 && (
                  <p style={{ fontWeight:700, color:'var(--green)' }}>${v.sale_amount.toFixed(2)}</p>
                )}
              </div>
            ))}
          </>}

          {/* Quick actions */}
          <p className="section-header">Quick Actions</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { label:'📍 Add Customer', to:'/customers/new' },
              { label:'📦 Record Purchase', to:'/purchases' },
              { label:'📋 View Orders', to:'/orders' },
              { label:'🗺️ Open Map', to:'/map' },
            ].map(a => (
              <button key={a.to} onClick={() => navigate(a.to)} style={{
                padding:'13px', borderRadius:12, border:'1.5px solid var(--border)',
                background:'white', cursor:'pointer', fontWeight:600, fontSize:14, textAlign:'center',
              }}>{a.label}</button>
            ))}
          </div>
        </>}

        {tab === 'deleted' && <>
          <p className="section-header">Deleted Customers</p>
          <p className="text-xs text-muted" style={{ marginBottom:12 }}>These were soft-deleted and can be restored.</p>
          {deletedCustomers.length === 0 && (
            <div style={{ textAlign:'center', padding:48 }}>
              <div style={{ fontSize:36, marginBottom:10 }}>✅</div>
              <p className="text-muted">No deleted customers.</p>
            </div>
          )}
          {deletedCustomers.map(c => (
            <div key={c.id} className="card" style={{ marginBottom:8, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:700, fontSize:14 }}>{c.business_name || c.full_name}</p>
                <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                  Deleted {new Date(c.deleted_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                </p>
              </div>
              <button onClick={() => handleRestore(c.id)} style={{
                padding:'7px 14px', borderRadius:8, border:'1px solid var(--green)',
                background:'var(--green-light)', color:'var(--green)', fontWeight:600, fontSize:13, cursor:'pointer',
              }}>↩ Restore</button>
            </div>
          ))}
        </>}
      </div>
    </div>
  )
}
