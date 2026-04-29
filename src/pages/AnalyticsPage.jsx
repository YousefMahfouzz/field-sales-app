import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'

const fmt = (n) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(2)}`

// ── Monthly Bar Chart ──────────────────────────────────────────
function MonthlyChart({ data, canSeeProfit = true }) {
  const max = Math.max(...data.map(d => Math.max(d.revenue, canSeeProfit ? d.stockCost : 0)), 1)

  const legend = [['#2563eb','Revenue']]
  if (canSeeProfit) { legend.push(['#16a34a','Profit']); legend.push(['#dc2626','Stock Cost']) }

  return (
    <div className="card" style={{ padding:'16px 16px 12px', marginBottom:12 }}>
      <p style={{ fontWeight:800, fontSize:14, marginBottom:4 }}>📊 Monthly Overview – Last 6 Months</p>
      <div style={{ display:'flex', gap:4, marginBottom:8 }}>
        {legend.map(([c,l]) => (
          <div key={l} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'var(--text-muted)' }}>
            <div style={{ width:10, height:10, borderRadius:2, background:c }} />{l}
          </div>
        ))}
      </div>
      <div style={{ display:'flex', gap:6, alignItems:'flex-end', height:120 }}>
        {data.map((m, i) => {
          const rh = Math.max((m.revenue / max) * 110, m.revenue > 0 ? 3 : 0)
          const ph = canSeeProfit ? Math.max((Math.max(m.profit,0) / max) * 110, m.profit > 0 ? 3 : 0) : 0
          const sh = canSeeProfit ? Math.max((m.stockCost / max) * 110, m.stockCost > 0 ? 3 : 0) : 0
          return (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:1 }}>
              <div style={{ width:'100%', display:'flex', gap:2, alignItems:'flex-end', height:110, justifyContent:'center' }}>
                <div title={`Revenue: $${m.revenue.toFixed(2)}`} style={{ flex:1, height:rh, background:'#2563eb', borderRadius:'3px 3px 0 0', minWidth:4 }} />
                {canSeeProfit && <div title={`Profit: $${m.profit.toFixed(2)}`} style={{ flex:1, height:ph, background:'#16a34a', borderRadius:'3px 3px 0 0', minWidth:4 }} />}
                {canSeeProfit && <div title={`Stock: $${m.stockCost.toFixed(2)}`} style={{ flex:1, height:sh, background:'#dc2626', borderRadius:'3px 3px 0 0', minWidth:4 }} />}
              </div>
              <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>{m.label}</p>
              {m.revenue > 0 && <p style={{ fontSize:9, color:'#2563eb', fontWeight:700 }}>{fmt(m.revenue)}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}


const fmtFull = (n) => `$${n.toFixed(2)}`
// Always use Central Time (America/Chicago) for date boundaries
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
const startOf = (unit) => {
  const ct = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
  if (unit === 'month') ct.setDate(1)
  if (unit === 'week') ct.setDate(ct.getDate() - ct.getDay())
  if (unit === 'year') { ct.setMonth(0); ct.setDate(1) }
  return ct.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
}
// Convert a CT date string (YYYY-MM-DD) to UTC start/end for Supabase queries
const ctStart = (d) => {
  if (!d) return new Date().toISOString()
  const isDST = new Date(`${d}T12:00:00Z`)
    .toLocaleString('en-US', { timeZone:'America/Chicago', timeZoneName:'short' })
    .includes('CDT')
  const h = isDST ? 5 : 6
  return `${d}T${String(h).padStart(2,'0')}:00:00.000Z`
}
const ctEnd = (d) => {
  if (!d) return new Date().toISOString()
  const isDST = new Date(`${d}T12:00:00Z`)
    .toLocaleString('en-US', { timeZone:'America/Chicago', timeZoneName:'short' })
    .includes('CDT')
  const h = isDST ? 5 : 6
  // End of day = next day's start - 1ms
  const nextDay = new Date(`${d}T${String(h).padStart(2,'0')}:00:00.000Z`)
  nextDay.setDate(nextDay.getDate() + 1)
  nextDay.setMilliseconds(nextDay.getMilliseconds() - 1)
  return nextDay.toISOString()
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
  const { user, canSeeProfit } = useAuth()
  const { products } = useProducts()
  const navigate = useNavigate()

  // ── Sales lookup (date range) ──
  const [searchFrom, setSearchFrom] = useState(today())
  const [searchTo, setSearchTo] = useState(today())
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

  // ── Top Sellers ──
  const [topSellersPeriod, setTopSellersPeriod] = useState('month') // 'week' | 'month' | 'year' | 'all'
  const [topSellers, setTopSellers] = useState([])
  const [loadingTopSellers, setLoadingTopSellers] = useState(false)
  const [topSellersUpdating, setTopSellersUpdating] = useState(false)
  const [topSellersFlag, setTopSellersFlag] = useState({}) // { productId: true } - which products are flagged best_seller

  // ── Top Buyers (by product) ──
  const [topBuyersProduct, setTopBuyersProduct] = useState(null) // selected product id
  const [topBuyersSearch, setTopBuyersSearch] = useState('')
  const [topBuyers, setTopBuyers] = useState([])
  const [loadingTopBuyers, setLoadingTopBuyers] = useState(false)

  // ── Today auto-load ──
  const [todayData, setTodayData] = useState(null)
  const [monthlyChart, setMonthlyChart] = useState([])

  const loadTopSellers = useCallback(async (period = topSellersPeriod) => {
    if (!user) return
    setLoadingTopSellers(true)
    try {
      let fromDate
      if (period === 'week') fromDate = startOf('week')
      else if (period === 'month') fromDate = startOf('month')
      else if (period === 'year') fromDate = startOf('year')
      else fromDate = null

      let q = supabase.from('sale_items')
        .select('product_id, product_name, qty, total_price, total_profit')
        .eq('user_id', user.id)
      if (fromDate) q = q.gte('created_at', ctStart(fromDate))
      const { data: items } = await q.limit(10000)

      // Aggregate by product_id
      const map = {}
      for (const it of items || []) {
        if (!it.product_id) continue
        if (!map[it.product_id]) map[it.product_id] = { product_id: it.product_id, name: it.product_name, qty: 0, revenue: 0, profit: 0 }
        map[it.product_id].qty += it.qty || 0
        map[it.product_id].revenue += it.total_price || 0
        map[it.product_id].profit += it.total_profit || 0
      }

      // Fetch product info (category, image)
      const ids = Object.keys(map)
      if (ids.length > 0) {
        const { data: prods } = await supabase.from('products')
          .select('id, name, category, image_url, brand, stock_qty, sell_price')
          .in('id', ids)
        const prodMap = Object.fromEntries((prods || []).map(p => [p.id, p]))
        for (const id of ids) {
          map[id].product = prodMap[id]
          map[id].category = prodMap[id]?.category || 'Other'
        }
      }

      const list = Object.values(map).filter(x => x.product).sort((a, b) => b.revenue - a.revenue)
      setTopSellers(list)
    } catch (e) { console.error(e) }
    finally { setLoadingTopSellers(false) }
  }, [user, topSellersPeriod])

  // Load best_seller flags from products
  const loadFlags = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('products')
      .select('id').eq('user_id', user.id).eq('is_best_seller', true)
    const flags = {}
    for (const p of data || []) flags[p.id] = true
    setTopSellersFlag(flags)
  }, [user])

  // Toggle a product's best_seller flag (shows badge on price list)
  const toggleBestSeller = async (productId) => {
    setTopSellersUpdating(true)
    const newVal = !topSellersFlag[productId]
    const { error } = await supabase.from('products').update({ is_best_seller: newVal }).eq('id', productId)
    if (!error) {
      setTopSellersFlag(prev => ({ ...prev, [productId]: newVal }))
    }
    setTopSellersUpdating(false)
  }

  // Auto-flag top N best sellers
  const autoFlagTop = async (n = 3) => {
    if (!window.confirm(`Auto-flag the top ${n} sellers per category as 'Best Seller' on the price list? This will replace any existing flags.`)) return
    setTopSellersUpdating(true)
    try {
      // Group by category, pick top N per category
      const byCategory = {}
      for (const ts of topSellers) {
        if (!byCategory[ts.category]) byCategory[ts.category] = []
        byCategory[ts.category].push(ts)
      }
      const newFlags = new Set()
      for (const cat in byCategory) {
        for (const ts of byCategory[cat].slice(0, n)) {
          newFlags.add(ts.product_id)
        }
      }
      // Clear all existing flags then set new ones
      await supabase.from('products').update({ is_best_seller: false }).eq('user_id', user.id)
      if (newFlags.size > 0) {
        await supabase.from('products').update({ is_best_seller: true }).in('id', [...newFlags])
      }
      const flags = {}
      for (const id of newFlags) flags[id] = true
      setTopSellersFlag(flags)
    } catch (e) {
      console.error(e)
      alert('❌ ' + e.message)
    } finally {
      setTopSellersUpdating(false)
    }
  }

  const loadRange = useCallback(async (fromDate, toDate) => {
    if (!user || !fromDate || !toDate) return
    setLoadingDay(true)
    try {
      const from = ctStart(fromDate)
      const to   = ctEnd(toDate)
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

      // Sales revenue + profit for different periods — all use CT-aware UTC timestamps
      const [todayItems, monthItems, weekItems, yearItems] = await Promise.all([
        supabase.from('sale_items').select('total_price,total_cost,total_profit,qty')
          .eq('user_id', user.id).gte('created_at', ctStart(t)).lte('created_at', new Date().toISOString()),
        supabase.from('sale_items').select('total_price,total_cost,total_profit,qty')
          .eq('user_id', user.id).gte('created_at', ctStart(ms)),
        supabase.from('sale_items').select('total_price,total_cost,total_profit,qty')
          .eq('user_id', user.id).gte('created_at', ctStart(ws)),
        supabase.from('sale_items').select('total_price,total_cost,total_profit,qty')
          .eq('user_id', user.id).gte('created_at', ctStart(ys)),
      ])

      // Stock purchased this month
      const [monthStock, allStock] = await Promise.all([
        supabase.from('stock_movements').select('total_cost').eq('user_id', user.id).eq('type','in').gte('created_at', ctStart(ms)),
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

      // Build monthly chart — last 6 months
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }))
        d.setDate(1)
        d.setMonth(d.getMonth() - i)
        const from = d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        const dEnd = new Date(d)
        dEnd.setMonth(dEnd.getMonth() + 1)
        dEnd.setDate(0)
        const to = dEnd.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' })
        months.push({ label: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'America/Chicago' }), from, to })
      }
      const chartData = await Promise.all(months.map(async m => {
        const [sales, stock] = await Promise.all([
          supabase.from('sale_items').select('total_price,total_cost,total_profit').eq('user_id', user.id)
            .gte('created_at', m.from+'T00:00:00').lte('created_at', m.to+'T23:59:59'),
          supabase.from('stock_movements').select('total_cost').eq('user_id', user.id).eq('type','in')
            .gte('created_at', m.from+'T00:00:00').lte('created_at', m.to+'T23:59:59'),
        ])
        const revenue = (sales.data||[]).reduce((s,i)=>s+(i.total_price||0),0)
        const profit  = (sales.data||[]).reduce((s,i)=>s+(i.total_profit||0),0)
        const stockCost = (stock.data||[]).reduce((s,i)=>s+(i.total_cost||0),0)
        return { label: m.label, revenue, profit, stockCost }
      }))
      setMonthlyChart(chartData)
    } catch(e) { console.error(e) }
    finally { setLoadingSummary(false) }
  }, [user])

  useEffect(() => { loadSummary() }, [loadSummary])
  useEffect(() => { loadRange(today(), today()) }, [loadRange])
  useEffect(() => { loadStockCost() }, [loadStockCost])
  useEffect(() => { loadTopSellers(topSellersPeriod) }, [loadTopSellers, topSellersPeriod])
  useEffect(() => { loadFlags() }, [loadFlags])

  // ── Load Top Buyers for a selected product ──
  const loadTopBuyers = useCallback(async (productId) => {
    if (!user || !productId) { setTopBuyers([]); return }
    setLoadingTopBuyers(true)
    try {
      // 1. Get all sale_items for this product (across all visits)
      const { data: saleItems } = await supabase
        .from('sale_items')
        .select('qty, unit_price, visit_id')
        .eq('user_id', user.id)
        .eq('product_id', productId)

      if (!saleItems || saleItems.length === 0) {
        setTopBuyers([]); setLoadingTopBuyers(false); return
      }

      // 2. Fetch visits to map visit_id → customer_id (and last_visit_date)
      const visitIds = [...new Set(saleItems.map(s => s.visit_id).filter(Boolean))]
      const { data: visits } = await supabase
        .from('visits')
        .select('id, customer_id, created_at')
        .in('id', visitIds)
      const visitMap = new Map((visits || []).map(v => [v.id, v]))

      // 3. Aggregate by customer
      const byCustomer = {} // customer_id → { qty, revenue, lastVisit, visits }
      saleItems.forEach(si => {
        const visit = visitMap.get(si.visit_id)
        if (!visit?.customer_id) return
        const cid = visit.customer_id
        if (!byCustomer[cid]) byCustomer[cid] = { qty: 0, revenue: 0, lastVisit: null, visitCount: 0 }
        byCustomer[cid].qty += si.qty
        byCustomer[cid].revenue += si.qty * (si.unit_price || 0)
        byCustomer[cid].visitCount += 1
        if (!byCustomer[cid].lastVisit || visit.created_at > byCustomer[cid].lastVisit) {
          byCustomer[cid].lastVisit = visit.created_at
        }
      })

      // 4. Fetch customer details
      const customerIds = Object.keys(byCustomer)
      if (customerIds.length === 0) { setTopBuyers([]); setLoadingTopBuyers(false); return }
      const { data: customers } = await supabase
        .from('customers')
        .select('id, business_name, full_name, phone, area, address, status')
        .in('id', customerIds)
      const customerMap = new Map((customers || []).map(c => [c.id, c]))

      // 5. Build sorted list
      const result = customerIds
        .map(cid => ({ customer: customerMap.get(cid), ...byCustomer[cid] }))
        .filter(r => r.customer)
        .sort((a, b) => b.qty - a.qty)

      setTopBuyers(result)
    } catch (err) {
      console.error('Top buyers load error:', err)
      setTopBuyers([])
    } finally {
      setLoadingTopBuyers(false)
    }
  }, [user])

  useEffect(() => { loadTopBuyers(topBuyersProduct) }, [loadTopBuyers, topBuyersProduct])

  const prettyDate = (d) => {
    if (d === today()) return 'Today'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })
  }
  const prettyRange = () => {
    if (searchFrom === searchTo) return prettyDate(searchFrom)
    return `${prettyDate(searchFrom)} – ${prettyDate(searchTo)}`
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
        <h1>{'Analytics'}</h1>
        <div style={{ width:36 }} />
      </div>

      <div className="page" style={{ paddingTop:12 }}>

        {/* ── TODAY SUMMARY ── */}
        <div style={{ background:'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius:14, padding:'16px 18px', marginBottom:16 }}>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:10 }}>Today's Performance</p>
          <div style={{ display:'grid', gridTemplateColumns: canSeeProfit ? '1fr 1fr 1fr' : '1fr 1fr', gap:10 }}>
            {[
              { label:'Revenue', value: loadingSummary ? '...' : fmtFull(summary?.today?.revenue||0), color:'#7dd3fc' },
              ...(canSeeProfit ? [{ label:'Profit',  value: loadingSummary ? '...' : fmtFull(summary?.today?.profit||0),  color: (summary?.today?.profit||0)>=0 ? '#86efac' : '#fca5a5' }] : []),
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
          <StatCard icon="📅" label="This Week" value={loadingSummary?'...':fmt(summary?.week?.revenue||0)} sub={canSeeProfit ? `${fmtFull(summary?.week?.profit||0)} profit` : undefined} color="#2563eb" />
          <StatCard icon="🗓️" label="This Month" value={loadingSummary?'...':fmt(summary?.month?.revenue||0)} sub={canSeeProfit ? `${fmtFull(summary?.month?.profit||0)} profit` : undefined} color="#7c3aed" />
        </div>
        {canSeeProfit && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:4 }}>
          <StatCard icon="📦" label="Stock (month)" value={loadingSummary?'...':fmt(summary?.monthStock||0)} sub="paid for inventory" color="#dc2626" />
          <StatCard icon="💡" label="Net (month)" value={loadingSummary?'...':fmtFull((summary?.month?.profit||0)-(summary?.monthStock||0))} sub="profit minus stock cost" color={(summary?.month?.profit||0)-(summary?.monthStock||0)>=0?'#16a34a':'#dc2626'} />
        </div>
        )}
        <StatCard icon="📆" label="This Year Revenue" value={loadingSummary?'...':fmt(summary?.year?.revenue||0)} sub={canSeeProfit ? `${fmtFull(summary?.year?.profit||0)} profit · ${summary?.year?.units||0} units sold` : `${summary?.year?.units||0} units sold`} color="#059669" />

        {/* ── SEARCH BY DATE RANGE ── */}
        <SectionHeader title="📅 Sales by Date Range" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>From</p>
            <input type="date" value={searchFrom} max={searchTo} onChange={e => setSearchFrom(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
          </div>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>To</p>
            <input type="date" value={searchTo} min={searchFrom} max={today()} onChange={e => setSearchTo(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {[
            { l:'Today',      f:today(),          t:today() },
            { l:'Yesterday',  f:(() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toLocaleDateString('en-CA', { timeZone:'America/Chicago' }) })(), t:(() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toLocaleDateString('en-CA', { timeZone:'America/Chicago' }) })() },
            { l:'This Week',  f:startOf('week'),  t:today() },
            { l:'This Month', f:startOf('month'), t:today() },
            { l:'This Year',  f:startOf('year'),  t:today() },
          ].map(r => (
            <button key={r.l} onClick={() => { setSearchFrom(r.f); setSearchTo(r.t) }}
              style={{ padding:'6px 14px', borderRadius:20, border:`1.5px solid ${searchFrom===r.f && searchTo===r.t ? 'var(--blue)' : 'var(--border)'}`, background: searchFrom===r.f && searchTo===r.t ? 'var(--blue)' : 'white', color: searchFrom===r.f && searchTo===r.t ? 'white' : 'var(--text)', fontSize:12, fontWeight:600, cursor:'pointer' }}>
              {r.l}
            </button>
          ))}
          <button onClick={() => loadRange(searchFrom, searchTo)} className="btn btn-primary" style={{ padding:'6px 14px', fontSize:12, marginLeft:'auto' }}>
            {loadingDay ? '...' : 'Search'}
          </button>
        </div>

        {dayData && (
          <div>
            <div style={{ background:'var(--gray-light)', borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
              <p style={{ fontWeight:800, fontSize:15, marginBottom:10 }}>{prettyRange()}</p>
              <div style={{ display:'grid', gridTemplateColumns: canSeeProfit ? 'repeat(4,1fr)' : 'repeat(3,1fr)', gap:8 }}>
                {[
                  { l:'Revenue', v:fmtFull(dayData.revenue), c:'#2563eb' },
                  ...(canSeeProfit ? [{ l:'Profit',  v:fmtFull(dayData.profit),  c:dayData.profit>=0?'#16a34a':'#dc2626' }] : []),
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
                      {canSeeProfit && <p style={{ fontSize:11, color:p.profit>=0?'#16a34a':'#dc2626' }}>{fmtFull(p.profit)} profit</p>}
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

        {/* ── STOCK COST RANGE (hidden for drivers without profit access) ── */}
        {canSeeProfit && (<>
        {/* ── TOP SELLERS ── */}
        <SectionHeader title="🔥 Top Sellers (What to Reorder)" />
        <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
          {[
            { key:'week', label:'This Week' },
            { key:'month', label:'This Month' },
            { key:'year', label:'This Year' },
            { key:'all', label:'All Time' },
          ].map(p => (
            <button key={p.key} onClick={() => setTopSellersPeriod(p.key)}
              style={{
                padding:'6px 14px', borderRadius:20,
                border: `1.5px solid ${topSellersPeriod === p.key ? '#d4a843' : 'var(--border)'}`,
                background: topSellersPeriod === p.key ? '#d4a843' : 'white',
                color: topSellersPeriod === p.key ? '#0a0a0a' : 'var(--text)',
                fontSize:12, fontWeight: topSellersPeriod === p.key ? 800 : 600,
                cursor:'pointer',
              }}>
              {p.label}
            </button>
          ))}
          {topSellers.length > 0 && (
            <button onClick={() => autoFlagTop(3)} disabled={topSellersUpdating}
              style={{ padding:'6px 14px', borderRadius:20, border:'1.5px solid #b8860b', background:'#fffbeb', color:'#92400e', fontSize:12, fontWeight:700, cursor:'pointer', marginLeft:'auto' }}>
              ⚡ Auto-flag Top 3/Category
            </button>
          )}
        </div>

        {loadingTopSellers && <p className="text-sm text-muted" style={{ textAlign:'center', padding:14 }}>Loading top sellers...</p>}

        {!loadingTopSellers && topSellers.length === 0 && (
          <div className="card" style={{ padding:24, textAlign:'center' }}>
            <p style={{ fontSize:32, marginBottom:8 }}>📊</p>
            <p className="text-sm text-muted">No sales data for this period yet.</p>
          </div>
        )}

        {/* Group by category */}
        {!loadingTopSellers && topSellers.length > 0 && (() => {
          const byCategory = {}
          for (const ts of topSellers) {
            if (!byCategory[ts.category]) byCategory[ts.category] = []
            byCategory[ts.category].push(ts)
          }
          const sortedCats = Object.keys(byCategory).sort((a,b) =>
            byCategory[b].reduce((s,x) => s + x.revenue, 0) - byCategory[a].reduce((s,x) => s + x.revenue, 0)
          )
          return sortedCats.map(cat => {
            const items = byCategory[cat]
            const catRevenue = items.reduce((s,x) => s + x.revenue, 0)
            const catUnits = items.reduce((s,x) => s + x.qty, 0)
            return (
              <div key={cat} style={{ marginBottom:18 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'linear-gradient(90deg, #1a1500, #0a0a0a)', borderRadius:'10px 10px 0 0', border:'1px solid rgba(212,168,67,0.25)', borderBottom:'none' }}>
                  <p style={{ fontWeight:800, fontSize:13, color:'#f0d078', letterSpacing:0.3 }}>{cat}</p>
                  <p style={{ fontSize:11, color:'rgba(212,168,67,0.7)', fontWeight:600 }}>{catUnits} units · ${catRevenue.toFixed(0)}</p>
                </div>
                {items.slice(0, 5).map((ts, i) => {
                  const flagged = topSellersFlag[ts.product_id]
                  const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`
                  return (
                    <div key={ts.product_id} className="card" style={{
                      marginBottom: 0, borderRadius: i === items.slice(0,5).length-1 ? '0 0 10px 10px' : 0,
                      borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                      padding:'10px 14px', display:'flex', alignItems:'center', gap:12,
                    }}>
                      <span style={{ fontSize:18, width:30, textAlign:'center', flexShrink:0 }}>{medal}</span>
                      <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                        {ts.product?.image_url ? <img src={ts.product.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ts.name}</p>
                        <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                          {ts.qty} sold · ${ts.revenue.toFixed(0)} revenue
                          {ts.product?.stock_qty != null && (
                            <span style={{ color: ts.product.stock_qty <= 5 ? '#dc2626' : ts.product.stock_qty <= 20 ? '#d97706' : 'var(--text-muted)', fontWeight:600 }}>
                              {' · '}{ts.product.stock_qty} in stock{ts.product.stock_qty <= 5 ? ' ⚠️' : ''}
                            </span>
                          )}
                        </p>
                      </div>
                      <button onClick={() => toggleBestSeller(ts.product_id)} disabled={topSellersUpdating}
                        title={flagged ? 'Remove Best Seller badge' : 'Show as Best Seller on price list'}
                        style={{
                          padding:'5px 10px', borderRadius:14, border:'1.5px solid',
                          borderColor: flagged ? '#16a34a' : 'var(--border)',
                          background: flagged ? '#dcfce7' : 'white',
                          color: flagged ? '#16a34a' : 'var(--text-muted)',
                          fontSize:10, fontWeight:700, cursor:'pointer', flexShrink:0, whiteSpace:'nowrap',
                        }}>
                        {flagged ? '🔥 Featured' : '＋ Feature'}
                      </button>
                    </div>
                  )
                })}
                {items.length > 5 && (
                  <p style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center', padding:'4px 0' }}>
                    + {items.length - 5} more in {cat}
                  </p>
                )}
              </div>
            )
          })
        })()}

        {/* ── TOP BUYERS PER PRODUCT ── */}
        <SectionHeader title="👥 Top Buyers (Who Buys What)" />
        <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, lineHeight:1.5 }}>
          Pick a product to see customers ranked by total quantity purchased — most loyal buyers at the top.
        </p>

        <div style={{ position:'relative', marginBottom:12 }}>
          <input
            type="search"
            placeholder="🔎 Search a product…"
            value={topBuyersSearch}
            onChange={e => setTopBuyersSearch(e.target.value)}
            style={{ width:'100%', padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14, background:'var(--surface-2)' }}
          />
        </div>

        {/* Show product list filtered by search */}
        {topBuyersSearch.trim() !== '' && !topBuyersProduct && products.length > 0 && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, marginBottom:12, maxHeight:220, overflowY:'auto' }}>
            {products
              .filter(p => p.is_active !== false &&
                (p.name?.toLowerCase().includes(topBuyersSearch.toLowerCase()) ||
                 p.brand?.toLowerCase().includes(topBuyersSearch.toLowerCase()) ||
                 p.category?.toLowerCase().includes(topBuyersSearch.toLowerCase())))
              .slice(0, 20)
              .map(p => (
                <div key={p.id}
                  onClick={() => { setTopBuyersProduct(p.id); setTopBuyersSearch('') }}
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderBottom:'1px solid var(--border)', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width:34, height:34, borderRadius:6, background:'var(--surface-2)', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                    {p.image_url ? <img src={p.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:600, fontSize:13, marginBottom:1 }}>{p.name}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)' }}>{p.brand ? `${p.brand} · ` : ''}{p.category || '—'}</p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Selected product header */}
        {topBuyersProduct && (() => {
          const p = products.find(x => x.id === topBuyersProduct)
          if (!p) return null
          const totalQty = topBuyers.reduce((s, b) => s + b.qty, 0)
          const totalRev = topBuyers.reduce((s, b) => s + b.revenue, 0)
          return (
            <div className="card" style={{ marginBottom:12, padding:14, border:'1.5px solid #d4a843', background:'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <div style={{ width:46, height:46, borderRadius:8, background:'white', flexShrink:0, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:'1px solid #fde68a' }}>
                  {p.image_url ? <img src={p.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontSize:11, color:'#78350f', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Selected Product</p>
                  <p style={{ fontWeight:800, fontSize:15, color:'#0f172a' }}>{p.name}</p>
                  {p.brand && <p style={{ fontSize:11, color:'#78350f' }}>{p.brand}</p>}
                </div>
                <button onClick={() => setTopBuyersProduct(null)} style={{ background:'rgba(146,64,14,0.1)', border:'none', color:'#92400e', borderRadius:6, padding:'6px 12px', fontSize:11, fontWeight:700, cursor:'pointer' }}>✕ Clear</button>
              </div>
              {topBuyers.length > 0 && (
                <div style={{ display:'flex', gap:14, paddingTop:10, borderTop:'1px dashed #fbbf24', fontSize:12 }}>
                  <span><strong style={{ color:'#92400e', fontSize:14 }}>{topBuyers.length}</strong> <span style={{ color:'#78350f' }}>buyer{topBuyers.length !== 1 ? 's' : ''}</span></span>
                  <span><strong style={{ color:'#92400e', fontSize:14 }}>{totalQty}</strong> <span style={{ color:'#78350f' }}>units sold</span></span>
                  <span><strong style={{ color:'#92400e', fontSize:14 }}>${totalRev.toFixed(2)}</strong> <span style={{ color:'#78350f' }}>revenue</span></span>
                </div>
              )}
            </div>
          )
        })()}

        {/* Loading */}
        {loadingTopBuyers && (
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text-muted)', fontSize:13 }}>Loading buyers…</div>
        )}

        {/* Buyer list */}
        {!loadingTopBuyers && topBuyersProduct && topBuyers.length === 0 && (
          <div className="card" style={{ textAlign:'center', padding:'24px 14px', color:'var(--text-muted)' }}>
            <p style={{ fontSize:32, marginBottom:8 }}>—</p>
            <p style={{ fontSize:13 }}>No sales of this product yet.</p>
          </div>
        )}

        {!loadingTopBuyers && topBuyers.length > 0 && (
          <div style={{ marginBottom:24 }}>
            {topBuyers.map((b, i) => {
              const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`
              return (
                <div key={b.customer.id} className="card" style={{ marginBottom:8, padding:12, display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ fontSize:22, fontWeight:900, width:38, textAlign:'center', flexShrink:0, color: i < 3 ? '#d4a843' : 'var(--text-muted)' }}>
                    {medal}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14, marginBottom:2 }}>{b.customer.business_name || b.customer.full_name}</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                      {b.customer.area && `📍 ${b.customer.area} · `}
                      {b.customer.phone && `📞 ${b.customer.phone}`}
                    </p>
                    <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                      Last bought: {b.lastVisit ? new Date(b.lastVisit).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) : '—'}
                      {' · '}{b.visitCount} order{b.visitCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontWeight:900, fontSize:16, color:'#16a34a' }}>{b.qty}</p>
                    <p style={{ fontSize:10, color:'var(--text-muted)' }}>units</p>
                    <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>${b.revenue.toFixed(2)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── STOCK PURCHASES ── */}
        <SectionHeader title="📦 Stock Purchases by Date Range" />
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>{'From'}</p>
            <input type="date" value={stockFrom} max={stockTo} onChange={e => setStockFrom(e.target.value)}
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
          </div>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4, fontWeight:600 }}>{'To'}</p>
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
        </>)}

        {/* ── MONTHLY CHART ── */}
        {monthlyChart.length > 0 && <MonthlyChart data={monthlyChart} canSeeProfit={canSeeProfit} />}

        {/* ── ALL TIME ── */}
        {canSeeProfit && (<>
        <SectionHeader title="All Time" />
        <StatCard icon="🏦" label="Total Stock Investment" value={loadingSummary?'...':fmt(summary?.allStock||0)} sub="total paid for all inventory" color="#dc2626" />
        </>)}

      </div>
    </div>
  )
}
