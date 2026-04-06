import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'

export default function AdminStorePage() {
  const { profile } = useAuth()
  const { products } = useProducts()
  const navigate = useNavigate()
  const isAdmin = profile?.is_admin === true
  const [tab, setTab] = useState('homepage') // 'homepage' | 'niches'
  const [featured, setFeatured] = useState([])
  const [niches, setNiches] = useState([])
  const [selectedNiche, setSelectedNiche] = useState(null)
  const [nicheItems, setNicheItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState('')
  const [showNewNiche, setShowNewNiche] = useState(false)
  const [newNiche, setNewNiche] = useState({ name: '', slug: '', description: '', hero_title: '', hero_subtitle: '', theme_color: '#7c3aed' })

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const loadData = useCallback(async () => {
    const [{ data: f }, { data: n }] = await Promise.all([
      supabase.from('homepage_featured').select('product_id, sort_order').order('sort_order'),
      supabase.from('niche_lists').select('*').order('sort_order'),
    ])
    setFeatured((f || []).map(x => x.product_id))
    setNiches(n || [])
    setLoading(false)
  }, [])

  useEffect(() => { if (isAdmin) loadData() }, [isAdmin, loadData])

  const loadNicheItems = useCallback(async (nicheId) => {
    const { data } = await supabase.from('niche_list_items')
      .select('*').eq('niche_list_id', nicheId)
    setNicheItems((data || []).map(x => ({ ...x, product_id: x.product_id })))
  }, [])

  useEffect(() => { if (selectedNiche) loadNicheItems(selectedNiche.id) }, [selectedNiche, loadNicheItems])

  // Toggle product on homepage
  const toggleFeatured = async (productId) => {
    setSaving(productId)
    try {
      if (featured.includes(productId)) {
        await supabase.from('homepage_featured').delete().eq('product_id', productId)
        setFeatured(p => p.filter(id => id !== productId))
        showToast('Removed from homepage')
      } else {
        await supabase.from('homepage_featured').insert([{ product_id: productId, sort_order: featured.length }])
        setFeatured(p => [...p, productId])
        showToast('✅ Added to homepage!')
      }
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setSaving(null) }
  }

  // Toggle product in niche list
  const toggleNicheItem = async (productId) => {
    if (!selectedNiche) return
    setSaving(productId)
    try {
      const existing = nicheItems.find(i => i.product_id === productId)
      if (existing) {
        if (existing.is_active) {
          await supabase.from('niche_list_items').update({ is_active: false }).eq('id', existing.id)
          setNicheItems(p => p.map(i => i.id === existing.id ? {...i, is_active: false} : i))
          showToast('Hidden from list')
        } else {
          await supabase.from('niche_list_items').update({ is_active: true }).eq('id', existing.id)
          setNicheItems(p => p.map(i => i.id === existing.id ? {...i, is_active: true} : i))
          showToast('✅ Re-added!')
        }
      } else {
        const { data } = await supabase.from('niche_list_items').insert([{
          niche_list_id: selectedNiche.id, product_id: productId, is_active: true, sort_order: nicheItems.length
        }]).select().single()
        setNicheItems(p => [...p, data])
        showToast('✅ Added to list!')
      }
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setSaving(null) }
  }

  // Update custom price for niche item
  const updatePrice = async (itemId, price) => {
    const val = price === '' ? null : parseFloat(price)
    await supabase.from('niche_list_items').update({ custom_price: val }).eq('id', itemId)
    setNicheItems(p => p.map(i => i.id === itemId ? {...i, custom_price: val} : i))
  }

  // Create new niche
  const createNiche = async () => {
    if (!newNiche.name || !newNiche.slug) return
    try {
      const { data } = await supabase.from('niche_lists').insert([{ ...newNiche, admin_user_id: profile.id }]).select().single()
      setNiches(p => [...p, data])
      setShowNewNiche(false)
      setNewNiche({ name: '', slug: '', description: '', hero_title: '', hero_subtitle: '', theme_color: '#7c3aed' })
      showToast('✅ Price list created!')
    } catch (e) { showToast('❌ ' + e.message) }
  }

  if (!isAdmin) return null

  // Group products by category
  const grouped = {}
  products.forEach(p => {
    const cat = p.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  })

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1 style={{ fontSize:17 }}>Store Manager</h1>
        <button onClick={() => window.open('/', '_blank')} style={{ background:'none', border:'none', fontSize:13, color:'var(--blue)', cursor:'pointer', fontWeight:600 }}>👁️ View Site</button>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', background:'var(--gray-light)', borderRadius:10, padding:4, margin:'0 16px 14px' }}>
        {[['homepage','🏠 Homepage'],['niches','🏪 Price Lists']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'8px 0', borderRadius:7, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background: tab===t ? 'white' : 'transparent',
            color: tab===t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab===t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <div className="page" style={{ paddingTop:0 }}>

        {/* ── HOMEPAGE TAB ── */}
        {tab === 'homepage' && <>
          <div style={{ background:'linear-gradient(135deg,#0a0a0a,#1a1a2e)', borderRadius:14, padding:'16px', marginBottom:16, border:'1px solid rgba(255,255,255,0.08)' }}>
            <p style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:4 }}>🏠 Homepage Product Showcase</p>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginBottom:12 }}>
              Select which products appear on the public homepage. No pricing shown — just name, photo, description.
            </p>
            <div style={{ display:'flex', gap:12 }}>
              <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 14px', textAlign:'center' }}>
                <p style={{ color:'white', fontWeight:800, fontSize:18 }}>{featured.length}</p>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>Featured</p>
              </div>
              <div style={{ background:'rgba(255,255,255,0.08)', borderRadius:8, padding:'8px 14px', textAlign:'center' }}>
                <p style={{ color:'white', fontWeight:800, fontSize:18 }}>{products.length}</p>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11 }}>Total Products</p>
              </div>
            </div>
          </div>

          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="section-header">{cat}</p>
              {items.map(p => {
                const isFeatured = featured.includes(p.id)
                const isPending = saving === p.id
                return (
                  <div key={p.id} className="card" style={{ marginBottom:8, padding:'10px 13px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, border:'1px solid var(--border)' }}>
                      {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, fontSize:14 }}>{p.name}</p>
                      {p.brand && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{p.brand}</p>}
                    </div>
                    <button onClick={() => toggleFeatured(p.id)} disabled={isPending}
                      style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0,
                        background: isFeatured ? '#dcfce7' : 'var(--gray-light)',
                        color: isFeatured ? '#16a34a' : 'var(--text-muted)' }}>
                      {isPending ? '...' : isFeatured ? '✅ Featured' : '＋ Feature'}
                    </button>
                  </div>
                )
              })}
            </div>
          ))}
        </>}

        {/* ── NICHE LISTS TAB ── */}
        {tab === 'niches' && <>
          {!selectedNiche ? <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <p className="section-header" style={{ margin:0 }}>Your Price Lists</p>
              <button onClick={() => setShowNewNiche(true)} className="btn btn-primary btn-sm">+ New</button>
            </div>

            {niches.map(n => (
              <div key={n.id} className="card card-tap" onClick={() => setSelectedNiche(n)}
                style={{ marginBottom:10, padding:'14px 16px', display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:n.theme_color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                  {n.slug.includes('beauty') ? '💄' : n.slug.includes('gas') ? '⛽' : '🏪'}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:15 }}>{n.name}</p>
                  <p style={{ fontSize:12, color:'var(--text-muted)' }}>kanzsupply.com/store/{n.slug}</p>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <button onClick={e => { e.stopPropagation(); window.open(`/store/${n.slug}`, '_blank') }}
                    style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', fontSize:12, cursor:'pointer', color:'var(--blue)', fontWeight:600 }}>
                    👁️ View
                  </button>
                  <span style={{ fontSize:18, color:'var(--text-muted)' }}>→</span>
                </div>
              </div>
            ))}

            {niches.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 20px' }}>
                <div style={{ fontSize:40, marginBottom:12 }}>🏪</div>
                <p className="text-muted">No price lists yet. Create one for each customer type.</p>
              </div>
            )}
          </> : <>
            {/* Niche product manager */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <button onClick={() => setSelectedNiche(null)} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer' }}>←</button>
              <div style={{ flex:1 }}>
                <p style={{ fontWeight:800, fontSize:16 }}>{selectedNiche.name}</p>
                <p style={{ fontSize:12, color:'var(--text-muted)' }}>/store/{selectedNiche.slug}</p>
              </div>
              <button onClick={() => window.open(`/store/${selectedNiche.slug}`, '_blank')}
                style={{ background:'none', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer', color:'var(--blue)', fontWeight:600 }}>
                👁️ Preview
              </button>
            </div>

            <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:14 }}>
              Toggle products, then set a custom price for this list. Leave price empty to use your default sell price.
            </p>

            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat}>
                <p className="section-header">{cat}</p>
                {items.map(p => {
                  const existing = nicheItems.find(i => i.product_id === p.id)
                  const isActive = existing?.is_active === true
                  const isPending = saving === p.id
                  return (
                    <div key={p.id} className="card" style={{ marginBottom:8, padding:'10px 13px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom: isActive ? 10 : 0 }}>
                        <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                          {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ fontWeight:700, fontSize:14 }}>{p.name}</p>
                          <p style={{ fontSize:11, color:'var(--text-muted)' }}>Default: ${p.sell_price?.toFixed(2)}</p>
                        </div>
                        <button onClick={() => toggleNicheItem(p.id)} disabled={isPending}
                          style={{ padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0,
                            background: isActive ? '#dcfce7' : 'var(--gray-light)',
                            color: isActive ? '#16a34a' : 'var(--text-muted)' }}>
                          {isPending ? '...' : isActive ? '✅ In List' : '＋ Add'}
                        </button>
                      </div>
                      {isActive && (
                        <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:52 }}>
                          <span style={{ fontSize:12, color:'var(--text-muted)' }}>Price for this list:</span>
                          <div style={{ position:'relative', flex:1 }}>
                            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', fontSize:13, color:'var(--text-muted)', fontWeight:700 }}>$</span>
                            <input type="number" step="0.01" min="0"
                              defaultValue={existing?.custom_price ?? ''}
                              onBlur={e => updatePrice(existing.id, e.target.value)}
                              placeholder={p.sell_price?.toFixed(2)}
                              style={{ width:'100%', padding:'6px 10px 6px 22px', borderRadius:8, border:'1.5px solid var(--border)', fontSize:14, background:'var(--gray-light)', boxSizing:'border-box' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </>}
        </>}
      </div>

      {/* New niche modal */}
      {showNewNiche && (
        <div className="modal-overlay" onClick={() => setShowNewNiche(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom:16 }}>New Price List</h2>
            {[
              ['name','List Name *','e.g. Beauty Supply Stores'],
              ['slug','URL Slug *','e.g. beauty-supply (no spaces)'],
              ['description','Description','What type of stores is this for?'],
              ['hero_title','Page Title','e.g. For Beauty Supply Stores'],
              ['hero_subtitle','Page Subtitle','Subheadline for the landing page'],
            ].map(([field, label, placeholder]) => (
              <div key={field} className="form-group">
                <label className="form-label">{label}</label>
                <input className="form-input" value={newNiche[field]}
                  onChange={e => setNewNiche(p => ({...p, [field]: field === 'slug' ? e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'') : e.target.value}))}
                  placeholder={placeholder} />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Theme Color</label>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                {['#7c3aed','#2563eb','#f59e0b','#16a34a','#dc2626','#ec4899','#0891b2'].map(c => (
                  <button key={c} onClick={() => setNewNiche(p => ({...p, theme_color: c}))}
                    style={{ width:32, height:32, borderRadius:'50%', background:c, border: newNiche.theme_color === c ? '3px solid white' : '3px solid transparent', cursor:'pointer' }} />
                ))}
              </div>
            </div>
            <button className="btn btn-primary btn-full" onClick={createNiche} disabled={!newNiche.name || !newNiche.slug}>
              Create Price List
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
