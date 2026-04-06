import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import { useAuth } from '../hooks/useAuth'

export default function ProductsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { products, loading } = useProducts()
  const [search, setSearch] = useState('')
  const [groupBy, setGroupBy] = useState('category')
  const isAdmin = profile?.is_admin === true

  const filtered = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.brand || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(search.toLowerCase())
  )

  // Inventory value calculations using avg_cost (falls back to cost)
  const totalCostValue  = products.reduce((s, p) => s + (p.stock_qty||0) * (p.avg_cost ?? p.cost ?? 0), 0)
  const totalSellValue  = products.reduce((s, p) => s + (p.stock_qty||0) * (p.sell_price ?? 0), 0)
  const totalProfit     = totalSellValue - totalCostValue
  const profitMargin    = totalSellValue > 0 ? ((totalProfit / totalSellValue) * 100).toFixed(0) : 0
  const inStockCount    = products.filter(p => (p.stock_qty||0) > 0).length
  const lowStockCount   = products.filter(p => (p.stock_qty||0) > 0 && (p.stock_qty||0) <= 5).length
  const outOfStockCount = products.filter(p => (p.stock_qty||0) <= 0).length

  // Group by category
  const grouped = {}
  filtered.forEach(p => {
    const key = groupBy === 'category' ? (p.category || 'Other') : 'All'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  })

  const shareList = () => {
    const url = profile?.username
      ? `${window.location.origin}/u/${profile.username}/pricelist`
      : `${window.location.origin}/pricelist`
    if (navigator.share) navigator.share({ title:`${profile?.display_name||'My'} Price List`, url })
    else { navigator.clipboard.writeText(url); alert('Link copied!\n\n' + url) }
  }

  return (
    <div>
      <div className="page-header" style={{ flexDirection:'column', alignItems:'stretch', gap:8, padding:'10px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <h1>Products</h1>
          <button className="btn btn-primary btn-sm" onClick={() => navigate('/products/new')}>+ Add</button>
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const url = profile?.username
              ? `${window.location.origin}/u/${profile.username}/pricelist`
              : `${window.location.origin}/pricelist`
            const a = document.createElement('a')
            a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.click()
          }} style={{ fontSize:11, padding:'5px 10px' }}>👁️ View</button>
          <button className="btn btn-ghost btn-sm" onClick={shareList} style={{ fontSize:11, padding:'5px 10px' }}>🔗 Share</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/price-lists')} style={{ fontSize:11, padding:'5px 10px' }}>📋 Lists</button>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/shared-catalog')} style={{ fontSize:11, padding:'5px 10px' }}>
            {isAdmin ? '👑 Shared' : '📦 Catalog'}
          </button>
          {isAdmin && <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/homepage')} style={{ fontSize:11, padding:'5px 10px' }}>🏠 Featured</button>}
        </div>
      </div>

      {/* ── INVENTORY SUMMARY ── */}
      <div style={{ padding:'0 16px 14px' }}>

        {/* Big 3 value cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:10 }}>
          <div style={{
            background:'white', borderRadius:14, padding:'12px 10px', textAlign:'center',
            border:'1.5px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
          }}>
            <p style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px' }}>Cost Value</p>
            <p style={{ fontWeight:900, fontSize:17, color:'#dc2626' }}>${totalCostValue.toFixed(0)}</p>
            <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:2 }}>what you paid</p>
          </div>
          <div style={{
            background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', borderRadius:14, padding:'12px 10px', textAlign:'center',
            border:'1.5px solid #86efac', boxShadow:'0 1px 4px rgba(22,163,74,0.1)',
          }}>
            <p style={{ fontSize:10, color:'#15803d', fontWeight:600, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px' }}>Sell Value</p>
            <p style={{ fontWeight:900, fontSize:17, color:'#16a34a' }}>${totalSellValue.toFixed(0)}</p>
            <p style={{ fontSize:9, color:'#15803d', marginTop:2 }}>if sold at list</p>
          </div>
          <div style={{
            background:'linear-gradient(135deg,#eff6ff,#dbeafe)', borderRadius:14, padding:'12px 10px', textAlign:'center',
            border:`1.5px solid ${totalProfit >= 0 ? '#93c5fd' : '#fca5a5'}`,
            boxShadow:'0 1px 4px rgba(37,99,235,0.1)',
          }}>
            <p style={{ fontSize:10, color:totalProfit>=0?'#1d4ed8':'#dc2626', fontWeight:600, marginBottom:3, textTransform:'uppercase', letterSpacing:'0.5px' }}>Profit</p>
            <p style={{ fontWeight:900, fontSize:17, color:totalProfit>=0?'#2563eb':'#dc2626' }}>${totalProfit.toFixed(0)}</p>
            <p style={{ fontSize:9, color:totalProfit>=0?'#1d4ed8':'#dc2626', marginTop:2 }}>{profitMargin}% margin</p>
          </div>
        </div>

        {/* Stock status row */}
        <div style={{ display:'flex', gap:8 }}>
          {[
            { label:`${products.length} products`, color:'#64748b', bg:'#f8fafc', border:'#e2e8f0' },
            { label:`${inStockCount} in stock`, color:'#16a34a', bg:'#f0fdf4', border:'#86efac' },
            lowStockCount > 0 && { label:`${lowStockCount} low`, color:'#d97706', bg:'#fffbeb', border:'#fde68a' },
            outOfStockCount > 0 && { label:`${outOfStockCount} out`, color:'#dc2626', bg:'#fff1f2', border:'#fca5a5' },
          ].filter(Boolean).map((s, i) => (
            <div key={i} style={{
              padding:'5px 10px', borderRadius:20, fontSize:11, fontWeight:700,
              color:s.color, background:s.bg, border:`1px solid ${s.border}`,
            }}>{s.label}</div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="search-bar">
        <span className="search-icon">🔍</span>
        <input
          type="search" placeholder="Search products, brand, category..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ background:'var(--gray-light)', border:'1.5px solid var(--border)', borderRadius:24, padding:'11px 14px 11px 40px', width:'100%', fontSize:16 }}
        />
      </div>

      <div className="page" style={{ paddingTop:0 }}>
        {loading && <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading...</div>}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>{search ? 'No products match' : 'No products yet'}</h3>
            {!search && (
              <button className="btn btn-primary" style={{ marginTop:16 }} onClick={() => navigate('/products/new')}>Add First Product</button>
            )}
          </div>
        )}

        {Object.entries(grouped).map(([cat, items]) => {
          const catCost = items.reduce((s, p) => s + (p.stock_qty||0) * (p.avg_cost ?? p.cost ?? 0), 0)
          const catSell = items.reduce((s, p) => s + (p.stock_qty||0) * (p.sell_price ?? 0), 0)
          return (
            <div key={cat}>
              {groupBy === 'category' && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8, marginTop:8 }}>
                  <p className="section-header" style={{ margin:0 }}>{cat}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                    cost ${catCost.toFixed(0)} · sell ${catSell.toFixed(0)}
                  </p>
                </div>
              )}
              {items.map(product => {
                const avgCost = product.avg_cost ?? product.cost ?? 0
                const unitProfit = product.sell_price - avgCost
                const stockVal = (product.stock_qty||0) * avgCost
                const hasAvgDiff = product.avg_cost != null && Math.abs(product.avg_cost - product.cost) > 0.01
                return (
                  <div key={product.id} className="card card-tap" onClick={() => navigate(`/products/${product.id}`)}
                    style={{ marginBottom:8 }}>
                    <div className="flex gap-12 items-center">
                      {/* Image */}
                      <div style={{
                        width:52, height:52, borderRadius:10, flexShrink:0,
                        background:product.image_url ? 'transparent' : 'var(--gray-light)',
                        border:'1px solid var(--border)', overflow:'hidden',
                        display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
                      }}>
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} loading="lazy" />
                          : '📦'}
                      </div>

                      {/* Info */}
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontWeight:700, fontSize:15, marginBottom:1 }}>{product.name}</p>
                        {product.brand && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{product.brand}</p>}
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginTop:3 }}>
                          <span style={{ fontSize:11, color:'var(--text-muted)' }}>
                            Cost: ${avgCost.toFixed(2)}{hasAvgDiff ? ' avg' : ''}
                          </span>
                          <span style={{ fontSize:11, color:'var(--green)', fontWeight:700 }}>
                            Sell: ${product.sell_price.toFixed(2)}
                          </span>
                          <span style={{ fontSize:11, color: unitProfit >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight:600 }}>
                            +${unitProfit.toFixed(2)}
                          </span>
                        </div>
                        {/* Stock cost value */}
                        <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                          Stock value: ${stockVal.toFixed(0)}
                        </p>
                      </div>

                      {/* Stock qty */}
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{
                          fontWeight:800, fontSize:20,
                          color: product.stock_qty <= 0 ? 'var(--red)' : product.stock_qty <= 5 ? 'var(--amber)' : 'var(--green)'
                        }}>
                          {product.stock_qty || 0}
                        </div>
                        <div style={{ fontSize:10, color:'var(--text-muted)' }}>{product.unit}s</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
