import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AdminInventoryPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.is_admin === true

  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [products, setProducts] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [search, setSearch] = useState('')

  // Redirect non-admins
  useEffect(() => {
    if (profile && !isAdmin) navigate('/')
  }, [profile, isAdmin, navigate])

  // Load all users
  useEffect(() => {
    if (!isAdmin) return
    supabase.rpc('admin_get_users').then(({ data, error }) => {
      if (!error) setUsers(data || [])
      setLoadingUsers(false)
    })
  }, [isAdmin])

  // Load selected user's products
  const viewInventory = async (user) => {
    setSelectedUser(user)
    setProducts([])
    setLoadingProducts(true)
    setSearch('')
    const { data, error } = await supabase.rpc('admin_get_user_products', { target_user_id: user.id })
    setProducts(data || [])
    setLoadingProducts(false)
  }

  const filtered = products.filter(p =>
    !search ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = {}
  filtered.forEach(p => {
    const cat = p.category || 'Uncategorized'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  })

  const totalValue = products.reduce((s, p) => s + (p.stock_qty || 0) * (p.avg_cost ?? p.cost ?? 0), 0)
  const totalSellValue = products.reduce((s, p) => s + (p.stock_qty || 0) * (p.sell_price ?? 0), 0)

  if (!isAdmin) return null

  return (
    <div>
      <div className="page-header">
        <button onClick={selectedUser ? () => { setSelectedUser(null); setProducts([]) } : () => navigate(-1)}
          style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1 style={{ fontSize: 17 }}>
          {selectedUser ? `${selectedUser.display_name || selectedUser.username}'s Inventory` : 'Admin — User Inventories'}
        </h1>
        <div style={{ width:36 }} />
      </div>

      <div className="page" style={{ paddingTop:14 }}>

        {/* ── User picker ── */}
        {!selectedUser && <>
          <div style={{ background:'linear-gradient(135deg,#dc2626,#b91c1c)', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
            <p style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:3 }}>👑 Admin — View User Inventories</p>
            <p style={{ color:'#fca5a5', fontSize:12 }}>
              Select any user to view their full product inventory. This is only visible to you.
            </p>
            <p style={{ color:'#fca5a5', fontSize:12, marginTop:4 }}>{users.length} registered users</p>
          </div>

          {loadingUsers && <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading users...</div>}

          {users.map(u => (
            <button key={u.id} onClick={() => viewInventory(u)}
              className="card card-tap"
              style={{ width:'100%', textAlign:'left', padding:'14px 16px', marginBottom:8, display:'flex', alignItems:'center', gap:14, border:'1.5px solid var(--border)' }}>
              {/* Avatar */}
              <div style={{
                width:44, height:44, borderRadius:'50%', flexShrink:0,
                background:'linear-gradient(135deg, var(--blue), #7c3aed)',
                display:'flex', alignItems:'center', justifyContent:'center',
                color:'white', fontWeight:800, fontSize:18,
              }}>
                {(u.display_name || u.username || u.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:15 }}>{u.display_name || u.username || 'No name'}</p>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>{u.email}</p>
                {u.username && <p style={{ fontSize:11, color:'var(--blue)' }}>@{u.username}</p>}
              </div>
              <span style={{ fontSize:18, color:'var(--text-muted)' }}>→</span>
            </button>
          ))}
        </>}

        {/* ── Inventory view ── */}
        {selectedUser && <>

          {/* User info card */}
          <div style={{ background:'var(--blue-light)', border:'1px solid #bfdbfe', borderRadius:14, padding:'14px 16px', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
              <div style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,var(--blue),#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:800, fontSize:16 }}>
                {(selectedUser.display_name || selectedUser.username || '?')[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight:800, fontSize:15, color:'var(--blue-dark)' }}>{selectedUser.display_name || selectedUser.username}</p>
                <p style={{ fontSize:12, color:'var(--blue)' }}>{selectedUser.email}</p>
              </div>
            </div>
            {/* Inventory summary */}
            {products.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[
                  { label:'Products', val: products.length, color:'var(--blue)' },
                  { label:'Cost Value', val: `$${totalValue.toFixed(0)}`, color:'#dc2626' },
                  { label:'Sell Value', val: `$${totalSellValue.toFixed(0)}`, color:'#16a34a' },
                ].map(s => (
                  <div key={s.label} style={{ background:'white', borderRadius:10, padding:'8px', textAlign:'center', border:'1px solid #bfdbfe' }}>
                    <p style={{ fontWeight:800, fontSize:16, color:s.color }}>{s.val}</p>
                    <p style={{ fontSize:10, color:'var(--text-muted)' }}>{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div style={{ position:'relative', marginBottom:12 }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:16, color:'var(--text-muted)' }}>🔍</span>
            <input type="search" placeholder="Search products..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', padding:'10px 14px 10px 40px', border:'1.5px solid var(--border)', borderRadius:24, fontSize:14, background:'var(--gray-light)' }} />
          </div>

          {loadingProducts && <div style={{ textAlign:'center', padding:40, color:'var(--text-muted)' }}>Loading inventory...</div>}

          {!loadingProducts && products.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 20px' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
              <p className="text-muted">This user has no products in their inventory.</p>
            </div>
          )}

          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="section-header">{cat}</p>
              {items.map(p => {
                const effectiveCost = p.avg_cost ?? p.cost ?? 0
                const profit = (p.sell_price ?? 0) - effectiveCost
                const stockVal = (p.stock_qty || 0) * effectiveCost
                return (
                  <div key={p.id} className="card" style={{ marginBottom:8, padding:'11px 13px', display:'flex', alignItems:'center', gap:12 }}>
                    {/* Image */}
                    <div style={{ width:50, height:50, borderRadius:10, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, border:'1px solid var(--border)' }}>
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                        : '📦'}
                    </div>
                    {/* Info */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, fontSize:14 }}>{p.name}</p>
                      {p.brand && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{p.brand}</p>}
                      <div style={{ display:'flex', gap:10, marginTop:3, flexWrap:'wrap' }}>
                        <span style={{ fontSize:11, color:'var(--text-muted)' }}>Cost: ${effectiveCost.toFixed(2)}{p.avg_cost ? ' avg' : ''}</span>
                        <span style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>Sell: ${(p.sell_price??0).toFixed(2)}</span>
                        <span style={{ fontSize:11, color: profit >= 0 ? 'var(--blue)' : 'var(--red)', fontWeight:600 }}>+${profit.toFixed(2)}</span>
                      </div>
                      <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:2 }}>
                        Stock value: ${stockVal.toFixed(0)}
                        {p.source ? ` · ${p.source}` : ''}
                      </p>
                    </div>
                    {/* Stock */}
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <p style={{ fontWeight:800, fontSize:20, color: (p.stock_qty||0) <= 0 ? 'var(--red)' : (p.stock_qty||0) <= 5 ? 'var(--amber)' : 'var(--green)' }}>
                        {p.stock_qty || 0}
                      </p>
                      <p style={{ fontSize:10, color:'var(--text-muted)' }}>{p.unit}s</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </>}
      </div>
    </div>
  )
}
