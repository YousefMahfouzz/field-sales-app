import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'

const NICHE_ICONS = { beauty: '💄', gas_station: '⛽', convenience: '🏪', grocery: '🛒', pharmacy: '💊', other: '📦' }

export default function PriceListsPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const { products } = useProducts()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('list') // 'list' | 'edit'
  const [editingList, setEditingList] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const loadLists = useCallback(async () => {
    if (!user) return
    const { data } = await supabase.from('price_lists').select('*').eq('user_id', user.id).order('created_at')
    setLists(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { loadLists() }, [loadLists])

  const createList = async (name, niche) => {
    const rand = Math.random().toString(36).slice(2, 7)
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + rand
    const { data, error } = await supabase.from('price_lists').insert([{
      user_id: user.id, name, slug, niche, is_active: true, is_public: true
    }]).select().single()
    if (!error && data) {
      setLists(prev => [...prev, data])
      setEditingList(data)
      setView('edit')
      setShowCreate(false)
    }
  }

  const deleteList = async (id) => {
    if (!window.confirm('Delete this price list?')) return
    await supabase.from('price_lists').delete().eq('id', id)
    setLists(prev => prev.filter(l => l.id !== id))
  }

  const shareList = (list) => {
    const url = `${window.location.origin}/pl/${profile?.username || user?.id}/${list.slug}`
    if (navigator.share) navigator.share({ title: list.name + ' — Kanz Supply', url })
    else { navigator.clipboard.writeText(url); alert('Link copied!\n\n' + url) }
  }

  if (view === 'edit' && editingList) {
    return <PriceListEditor list={editingList} products={products} onBack={() => { setView('list'); setEditingList(null); loadLists() }} onShare={shareList} />
  }

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1>My Price Lists</h1>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ New</button>
      </div>

      <div className="page" style={{ paddingTop:12 }}>
        <div style={{ background:'linear-gradient(135deg,#0f172a,#1e293b)', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
          <p style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:3 }}>📋 Custom Price Lists</p>
          <p style={{ color:'#94a3b8', fontSize:12, lineHeight:1.6 }}>
            Create separate price lists for different store types — beauty supply, gas stations, etc. Each list has its own link and custom prices.
          </p>
        </div>

        {loading && <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Loading...</div>}

        {!loading && lists.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 20px' }}>
            <div style={{ fontSize:44, marginBottom:14 }}>📋</div>
            <p style={{ fontWeight:700, fontSize:15, marginBottom:6 }}>No price lists yet</p>
            <p className="text-sm text-muted" style={{ marginBottom:20 }}>Create your first list for a specific store type</p>
            <button onClick={() => setShowCreate(true)} className="btn btn-primary">＋ Create First List</button>
          </div>
        )}

        {lists.map(list => (
          <div key={list.id} className="card" style={{ marginBottom:10, padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <div style={{ fontSize:28, flexShrink:0 }}>{NICHE_ICONS[list.niche] || '📋'}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:800, fontSize:16 }}>{list.name}</p>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {list.niche?.charAt(0).toUpperCase() + list.niche?.slice(1).replace('_',' ')} · {list.is_active ? '🟢 Active' : '⚫ Hidden'}
                </p>
                <p style={{ fontSize:11, color:'var(--blue)', marginTop:4, wordBreak:'break-all' }}>
                  /pl/{profile?.username}/{list.slug}
                </p>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
              <button onClick={() => { setEditingList(list); setView('edit') }}
                className="btn btn-primary btn-sm" style={{ flex:1 }}>✏️ Edit Products</button>
              <button onClick={() => shareList(list)} className="btn btn-ghost btn-sm">🔗 Share</button>
              <button onClick={() => window.open(`/pl/${profile?.username || user?.id}/${list.slug}`, '_blank')} className="btn btn-ghost btn-sm">👁️ View</button>
              <button onClick={() => deleteList(list.id)} className="btn btn-ghost btn-sm" style={{ color:'var(--red)' }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Create modal */}
      {showCreate && <CreateListModal onCreate={createList} onClose={() => setShowCreate(false)} />}
    </div>
  )
}

// ── Create List Modal ─────────────────────────────────────────────
function CreateListModal({ onCreate, onClose }) {
  const [name, setName] = useState('')
  const [niche, setNiche] = useState('convenience')
  const NICHES = [
    { value:'beauty', label:'💄 Beauty Supply' },
    { value:'gas_station', label:'⛽ Gas Stations' },
    { value:'convenience', label:'🏪 Convenience Stores' },
    { value:'grocery', label:'🛒 Grocery / Corner Stores' },
    { value:'pharmacy', label:'💊 Pharmacy / Drug Stores' },
    { value:'other', label:'📦 Other' },
  ]
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <h2 style={{ marginBottom:16 }}>Create Price List</h2>
        <div className="form-group">
          <label className="form-label">List Name *</label>
          <input className="form-input" value={name} onChange={e => setName(e.target.value)}
            placeholder="e.g. Beauty Supply Shops, Gas Stations" autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Store Type</label>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {NICHES.map(n => (
              <button key={n.value} type="button" onClick={() => setNiche(n.value)} style={{
                padding:'10px 12px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer',
                border:`1.5px solid ${niche===n.value ? 'var(--blue)' : 'var(--border)'}`,
                background: niche===n.value ? 'var(--blue-light)' : 'white',
                color: niche===n.value ? 'var(--blue)' : 'var(--text)',
                textAlign:'left',
              }}>{n.label}</button>
            ))}
          </div>
        </div>
        <button onClick={() => name.trim() && onCreate(name.trim(), niche)}
          disabled={!name.trim()} className="btn btn-primary btn-full" style={{ marginTop:8 }}>
          Create List →
        </button>
      </div>
    </div>
  )
}

// ── Price List Editor ─────────────────────────────────────────────
function PriceListEditor({ list, products, onBack, onShare }) {
  const { user } = useAuth()
  const [items, setItems] = useState([]) // { product_id, custom_price, display_order }
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState('')
  const [tab, setTab] = useState('pick') // 'pick' | 'prices'

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  useEffect(() => {
    supabase.from('price_list_items').select('*').eq('price_list_id', list.id).order('display_order')
      .then(({ data }) => { setItems(data || []); setLoading(false) })
  }, [list.id])

  const isAdded = (productId) => items.find(i => i.product_id === productId)

  const toggleProduct = async (product) => {
    setSaving(product.id)
    try {
      const existing = isAdded(product.id)
      if (existing) {
        await supabase.from('price_list_items').delete().eq('id', existing.id)
        setItems(prev => prev.filter(i => i.product_id !== product.id))
      } else {
        const { data } = await supabase.from('price_list_items').insert([{
          price_list_id: list.id,
          product_id: product.id,
          custom_price: product.sell_price,
          display_order: items.length,
        }]).select().single()
        if (data) setItems(prev => [...prev, data])
      }
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setSaving(null) }
  }

  const updatePrice = async (itemId, price) => {
    const parsed = parseFloat(price) || 0
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, custom_price: parsed } : i))
    await supabase.from('price_list_items').update({ custom_price: parsed }).eq('id', itemId)
  }

  const filtered = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = {}
  filtered.forEach(p => {
    const cat = p.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  })

  const priceListUrl = `${window.location.origin}/pl/${user?.id}/${list.slug}` // permanent — slug never changes

  return (
    <div>
      <div className="page-header">
        <button onClick={onBack} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1 style={{ fontSize:15, flex:1, textAlign:'center' }}>{list.name}</h1>
        <button onClick={() => onShare(list)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--blue)', fontWeight:600 }}>
          🔗 Share
        </button>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', background:'var(--gray-light)', borderRadius:10, padding:4, margin:'8px 16px' }}>
        {[['pick','🛒 Pick Products'],['prices','💰 Set Prices']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: tab===t ? 'white' : 'transparent',
            color: tab===t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <div className="page" style={{ paddingTop:10 }}>
        {/* Share link */}
        <div style={{ background:'var(--blue-light)', border:'1px solid #bfdbfe', borderRadius:10, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontSize:11, color:'var(--blue)', fontWeight:700, marginBottom:2 }}>Price list link:</p>
            <p style={{ fontSize:12, color:'var(--blue-dark)', wordBreak:'break-all' }}>{priceListUrl}</p>
          </div>
          <button onClick={() => onShare(list)} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--blue)', background:'white', color:'var(--blue)', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>
            🔗
          </button>
        </div>

        {tab === 'pick' && <>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:10 }}>
            {items.length} products selected
          </p>

          <div style={{ position:'relative', marginBottom:12 }}>
            <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}>🔍</span>
            <input type="search" placeholder="Search products..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width:'100%', padding:'10px 14px 10px 38px', border:'1.5px solid var(--border)', borderRadius:24, fontSize:14, background:'var(--gray-light)' }} />
          </div>

          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <p className="section-header">{cat}</p>
              {catItems.map(p => {
                const added = isAdded(p.id)
                const isPending = saving === p.id
                return (
                  <div key={p.id} className="card" style={{ marginBottom:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:12,
                    background: added ? '#f0fdf4' : 'white',
                    border: `1.5px solid ${added ? '#86efac' : 'var(--border)'}`,
                  }}>
                    <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                      {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, fontSize:13 }}>{p.name}</p>
                      {p.brand && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{p.brand}</p>}
                    </div>
                    <button onClick={() => toggleProduct(p)} disabled={isPending} style={{
                      padding:'6px 12px', borderRadius:16, border:'none', cursor:'pointer',
                      fontSize:12, fontWeight:700, flexShrink:0,
                      background: isPending ? '#d1d5db' : added ? '#16a34a' : 'var(--blue)',
                      color:'white',
                    }}>
                      {isPending ? '...' : added ? '✅' : '＋ Add'}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </>}

        {tab === 'prices' && <>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:12 }}>
            Set custom prices for this niche. These override your default prices on this list.
          </p>

          {loading && <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Loading...</div>}

          {!loading && items.length === 0 && (
            <div style={{ textAlign:'center', padding:40 }}>
              <p className="text-muted">No products added yet. Go to "Pick Products" to add some.</p>
            </div>
          )}

          {items.map(item => {
            const product = products.find(p => p.id === item.product_id)
            if (!product) return null
            return (
              <div key={item.id} className="card" style={{ marginBottom:8, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                  {product.image_url ? <img src={product.image_url} alt={product.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:13 }}>{product.name}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>Default: ${product.sell_price?.toFixed(2)}</p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <span style={{ fontWeight:700, color:'var(--text-muted)', fontSize:14 }}>$</span>
                  <input
                    type="number" min="0" step="0.01"
                    value={item.custom_price ?? product.sell_price}
                    onChange={e => updatePrice(item.id, e.target.value)}
                    style={{ width:80, padding:'7px 10px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:15, fontWeight:700, textAlign:'right' }}
                  />
                </div>
              </div>
            )
          })}
        </>}
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
