import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'

export default function AdminLandingPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { products } = useProducts()
  const isAdmin = profile?.is_admin === true

  const [featured, setFeatured] = useState([]) // currently featured product IDs
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => { if (profile && !isAdmin) navigate('/') }, [profile, isAdmin, navigate])

  const loadFeatured = useCallback(async () => {
    const { data } = await supabase.from('landing_featured').select('product_id, sort_order')
    setFeatured((data || []).map(r => r.product_id))
    setLoading(false)
  }, [])

  useEffect(() => { loadFeatured() }, [loadFeatured])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const toggle = async (productId) => {
    setSaving(productId)
    try {
      if (featured.includes(productId)) {
        await supabase.from('landing_featured').delete().eq('product_id', productId)
        setFeatured(prev => prev.filter(id => id !== productId))
        showToast('Removed from landing page')
      } else {
        await supabase.from('landing_featured').insert([{
          product_id: productId,
          admin_user_id: profile.id,
          sort_order: featured.length,
        }])
        setFeatured(prev => [...prev, productId])
        showToast('✅ Added to landing page')
      }
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setSaving(null) }
  }

  const filtered = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = {}
  filtered.forEach(p => {
    const cat = p.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  })

  if (!isAdmin) return null

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1 style={{ fontSize:16 }}>Landing Page Products</h1>
        <button onClick={() => window.open('/', '_blank')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'var(--blue)', fontWeight:600 }}>
          👁️ Preview
        </button>
      </div>

      <div className="page" style={{ paddingTop:12 }}>
        {/* Info card */}
        <div style={{ background:'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius:14, padding:'14px 16px', marginBottom:16 }}>
          <p style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:3 }}>🌐 Landing Page Showcase</p>
          <p style={{ color:'#c7d2fe', fontSize:12, lineHeight:1.6 }}>
            Pick products to show on <strong style={{color:'white'}}>kanzsupply.com</strong> for visitors. Shows name, photo & description only — no prices.
          </p>
          <p style={{ color:'#a5b4fc', fontSize:12, marginTop:8 }}>
            {featured.length} product{featured.length !== 1 ? 's' : ''} featured
          </p>
        </div>

        {/* Live preview link */}
        <button onClick={() => window.open('/', '_blank')} style={{
          width:'100%', padding:'11px', borderRadius:10, marginBottom:14,
          border:'1.5px dashed rgba(99,102,241,0.4)', background:'rgba(99,102,241,0.06)',
          color:'#6366f1', fontWeight:600, fontSize:13, cursor:'pointer',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
        }}>
          👁️ Open kanzsupply.com to preview → 
        </button>

        {/* Search */}
        <div style={{ position:'relative', marginBottom:12 }}>
          <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)' }}>🔍</span>
          <input type="search" placeholder="Search your products..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', padding:'10px 14px 10px 38px', border:'1.5px solid var(--border)', borderRadius:24, fontSize:14, background:'var(--gray-light)' }} />
        </div>

        {loading && <div style={{ textAlign:'center', padding:32, color:'var(--text-muted)' }}>Loading...</div>}

        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat}>
            <p className="section-header">{cat}</p>
            {items.map(p => {
              const isFeatured = featured.includes(p.id)
              const isPending = saving === p.id
              return (
                <div key={p.id} className="card" style={{ marginBottom:8, padding:'10px 12px', display:'flex', alignItems:'center', gap:12,
                  background: isFeatured ? '#f0fdf4' : 'white',
                  border: `1.5px solid ${isFeatured ? '#86efac' : 'var(--border)'}`,
                }}>
                  <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontWeight:700, fontSize:14, color: isFeatured ? '#15803d' : 'var(--text)' }}>{p.name}</p>
                    {p.brand && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{p.brand}</p>}
                    {p.description && <p style={{ fontSize:11, color:'var(--text-muted)', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{p.description}</p>}
                  </div>
                  <button onClick={() => toggle(p.id)} disabled={isPending} style={{
                    padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer',
                    fontSize:12, fontWeight:700, flexShrink:0,
                    background: isPending ? '#d1d5db' : isFeatured ? '#16a34a' : '#6366f1',
                    color:'white',
                  }}>
                    {isPending ? '...' : isFeatured ? '✅ Featured' : '＋ Feature'}
                  </button>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
