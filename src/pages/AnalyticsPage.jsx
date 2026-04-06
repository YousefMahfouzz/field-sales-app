import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const fmt = (n) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(2)}`
const fmtFull = (n) => `$${n.toFixed(2)}`
const toDate = (d) => d.toLocaleDateString('en-CA') // YYYY-MM-DD
const today = () => toDate(new Date())
const startOf = (unit) => {
  const d = new Date()
  if (unit === 'month') d.setDate(1)
  if (unit === 'week') d.setDate(d.getDate() - d.getDay())
  if (unit === 'year') { d.setMonth(0); d.setDate(1) }
  return toDate(d)
}

function StatCard({ icon, label, value, sub, color = '#2563eb', onClick }) {
  return (
    <div onClick={onClick} className={onClick ? 'card card-tap' : 'card'}
      style={{ padding:'14px 16px', cursor: onClick ? 'pointer' : 'default' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <p style={{ fontSize:12, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</p>
      </div>
      <p style={{ fontSize:26, fontWeight:900, color, lineHeight:1 }}>{value}</p>
      {sub && <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>{sub}</p>}
    </div>
  )
}

function SectionHeader({ title }) {
  return <p className="section-header" style={{ marginTop:20 }}>{title}</p>
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // ── Sales lookup ──
  const [searchDate, setSearchDate] = useState(today())
  const [dayData, setDayData] = useState(null)
  const [loadingDay, setLoadingDay] = useState(false)

  // ── Stock cost lookup ──
  const [stockFrom, setStockFrom] = useState(startOf('month'))
  const [stockTo, setStockTo] = useState(today())
  const [stockData, setStockData] = useState(null)
  const [loadingStock, setLoadingStock] = useState(false)

  // ── Summary stats ──
  const [summary, setSummary] = useState(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // ── Today auto-load ──
  const [todayData, setTodayData] = useState(null)

  const loadDay = useCallback(async (date) => {
    if (!user || !date) return
    setLoadingDay(true)
    try {
      const from = date + 'T00:00:00'
      const to   = date + 'T23:59:59'
      const { data: items } = await supabase
        .from('sale_items').select('qty,unit_price,unit_cost,total_price,total_cost,total_profit,product_name')
        .eq('user_id', user.id)
        .gte('created_at', from).lte('created_at', to)

      const { data: visits } = await supabase
        .from('visits').select('id,had_sale,sale_amount')
        .eq('user_id', user.id)
        .gte('created_at', from).lte('created_at', to)
        .is('deleted_at', null)

      const si = items || []
      const v  = visits || []
      const revenue = si.reduce((s,i) => s + (i.total_price||0), 0)
      const cost    = si.reduce((s,i) => s + (i.total_cost||0), 0)
      const profit  = si.reduce((s,i) => s + (i.total_profit||0), 0)
      const units   = si.reduce((s,i) => s + (i.qty||0), 0)
      setDayData({
        revenue, cost, profit, units,
        visits: v.length,
        salesVisits: v.filter(x => x.had_sale).length,
        items: si,
      })
    } catch(e) { console.error(e) }
    finally { setLoadingDay(false) }
  }, [user])

  const loadStockCost = useCallback(async () => {
    if (!user || !stockFrom || !stockTo) return
    setLoadingStock(true)
    try {
      const { data } = await supabase
        .from('purchases').select('qty,cost_per_unit,total_cost,product_name,purchased_at')
        .eq('user_id', user.id)
        .gte('purchased_at', stockFrom + 'T00:00:00')
        .lte('purchased_at', stockTo + 'T23:59:59')
        .order('purchased_at', { ascending: false })
      const rows = data || []
      const total = rows.reduce((s,r) => s + (r.total_cost||0), 0)
      const units = rows.reduce((s,r) => s + (r.qty||0), 0)
      setStockData({ total, units, count: rows.length, rows })
    } catch(e) { console.error(e) }
    finally { setLoadingStock(false) }
  }, [user, stockFrom, stockTo])

  const loadSummary = useCallback(async () => {
    if (!user) return
    setLoadingSummary(true)
    try {
      const t  = today()
      const ms = startOf('month')
      const ws = startOf('week')
      const ys = startOf('year')

      // Sales revenue + profit for different periods
      const [todayItems, monthItems, weekItems, yearItems] = await Promise.all([
        supabase.from('sale_items').select('total_price,total_cost,total_profit,qty')
          .eq('user_id', user.id).gte('created_at', t+'T00:00:00').lte('created_at', t+'T23:59:59'),
        supabase.from('sale_items').select('total_price,total_cost,total_profit,qty')
          .eq('user_id', user.id).gte('created_at', ms+'T00:00:00'),
        supabase.from('sale_items').select('total_price,total_cost,total_profit,qty')
          .eq('user_id', user.id).gte('created_at', ws+'T00:00:00'),
        supabase.from('sale_items').select('total_price,total_cost,total_profit,qty')
          .eq('user_id', user.id).gte('created_at', ys+'T00:00:00'),
      ])

      // Stock purchased this month
      const [monthStock, allStock] = await Promise.all([
        supabase.from('stock_movements').select('total_cost').eq('user_id', user.id).eq('type','in').gte('created_at', ms+'T00:00:00'),
        supabase.from('stock_movements').select('total_cost').eq('user_id', user.id).eq('type','in'),
      ])

      const calc = (rows) => ({
        revenue: (rows||[]).reduce((s,i) => s+(i.total_price||0), 0),
        cost:    (rows||[]).reduce((s,i) => s+(i.total_cost||0), 0),
        profit:  (rows||[]).reduce((s,i) => s+(i.total_profit||0), 0),
        units:   (rows||[]).reduce((s,i) => s+(i.qty||0), 0),
      })

      const todays = calc(todayItems.data)
      setTodayData(todays)

      setSummary({
        today:      todays,
        week:       calc(weekItems.data),
        month:      calc(monthItems.data),
        year:       calc(yearItems.data),
        monthStock: (monthStock.data||[]).reduce((s,r) => s+(r.total_cost||0), 0),
        allStock:   (allStock.data||[]).reduce((s,r) => s+(r.total_cost||0), 0),
      })
    } catch(e) { console.error(e) }
    finally { setLoadingSummary(false) }
  }, [user])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => { loadDay(today()) }, [loadDay])
  useEffect(() => { loadStockCost() }, [loadStockCost])

  const prettyDate = (d) => {
    if (d === today()) return 'Today'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })
  }

  // Group items by product for the day
  const dayProducts = dayData ? Object.values(
    (dayData.items||[]).reduce((acc, i) => {
      const k = i.product_name || 'Unknown'
      if (!acc[k]) acc[k] = { name:k, qty:0, revenue:0, profit:0 }
      acc[k].qty += i.qty||0
      acc[k].revenue += i.total_price||0
      acc[k].profit += i.total_profit||0
      return acc
    }, {})
  ).sort((a,b) => b.revenue - a.revenue) : []

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1>Analytics</h1>
        <div style={{ width:36 }} />
      </div>

      <div className="page" style={{ paddingTop:12 }}>

        {/* ── TODAY SUMMARY ── */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius:14, padding:'16px 18px', marginBottom:16 }}>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>Today's Performance</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'Revenue', value: loadingSummary ? '...' : fmtFull(summary?.today?.revenue||0), color:'#7dd3fc' },
              { label:'Profit',  value: loadingSummary ? '...' : fmtFull(summary?.today?.profit||0),  color: (summary?.today?.profit||0)>=0 ? '#86efac' : '#fca5a5' },
              { label:'Units',   value: loadingSummary ? '...' : (summary?.today?.units||0),           color:'#c4b5fd' },
            ].map(s => (
              <div key={s.label} style={{ background:'rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 12px', textAlign:'center' }}>
                <p style={{ color:s.color, fontWeight:900, fontSize:20, lineHeight:1 }}>{s.value}</p>
                <p style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:4 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── PERIOD SUMMARY ── */}
        <SectionHeader title="Revenue Summary" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:8 }}>
          <StatCard icon="📅" label="This Week" value={loadingSummary?'...':fmt(summary?.week?.revenue||0)} sub={`${fmtFull(summary?.week?.profit||0)} profit`} color="#2563eb" />
          <StatCard icon="🗓️" label="This Month" value={loadingSummary?'...':fmt(summary?.month?.revenue||0)} sub={`${fmtFull(summary?.month?.profit||0)} profit`} color="#7c3aed" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:4 }}>
          <StatCard icon="📦" label="Stock (month)" value={loadingSummary?'...':fmt(summary?.monthStock||0)} sub="paid for inventory" color="#dc2626" />
          <StatCard icon="💡" label="Net (month)" value={loadingSummary?'...':fmtFull((summary?.month?.profit||0)-(summary?.monthStock||0))} sub="profit minus stock cost" color={(summary?.month?.profit||0)-(summary?.monthStock||0)>=0?'#16a34a':'#dc2626'} />
        </div>
        <StatCard icon="📆" label="This Year Revenue" value={loadingSummary?'...':fmt(summary?.year?.revenue||0)} sub={`${fmtFull(summary?.year?.profit||0)} profit · ${summary?.year?.units||0} units sold`} color="#059669" />

        {/* ── SEARCH BY DAY ── */}
        <SectionHeader title="📅 Sales on a Specific Day" />
        <div style={{ display:'flex', gap:8, marginBottom:12 }}>
          <input type="date" value={searchDate} max={today()} onChange={e => setSearchDate(e.target.value)}
            style={{ flex:1, padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:15 }} />
          <button onClick={() => loadDay(searchDate)} className="btn btn-primary" style={{ flexShrink:0 }}>
            {loadingDay ? '...' : 'Search'}
          </button>
        </div>

        {dayData && (
          <div>
            <div style={{ background:'var(--gray-light)', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
              <p style={{ fontWeight:800, fontSize:15, marginBottom:10 }}>{prettyDate(searchDate)}</p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                {[
                  { l:'Revenue', v:fmtFull(dayData.revenue), c:'#2563eb' },
                  { l:'Profit',  v:fmtFull(dayData.profit),  c:dayData.profit>=0?'#16a34a':'#dc2626' },
                  { l:'Units',   v:dayData.units,             c:'#7c3aed' },
                  { l:'Visits',  v:dayData.visits,            c:'#f59e0b' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign:'center' }}>
                    <p style={{ fontWeight:900, fontSize:18, color:s.c }}>{s.v}</p>
                    <p style={{ fontSize:10, color:'var(--text-muted)' }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {dayProducts.length > 0 && (
              <>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase' }}>Products Sold</p>
                {dayProducts.map(p => (
                  <div key={p.name} style={{ display:'flex', alignItems:'center', padding:'9px 14px', background:'white', borderRadius:10, marginBottom:6, border:'1px solid var(--border)' }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:13 }}>{p.name}</p>
                      <p style={{ fontSize:11, color:'var(--text-muted)' }}>{p.qty} unit{p.qty!==1?'s':''}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontWeight:800, fontSize:14, color:'#2563eb' }}>{fmtFull(p.revenue)}</p>
                      <p style={{ fontSize:11, color:p.profit>=0?'#16a34a':'#dc2626' }}>{fmtFull(p.profit)} profit</p>
                    </div>
                  </div>
                ))}
              </>
            )}

            {dayData.revenue === 0 && dayData.visits === 0 && (
              <p style={{ textAlign:'center', color:'var(--text-muted)', padding:24 }}>No activity recorded on this day</p>
            )}
          </div>
        )}

        {/* ── STOCK COST RANGE ── */}
        <SectionHeader title="📦 Stock Purchases by Date Range" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>From</p>
            <input type="date" value={stockFrom} max={stockTo} onChange={e => setStockFrom(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
          </div>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>To</p>
            <input type="date" value={stockTo} min={stockFrom} max={today()} onChange={e => setStockTo(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
          </div>
        </div>

        {/* Quick range buttons */}
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {[
            { l:'This Week',  f:startOf('week'),  t:today() },
            { l:'This Month', f:startOf('month'), t:today() },
            { l:'This Year',  f:startOf('year'),  t:today() },
          ].map(r => (
            <button key={r.l} onClick={() => { setStockFrom(r.f); setStockTo(r.t) }}
              style={{ padding:'6px 14px', borderRadius:20, border:'1.5px solid var(--border)', background:'white', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {r.l}
            </button>
          ))}
          <button onClick={loadStockCost} className="btn btn-primary" style={{ padding:'6px 14px', fontSize:12, marginLeft:'auto' }}>
            {loadingStock ? '...' : 'Apply'}
          </button>
        </div>

        {stockData && (
          <div>
            <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { l:'Total Paid', v:fmtFull(stockData.total), c:'#dc2626' },
                  { l:'Units Bought', v:stockData.units, c:'#7c3aed' },
                  { l:'Purchases', v:stockData.count, c:'#f59e0b' },
                ].map(s => (
                  <div key={s.l} style={{ textAlign:'center' }}>
                    <p style={{ fontWeight:900, fontSize:18, color:s.c }}>{s.v}</p>
                    <p style={{ fontSize:10, color:'#6b7280' }}>{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            {stockData.rows.length > 0 && (
              <>
                <p style={{ fontSize:12, fontWeight:700, color:'var(--text-muted)', marginBottom:8, textTransform:'uppercase' }}>Purchase History</p>
                {stockData.rows.slice(0,20).map((r,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', padding:'9px 14px', background:'white', borderRadius:10, marginBottom:6, border:'1px solid var(--border)' }}>
                    <div style={{ flex:1 }}>
                      <p style={{ fontWeight:700, fontSize:13 }}>{r.products?.name || r.note || 'Unknown'}</p>
                      <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                        {r.qty} units · {new Date(r.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                      </p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <p style={{ fontWeight:800, fontSize:14, color:'#dc2626' }}>{fmtFull(r.total_cost||0)}</p>
                      <p style={{ fontSize:11, color:'var(--text-muted)' }}>${(r.cost_per_unit||0).toFixed(2)}/unit</p>
                    </div>
                  </div>
                ))}
                {stockData.rows.length > 20 && <p style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)', padding:8 }}>Showing 20 of {stockData.rows.length}</p>}
              </>
            )}

            {stockData.count === 0 && (
              <p style={{ textAlign:'center', color:'var(--text-muted)', padding:24 }}>No stock purchases in this date range</p>
            )}
          </div>
        )}

        {/* ── ALL TIME ── */}
        <SectionHeader title="All Time" />
        <StatCard icon="🏦" label="Total Stock Investment" value={loadingSummary?'...':fmt(summary?.allStock||0)} sub="total paid for all inventory" color="#dc2626" />

      </div>
    </div>
  )
}
