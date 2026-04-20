import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { printOrderSheet } from '../lib/printOrderSheet'

const NICHE_COLORS = {
  'Beauty Supply': '#ec4899',
  'Gas Stations': '#f59e0b',
  'Convenience Stores': '#8b5cf6',
  'Hair Salons': '#06b6d4',
  'Barbershops': '#10b981',
  'General': '#6366f1',
  'Custom': '#64748b',
}
const NICHE_ICONS = {
  'Beauty Supply': '💄', 'Gas Stations': '⛽', 'Convenience Stores': '🏪',
  'Hair Salons': '✂️', 'Barbershops': '💈', 'General': '📦', 'Custom': '⚙️',
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// ── List view ─────────────────────────────────────────────────────
function PriceListIndex({ onSelect, onCreate }) {
  const { user } = useAuth()
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('price_lists').select('*').eq('user_id', user.id).order('created_at')
      .then(({ data }) => { setLists(data || []); setLoading(false) })
  }, [user])

  return (
    <>
      <div style={{ background:'linear-gradient(135deg,#1e3a5f,#1d4ed8)', borderRadius:14, padding:'14px 16px', marginBottom:18 }}>
        <p style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:3 }}>🏷️ Price Lists</p>
        <p style={{ color:'#bfdbfe', fontSize:12 }}>Create custom price lists for different customer niches. Each list gets its own public landing page.</p>
        <p style={{ color:'#93c5fd', fontSize:12, marginTop:6 }}>{lists.length} price lists created</p>
      </div>
      <button onClick={onCreate} className="btn btn-primary btn-full" style={{ marginBottom:16 }}>＋ Create New Price List</button>
      {loading && <p className="text-muted text-sm" style={{ textAlign:'center', padding:24 }}>Loading...</p>}
      {lists.map(list => (
        <div key={list.id} onClick={() => onSelect(list)} className="card card-tap" style={{ marginBottom:10, padding:'14px 16px', display:'flex', alignItems:'center', gap:14, cursor:'pointer', border:'1.5px solid var(--border)' }}>
          <div style={{ width:44, height:44, borderRadius:12, flexShrink:0, background: NICHE_COLORS[list.niche] || '#6366f1', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
            {NICHE_ICONS[list.niche] || '📋'}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:800, fontSize:15 }}>{list.name}</p>
            <p style={{ fontSize:12, color:'var(--text-muted)' }}>{list.niche || 'General'} · /{list.slug}</p>
          </div>
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <span style={{ fontSize:11, padding:'3px 10px', borderRadius:12, fontWeight:700, background: list.is_public ? '#dcfce7' : '#f3f4f6', color: list.is_public ? '#16a34a' : '#6b7280' }}>
              {list.is_public ? '🌐 Public' : '🔒 Private'}
            </span>
          </div>
          <span style={{ fontSize:18, color:'var(--text-muted)' }}>→</span>
        </div>
      ))}
    </>
  )
}

// ── Create / Edit list form ────────────────────────────────────────
function PriceListForm({ onSave, onCancel, existing }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: existing?.name || '', niche: existing?.niche || 'General', slug: existing?.slug || '', description: existing?.description || '', is_public: existing?.is_public ?? false, banner_color: existing?.banner_color || '#2563eb' })
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm(f => ({ ...f, [k]: val, ...(k === 'name' && !existing ? { slug: slugify(e.target.value) } : {}) }))
  }

  const save = async () => {
    if (!form.name.trim() || !form.slug.trim()) return
    setSaving(true)
    try {
      const payload = { ...form, user_id: user.id, updated_at: new Date().toISOString() }
      if (existing) {
        await supabase.from('price_lists').update(payload).eq('id', existing.id)
      } else {
        await supabase.from('price_lists').insert([payload])
      }
      onSave()
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div>
      <p className="section-header">{existing ? 'Edit Price List' : 'New Price List'}</p>

      <div className="form-group">
        <label className="form-label">List Name *</label>
        <input className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Beauty Supply Stores" />
      </div>
      <div className="form-group">
        <label className="form-label">Niche / Category</label>
        <select className="form-select" value={form.niche} onChange={set('niche')}>
          {Object.keys(NICHE_COLORS).map(n => <option key={n}>{n}</option>)}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">URL Slug *</label>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:13, color:'var(--text-muted)', whiteSpace:'nowrap' }}>kanzsupply.com/list/</span>
          <input className="form-input" value={form.slug} onChange={set('slug')} placeholder="beauty-supply" style={{ flex:1 }} />
        </div>
        <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:4 }}>Lowercase letters, numbers and dashes only</p>
      </div>
      <div className="form-group">
        <label className="form-label">Description (shown on landing page)</label>
        <textarea className="form-input" value={form.description} onChange={set('description')} placeholder="Describe this price list..." rows={2} style={{ resize:'vertical' }} />
      </div>
      <div className="form-group">
        <label className="form-label">Banner Color</label>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['#2563eb','#ec4899','#f59e0b','#8b5cf6','#06b6d4','#10b981','#dc2626'].map(c => (
            <button key={c} onClick={() => setForm(f => ({ ...f, banner_color: c }))} style={{ width:30, height:30, borderRadius:8, background:c, border: form.banner_color === c ? '3px solid var(--text)' : '3px solid transparent', cursor:'pointer' }} />
          ))}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 0', borderTop:'1px solid var(--border)', borderBottom:'1px solid var(--border)', marginBottom:16 }}>
        <input type="checkbox" id="is_public" checked={form.is_public} onChange={set('is_public')} style={{ width:18, height:18, cursor:'pointer' }} />
        <div>
          <label htmlFor="is_public" style={{ fontWeight:700, fontSize:14, cursor:'pointer' }}>Make this list public</label>
          <p style={{ fontSize:11, color:'var(--text-muted)' }}>Anyone with the link can view the landing page</p>
        </div>
      </div>
      <div style={{ display:'flex', gap:10 }}>
        <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving ? 'Saving...' : existing ? 'Save Changes' : 'Create List'}</button>
        <button className="btn btn-ghost" onClick={onCancel} style={{ flexShrink:0, padding:'12px 18px' }}>Cancel</button>
      </div>
    </div>
  )
}

// ── Price list detail: manage products ────────────────────────────
function PriceListDetail({ list, onBack }) {
  const { products } = useProducts()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [editPrice, setEditPrice] = useState({}) // { productId: { price, min, max } }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const loadItems = useCallback(async () => {
    const { data } = await supabase.from('price_list_items')
      .select('*').eq('price_list_id', list.id).eq('is_active', true).order('display_order')
    setItems(data || [])
    setLoading(false)
  }, [list.id])

  useEffect(() => { loadItems() }, [loadItems])

  const isAdded = (productId) => items.find(i => i.product_id === productId)

  const toggleProduct = async (product) => {
    setSaving(product.id)
    try {
      const existing = isAdded(product.id)
      if (existing) {
        await supabase.from('price_list_items').update({ is_active: false }).eq('id', existing.id)
        setItems(prev => prev.filter(i => i.id !== existing.id))
        showToast('✅ Removed')
      } else {
        const { data } = await supabase.from('price_list_items').insert([{
          price_list_id: list.id,
          product_id: product.id,
          custom_price: editPrice[product.id]?.price || product.sell_price,
          custom_price_min: editPrice[product.id]?.min || product.price_min,
          custom_price_max: editPrice[product.id]?.max || product.price_max,
          display_order: items.length,
          is_active: true,
        }]).select().single()
        if (data) setItems(prev => [...prev, data])
        showToast('✅ Added to list')
      }
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setSaving(null) }
  }

  const updatePrice = async (itemId, field, value) => {
    await supabase.from('price_list_items').update({ [field]: parseFloat(value) || null }).eq('id', itemId)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, [field]: parseFloat(value) } : i))
  }

  const addedProducts = items.map(item => ({
    item, product: products.find(p => p.id === item.product_id)
  })).filter(x => x.product)

  const availableProducts = products.filter(p =>
    (!search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())) &&
    !isAdded(p.id)
  )

  return (
    <>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16, padding:'0 16px', background:'var(--surface)', position:'sticky', top:0, zIndex:10, borderBottom:'1px solid var(--border)', paddingTop:12, paddingBottom:12 }}>
        <button onClick={onBack} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>←</button>
        <div style={{ flex:1 }}>
          <p style={{ fontWeight:800, fontSize:16 }}>{list.name}</p>
          <p style={{ fontSize:11, color:'var(--text-muted)' }}>{list.niche} · {items.length} products</p>
        </div>
        <button onClick={() => window.open(`/list/${list.slug}`, '_blank')} style={{ fontSize:12, color:'var(--blue)', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>Preview ↗</button>
        <button onClick={() => {
          // Build product list from this price list, applying custom prices
          const listProducts = addedProducts.map(({ item, product }) => ({
            ...product,
            sell_price: item.custom_price ?? product.sell_price,
            price_min: item.custom_price_min ?? product.price_min,
            price_max: item.custom_price_max ?? product.price_max,
          }))
          printOrderSheet(listProducts, profile, { listName: list.name, listNiche: list.niche })
        }} style={{ fontSize:12, color:'#b8860b', fontWeight:700, background:'none', border:'none', cursor:'pointer' }}>🖨️ Print</button>
        <button onClick={() => setEditing(true)} style={{ fontSize:12, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>Edit ✏️</button>
      </div>

      <div style={{ padding:'0 16px 100px' }}>
        {editing && <div style={{ background:'var(--gray-light)', borderRadius:14, padding:16, marginBottom:16 }}>
          <PriceListForm existing={list} onSave={() => { setEditing(false); window.location.reload() }} onCancel={() => setEditing(false)} />
        </div>}

        {/* Public link */}
        {list.is_public && (
          <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'12px 14px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
            <span>🌐</span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#15803d' }}>Public landing page is live</p>
              <p style={{ fontSize:11, color:'#166534' }}>kanzsupply.com/list/{list.slug}</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText(`https://kanzsupply.com/list/${list.slug}`).then(() => showToast('📋 Copied!'))}
              style={{ fontSize:11, padding:'5px 10px', borderRadius:8, border:'none', background:'#16a34a', color:'white', cursor:'pointer', fontWeight:700 }}>Copy Link</button>
          </div>
        )}

        {/* Products in this list */}
        {addedProducts.length > 0 && <>
          <p className="section-header">Products in This List ({addedProducts.length})</p>
          {addedProducts.map(({ item, product }) => (
            <div key={item.id} className="card" style={{ marginBottom:8, padding:'12px 13px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                  {product.image_url ? <img src={product.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:14 }}>{product.name}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>{product.category}</p>
                </div>
                <button onClick={() => toggleProduct(product)} disabled={saving === product.id}
                  style={{ padding:'5px 12px', borderRadius:16, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:'#fef2f2', color:'#dc2626', flexShrink:0 }}>
                  {saving === product.id ? '...' : '✕'}
                </button>
              </div>
              {/* Price inputs */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                {[['custom_price','Price/unit'],['custom_price_min','Min retail'],['custom_price_max','Max retail']].map(([field, label]) => (
                  <div key={field}>
                    <p style={{ fontSize:10, color:'var(--text-muted)', marginBottom:3 }}>{label}</p>
                    <input type="number" step="0.01" min="0"
                      defaultValue={item[field] || ''}
                      onBlur={e => updatePrice(item.id, field, e.target.value)}
                      style={{ width:'100%', padding:'6px 8px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:13, background:'var(--gray-light)' }}
                      placeholder="$0.00" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>}

        {/* Add products */}
        <p className="section-header" style={{ marginTop:16 }}>Add Products</p>
        <div style={{ position:'relative', marginBottom:12 }}>
          <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'var(--text-muted)' }}>🔍</span>
          <input type="search" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', padding:'10px 14px 10px 38px', border:'1.5px solid var(--border)', borderRadius:24, fontSize:14, background:'var(--gray-light)' }} />
        </div>
        {availableProducts.map(product => (
          <div key={product.id} className="card" style={{ marginBottom:8, padding:'10px 13px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
              {product.image_url ? <img src={product.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontWeight:700, fontSize:14 }}>{product.name}</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>{product.category} · Sell: ${product.sell_price || 0}</p>
            </div>
            <button onClick={() => toggleProduct(product)} disabled={saving === product.id}
              style={{ padding:'6px 14px', borderRadius:18, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:'var(--blue)', color:'white', flexShrink:0 }}>
              {saving === product.id ? '...' : '＋ Add'}
            </button>
          </div>
        ))}
      </div>

      {toast && <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000 }}>{toast}</div>}
    </>
  )
}

// ── Main export ────────────────────────────────────────────────────
export default function PriceListsManagerPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [view, setView] = useState('index') // 'index' | 'create' | 'detail'
  const [selectedList, setSelectedList] = useState(null)

  useEffect(() => {
    if (profile && !profile.is_admin) navigate('/')
  }, [profile, navigate])

  return (
    <div>
      {view === 'index' && (
        <>
          <div className="page-header">
            <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
            <h1 style={{ fontSize:17 }}>Price Lists</h1>
            <div style={{ width:36 }} />
          </div>
          <div className="page" style={{ paddingTop:14 }}>
            <PriceListIndex onSelect={list => { setSelectedList(list); setView('detail') }} onCreate={() => setView('create')} />
          </div>
        </>
      )}
      {view === 'create' && (
        <>
          <div className="page-header">
            <button onClick={() => setView('index')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
            <h1 style={{ fontSize:17 }}>New Price List</h1>
            <div style={{ width:36 }} />
          </div>
          <div className="page" style={{ paddingTop:14 }}>
            <PriceListForm onSave={() => setView('index')} onCancel={() => setView('index')} />
          </div>
        </>
      )}
      {view === 'detail' && selectedList && (
        <PriceListDetail list={selectedList} onBack={() => { setSelectedList(null); setView('index') }} />
      )}
    </div>
  )
}
