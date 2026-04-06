import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'

export default function SharedCatalogPage() {
  const { user, profile } = useAuth()
  const { products, addProduct } = useProducts()
  const navigate = useNavigate()
  const [tab, setTab] = useState('browse') // 'browse' | 'mine'

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1>Product Catalog</h1>
        <div style={{ width:36 }} />
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', background:'var(--gray-light)', borderRadius:10, padding:4, margin:'0 16px 0' }}>
        {[['browse','🌐 Browse All'],['mine','📤 My Shared']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: tab===t ? 'white' : 'transparent',
            color: tab===t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <div className="page" style={{ paddingTop:14 }}>
        {tab === 'browse'
          ? <BrowseCatalog user={user} profile={profile} myProducts={products} addProduct={addProduct} />
          : <MySharedProducts user={user} profile={profile} myProducts={products} />
        }
      </div>
    </div>
  )
}

// ── Browse all shared products from all users ────────────────────
function BrowseCatalog({ user, profile, myProducts, addProduct }) {
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterUser, setFilterUser] = useState('all')
  const [copying, setCopying] = useState(null)
  const [copied, setCopied] = useState(new Set())
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('shared_catalog')
      .select('*')
      .eq('is_active', true)
      .order('shared_by_name')
      .order('category')
      .order('name')
    setCatalog(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadCatalog() }, [loadCatalog])

  // All unique users who shared
  const sharedUsers = [...new Map(
    catalog.map(p => [p.admin_user_id, { id: p.admin_user_id, name: p.shared_by_name || p.shared_by_username || 'Unknown' }])
  ).values()]

  const filtered = catalog.filter(p => {
    const matchSearch = !search ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()) ||
      p.shared_by_name?.toLowerCase().includes(search.toLowerCase())
    const matchUser = filterUser === 'all' || p.admin_user_id === filterUser
    return matchSearch && matchUser
  })

  // Group by who shared, then category
  const byUser = {}
  filtered.forEach(p => {
    const uid = p.admin_user_id
    const uname = p.shared_by_name || p.shared_by_username || 'Unknown User'
    if (!byUser[uid]) byUser[uid] = { name: uname, isMe: uid === user?.id, items: {} }
    const cat = p.category || 'Other'
    if (!byUser[uid].items[cat]) byUser[uid].items[cat] = []
    byUser[uid].items[cat].push(p)
  })

  const handleCopy = async (item) => {
    setCopying(item.id)
    try {
      await addProduct({
        name: item.name,
        brand: item.brand || '',
        description: item.description || '',
        category: item.category || '',
        unit: item.unit || 'unit',
        image_url: item.image_url || null,
        images: item.images || [],
        sell_price: item.suggested_sell_price || 0,
        cost: item.suggested_cost || 0,
        avg_cost: item.suggested_cost || null,
        price_min: item.price_min || null,
        price_max: item.price_max || null,
        stock_qty: 0,
      })
      setCopied(prev => new Set([...prev, item.id]))
      showToast(`✅ "${item.name}" added to your products!`)
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setCopying(null) }
  }

  const totalShared = catalog.length

  return (
    <>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#2563eb,#1d4ed8)', borderRadius:14, padding:'14px 16px', marginBottom:14 }}>
        <p style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:3 }}>🌐 Community Product Catalog</p>
        <p style={{ color:'#bfdbfe', fontSize:12 }}>
          Browse products shared by other users. Copy any product to your own inventory instantly.
        </p>
        <p style={{ color:'#93c5fd', fontSize:12, marginTop:6 }}>
          {totalShared} products from {sharedUsers.length} user{sharedUsers.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Search */}
      <div style={{ position:'relative', marginBottom:10 }}>
        <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--text-muted)' }}>🔍</span>
        <input type="search" placeholder="Search products, brands, categories..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:'100%', padding:'11px 14px 11px 40px', border:'1.5px solid var(--border)', borderRadius:24, fontSize:15, background:'var(--gray-light)' }} />
      </div>

      {/* Filter by user */}
      {sharedUsers.length > 1 && (
        <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', marginBottom:12, paddingBottom:2 }}>
          <button onClick={() => setFilterUser('all')} style={{
            flexShrink:0, padding:'5px 14px', borderRadius:20, border:'1.5px solid', fontSize:13, cursor:'pointer', fontWeight:500,
            borderColor: filterUser==='all' ? 'var(--blue)' : 'var(--border)',
            background: filterUser==='all' ? 'var(--blue)' : 'white',
            color: filterUser==='all' ? 'white' : 'var(--text)',
          }}>All</button>
          {sharedUsers.map(u => (
            <button key={u.id} onClick={() => setFilterUser(u.id)} style={{
              flexShrink:0, padding:'5px 14px', borderRadius:20, border:'1.5px solid', fontSize:13, cursor:'pointer', fontWeight:500,
              borderColor: filterUser===u.id ? 'var(--blue)' : 'var(--border)',
              background: filterUser===u.id ? 'var(--blue)' : 'white',
              color: filterUser===u.id ? 'white' : 'var(--text)',
            }}>{u.id === user?.id ? '👤 Me' : u.name}</button>
          ))}
        </div>
      )}

      {loading && <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading catalog...</div>}

      {!loading && catalog.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ fontSize:44, marginBottom:12 }}>📭</div>
          <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>No products shared yet</p>
          <p className="text-sm text-muted">Be the first! Go to "My Shared" tab to publish your products.</p>
        </div>
      )}

      {!loading && Object.entries(byUser).map(([uid, userData]) => (
        <div key={uid}>
          {/* User section header */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:16, marginBottom:4 }}>
            <div style={{
              width:32, height:32, borderRadius:'50%', flexShrink:0,
              background: uid === user?.id ? 'linear-gradient(135deg,var(--blue),#7c3aed)' : 'linear-gradient(135deg,#16a34a,#15803d)',
              display:'flex', alignItems:'center', justifyContent:'center',
              color:'white', fontWeight:800, fontSize:14,
            }}>
              {(userData.name || '?')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight:800, fontSize:14, color:'var(--text)' }}>
                {uid === user?.id ? '👤 You' : userData.name}
              </p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>
                {Object.values(userData.items).flat().length} products shared
              </p>
            </div>
          </div>
          <div style={{ height:1, background:'var(--border)', marginBottom:10 }} />

          {Object.entries(userData.items).map(([cat, items]) => (
            <div key={cat}>
              <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', padding:'4px 0 6px' }}>{cat}</p>
              {items.map(item => {
                const isCopied = copied.has(item.id)
                const isCopying = copying === item.id
                const isOwn = item.admin_user_id === user?.id
                return (
                  <div key={item.id} className="card" style={{ marginBottom:8, padding:'11px 13px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:50, height:50, borderRadius:10, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:'1px solid var(--border)' }}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : '📦'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, fontSize:14 }}>{item.name}</p>
                      {item.brand && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{item.brand}</p>}
                      <div style={{ display:'flex', gap:8, marginTop:3, flexWrap:'wrap', alignItems:'center' }}>
                        {item.suggested_sell_price > 0 && (
                          <span style={{ fontSize:12, color:'var(--green)', fontWeight:700 }}>~${item.suggested_sell_price}/unit</span>
                        )}
                        {item.price_min && item.price_max && (
                          <span style={{ fontSize:10, color:'#854d0e', background:'#fef9c3', borderRadius:10, padding:'1px 7px', fontWeight:700, border:'1px solid #fde68a' }}>
                            🏷️ ${item.price_min}–${item.price_max}
                          </span>
                        )}
                      </div>
                    </div>
                    {isOwn ? (
                      <span style={{ fontSize:11, color:'var(--text-muted)', fontStyle:'italic', flexShrink:0 }}>yours</span>
                    ) : (
                      <button onClick={() => !isCopied && handleCopy(item)} disabled={isCopying || isCopied}
                        style={{
                          padding:'7px 14px', borderRadius:20, border:'none', cursor: isCopied ? 'default' : 'pointer',
                          fontSize:13, fontWeight:700, flexShrink:0,
                          background: isCopied ? '#dcfce7' : isCopying ? '#d1d5db' : 'var(--blue)',
                          color: isCopied ? '#16a34a' : isCopying ? '#6b7280' : 'white',
                        }}>
                        {isCopying ? '...' : isCopied ? '✅ Added' : '+ Copy'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      ))}

      {toast && (
        <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </>
  )
}

// ── My shared products — publish/unpublish own products ──────────
function MySharedProducts({ user, profile, myProducts }) {
  const [shared, setShared] = useState([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(null)
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const loadShared = useCallback(async () => {
    const { data } = await supabase.from('shared_catalog')
      .select('id, name, brand, is_active')
      .eq('admin_user_id', user.id)
    setShared(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadShared() }, [loadShared])

  const isShared = (p) => shared.find(s => s.name === p.name && (s.brand || '') === (p.brand || ''))

  const toggleShare = async (product) => {
    setPublishing(product.id)
    try {
      const existing = isShared(product)
      if (existing) {
        await supabase.from('shared_catalog').update({ is_active: !existing.is_active }).eq('id', existing.id)
        showToast(existing.is_active ? '🚫 Hidden from catalog' : '✅ Re-published!')
      } else {
        await supabase.from('shared_catalog').insert([{
          admin_user_id: user.id,
          shared_by_username: profile?.username || '',
          shared_by_name: profile?.display_name || profile?.username || 'User',
          name: product.name,
          brand: product.brand || null,
          description: product.description || null,
          category: product.category || null,
          unit: product.unit || 'unit',
          image_url: product.image_url || null,
          images: product.images || null,
          suggested_sell_price: product.sell_price || null,
          suggested_cost: product.avg_cost ?? product.cost ?? null,
          price_min: product.price_min || null,
          price_max: product.price_max || null,
        }])
        showToast('✅ Published to shared catalog!')
      }
      await loadShared()
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setPublishing(null) }
  }

  const sharedCount = shared.filter(s => s.is_active).length
  const grouped = {}
  myProducts.forEach(p => {
    const cat = p.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  })

  return (
    <>
      <div style={{ background:'linear-gradient(135deg,#7c3aed,#4f46e5)', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
        <p style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:3 }}>📤 Share Your Products</p>
        <p style={{ color:'#e0d9ff', fontSize:12 }}>
          Publish products so other users can copy them. They get the name, photo and info — not your sales, costs or stock.
        </p>
        <div style={{ display:'flex', gap:10, marginTop:10 }}>
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'6px 14px', textAlign:'center' }}>
            <p style={{ color:'white', fontWeight:800, fontSize:17 }}>{myProducts.length}</p>
            <p style={{ color:'#e0d9ff', fontSize:11 }}>Your products</p>
          </div>
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'6px 14px', textAlign:'center' }}>
            <p style={{ color:'white', fontWeight:800, fontSize:17 }}>{sharedCount}</p>
            <p style={{ color:'#e0d9ff', fontSize:11 }}>Shared</p>
          </div>
        </div>
      </div>

      {loading && <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Loading...</div>}

      {!loading && myProducts.length === 0 && (
        <div style={{ textAlign:'center', padding:'40px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
          <p className="text-muted">Add products to your inventory first, then share them here.</p>
        </div>
      )}

      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <p className="section-header">{cat}</p>
          {items.map(product => {
            const s = isShared(product)
            const isActive = s?.is_active
            const isPending = publishing === product.id
            return (
              <div key={product.id} className="card" style={{ marginBottom:8, padding:'10px 13px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : '📦'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:14 }}>{product.name}</p>
                  {product.brand && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{product.brand}</p>}
                </div>
                <button onClick={() => toggleShare(product)} disabled={isPending}
                  style={{
                    padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
                    fontSize:12, fontWeight:700, flexShrink:0,
                    background: isPending ? '#d1d5db' : isActive ? '#dcfce7' : s ? '#fef2f2' : 'var(--gray-light)',
                    color: isPending ? '#6b7280' : isActive ? '#16a34a' : s ? '#dc2626' : 'var(--text-muted)',
                  }}>
                  {isPending ? '...' : isActive ? '✅ Shared' : s ? '🚫 Hidden' : '＋ Share'}
                </button>
              </div>
            )
          })}
        </div>
      ))}

      {toast && (
        <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </>
  )
}
