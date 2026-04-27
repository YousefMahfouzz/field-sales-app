import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'

export default function AdminHomepageManager() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const { products } = useProducts()
  const [featured, setFeatured] = useState([]) // {id, product_id, display_order}
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')

  // ── Rewards / Tier gifts ──
  // Each: { threshold (number), value (approx $ value), options: [{ product_id, name }, ...] (1 or 2 products customer can choose from) }
  // Legacy support: { threshold, name, description, image_url }
  const [rewards, setRewards] = useState([])
  const [customLists, setCustomLists] = useState([]) // available price_lists for picking
  const [activeListId, setActiveListId] = useState('main') // 'main' or list.id
  const [allRewardsByScope, setAllRewardsByScope] = useState({}) // { 'main': [...], '<listId>': [...] }
  const [savingRewards, setSavingRewards] = useState(false)

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  // Load all rewards (main + per-list) and custom price lists
  useEffect(() => {
    const load = async () => {
      // 1. All app_settings rows starting with 'rewards'
      const { data: allSettings } = await supabase.from('app_settings').select('key, value')
      const scopeMap = {}
      ;(allSettings || []).forEach(s => {
        if (s.key === 'rewards') {
          try { scopeMap['main'] = JSON.parse(s.value) || [] } catch { scopeMap['main'] = [] }
        } else if (s.key.startsWith('rewards_list_')) {
          const id = s.key.substring('rewards_list_'.length)
          try { scopeMap[id] = JSON.parse(s.value) || [] } catch { scopeMap[id] = [] }
        }
      })
      setAllRewardsByScope(scopeMap)
      setRewards(scopeMap['main'] || [])

      // 2. Custom price lists for this user
      if (profile?.id) {
        const { data: lists } = await supabase
          .from('price_lists').select('id, name, niche')
          .eq('user_id', profile.id).eq('is_active', true)
          .order('name')
        setCustomLists(lists || [])
      }
    }
    load()
  }, [profile?.id])

  // Switch active scope (main pricelist or specific custom list)
  const switchScope = (scopeId) => {
    setActiveListId(scopeId)
    setRewards(allRewardsByScope[scopeId] || [])
  }

  const saveRewards = async (newRewards) => {
    setSavingRewards(true)
    const key = activeListId === 'main' ? 'rewards' : `rewards_list_${activeListId}`
    const { error } = await supabase.from('app_settings').upsert(
      { key, value: JSON.stringify(newRewards) },
      { onConflict: 'key' }
    )
    setSavingRewards(false)
    if (error) { showToast('❌ ' + error.message); return false }
    setRewards(newRewards)
    setAllRewardsByScope(p => ({ ...p, [activeListId]: newRewards }))
    showToast('✅ Rewards saved')
    return true
  }

  const addReward = () => {
    const newRewards = [...rewards, { threshold: 500, value: 0, options: [] }]
    setRewards(newRewards)
  }
  const updateReward = (idx, field, value) => {
    const newRewards = [...rewards]
    newRewards[idx] = { ...newRewards[idx], [field]: value }
    setRewards(newRewards)
  }
  // Add or change a product option in a reward tier
  const setRewardOption = (rewardIdx, optionIdx, productId) => {
    const newRewards = [...rewards]
    const product = products.find(p => p.id === productId)
    if (!product) return
    const options = [...(newRewards[rewardIdx].options || [])]
    options[optionIdx] = { product_id: product.id, name: product.name, image_url: product.image_url || null }
    newRewards[rewardIdx] = { ...newRewards[rewardIdx], options }
    setRewards(newRewards)
  }
  const removeRewardOption = (rewardIdx, optionIdx) => {
    const newRewards = [...rewards]
    const options = (newRewards[rewardIdx].options || []).filter((_, i) => i !== optionIdx)
    newRewards[rewardIdx] = { ...newRewards[rewardIdx], options }
    setRewards(newRewards)
  }
  const removeReward = async (idx) => {
    if (!window.confirm('Remove this reward tier?')) return
    const newRewards = rewards.filter((_, i) => i !== idx)
    await saveRewards(newRewards)
  }

  const loadFeatured = useCallback(async () => {
    const { data } = await supabase
      .from('homepage_featured')
      .select('id, product_id, sort_order')
      .eq('is_active', true)
      .order('sort_order')
    setFeatured(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (profile && !profile.is_admin) navigate('/')
    loadFeatured()
  }, [profile, navigate, loadFeatured])

  const isFeatured = (productId) => featured.find(f => f.product_id === productId)

  const toggle = async (product) => {
    setSaving(product.id)
    try {
      const existing = isFeatured(product.id)
      if (existing) {
        await supabase.from('homepage_featured').update({ is_active: false }).eq('id', existing.id)
        setFeatured(prev => prev.filter(f => f.id !== existing.id))
        showToast('✅ Removed from homepage')
      } else {
        const maxOrder = featured.length > 0 ? Math.max(...featured.map(f => f.sort_order || 0)) + 1 : 0
        const { data } = await supabase.from('homepage_featured').insert([{
          product_id: product.id,
          admin_user_id: profile.id,
          sort_order: maxOrder,
          is_active: true,
        }]).select('id, product_id, sort_order').single()
        if (data) setFeatured(prev => [...prev, data])
        showToast('✅ Added to homepage')
      }
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setSaving(null) }
  }

  const moveUp = async (productId) => {
    const idx = featured.findIndex(f => f.product_id === productId)
    if (idx <= 0) return
    const newFeatured = [...featured]
    ;[newFeatured[idx - 1], newFeatured[idx]] = [newFeatured[idx], newFeatured[idx - 1]]
    setFeatured(newFeatured)
    await Promise.all(newFeatured.map((f, i) =>
      supabase.from('homepage_featured').update({ sort_order: i }).eq('id', f.id)
    ))
  }

  const moveDown = async (productId) => {
    const idx = featured.findIndex(f => f.product_id === productId)
    if (idx >= featured.length - 1) return
    const newFeatured = [...featured]
    ;[newFeatured[idx], newFeatured[idx + 1]] = [newFeatured[idx + 1], newFeatured[idx]]
    setFeatured(newFeatured)
    await Promise.all(newFeatured.map((f, i) =>
      supabase.from('homepage_featured').update({ sort_order: i }).eq('id', f.id)
    ))
  }

  const filteredProducts = products.filter(p =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.brand?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  )

  const featuredProducts = featured
    .map(f => ({ ...f, product: products.find(p => p.id === f.product_id) }))
    .filter(f => f.product)

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1 style={{ fontSize:17 }}>Homepage Manager</h1>
        <button onClick={() => window.open('/', '_blank')} style={{ background:'none', border:'none', fontSize:13, color:'var(--blue)', cursor:'pointer', fontWeight:600 }}>Preview ↗</button>
      </div>
      <div className="page" style={{ paddingTop:14 }}>

        {/* Current featured */}
        <div style={{ background:'linear-gradient(135deg,#1e1b4b,#312e81)', borderRadius:14, padding:'14px 16px', marginBottom:18 }}>
          <p style={{ color:'white', fontWeight:800, fontSize:15, marginBottom:3 }}>🌐 Homepage Display</p>
          <p style={{ color:'#c7d2fe', fontSize:12 }}>These products appear on kanzsupply.com — visible to everyone. Drag to reorder.</p>
          <p style={{ color:'#a5b4fc', fontSize:12, marginTop:6 }}>{featured.length} products featured</p>
        </div>

        {featuredProducts.length > 0 && (
          <div style={{ marginBottom:20 }}>
            <p className="section-header">Currently Featured (in order)</p>
            {featuredProducts.map((f, idx) => (
              <div key={f.id} className="card" style={{ marginBottom:8, padding:'10px 13px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:2, flexShrink:0 }}>
                  <button onClick={() => moveUp(f.product_id)} disabled={idx === 0} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, opacity: idx===0 ? 0.2 : 1, padding:'2px 4px' }}>▲</button>
                  <button onClick={() => moveDown(f.product_id)} disabled={idx === featuredProducts.length-1} style={{ background:'none', border:'none', cursor:'pointer', fontSize:14, opacity: idx===featuredProducts.length-1 ? 0.2 : 1, padding:'2px 4px' }}>▼</button>
                </div>
                <span style={{ width:22, height:22, borderRadius:'50%', background:'var(--blue)', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{idx+1}</span>
                <div style={{ width:40, height:40, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                  {f.product.image_url ? <img src={f.product.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ fontWeight:700, fontSize:14 }}>{f.product.name}</p>
                  {f.product.brand && <p style={{ fontSize:11, color:'var(--text-muted)' }}>{f.product.brand}</p>}
                </div>
                <button onClick={() => toggle(f.product)} disabled={saving === f.product.id}
                  style={{ padding:'5px 12px', borderRadius:16, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:'#fef2f2', color:'#dc2626', flexShrink:0 }}>
                  {saving === f.product.id ? '...' : '✕ Remove'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── REWARDS / TIER GIFTS ── */}
        <div style={{ background:'linear-gradient(135deg,#0a0a0a,#1a1500)', borderRadius:14, padding:'14px 16px', marginBottom:14, border:'1px solid rgba(212,168,67,0.3)' }}>
          <p style={{ color:'#f0d078', fontWeight:800, fontSize:15, marginBottom:3 }}>🎁 Spend Rewards</p>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:12 }}>Customers see "$X away from getting Y" on each price list as they fill their cart. Pick which products you're willing to gift — if you add 2 options, the customer chooses which one they want.</p>
        </div>

        {/* Scope tabs: Main pricelist + each custom list */}
        <div style={{ display:'flex', gap:6, marginBottom:14, overflowX:'auto', scrollbarWidth:'none', paddingBottom:4 }}>
          {[{ id:'main', label:'Main Pricelist', sub:'/u/<user>/pricelist' }, ...customLists.map(l => ({ id:l.id, label:l.name, sub:`/list/${l.id.slice(0,8)}…` }))].map(tab => {
            const isActive = activeListId === tab.id
            const tierCount = (allRewardsByScope[tab.id] || []).length
            return (
              <button key={tab.id} onClick={() => switchScope(tab.id)} style={{
                padding:'8px 14px', borderRadius:10, fontSize:12, fontWeight:700, cursor:'pointer',
                border: `1.5px solid ${isActive ? '#b8860b' : 'var(--border)'}`,
                background: isActive ? 'linear-gradient(135deg,#fef3c7,#fde68a)' : 'white',
                color: isActive ? '#92400e' : 'var(--text-muted)',
                whiteSpace:'nowrap', flexShrink:0, position:'relative',
              }}>
                {tab.label}
                {tierCount > 0 && (
                  <span style={{
                    marginLeft:6, padding:'1px 6px', borderRadius:8, fontSize:10,
                    background: isActive ? '#92400e' : '#e5e7eb', color: isActive ? '#fef3c7' : '#6b7280', fontWeight:800
                  }}>{tierCount}</span>
                )}
              </button>
            )
          })}
        </div>
        <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:10, fontStyle:'italic' }}>
          Editing rewards for: <strong style={{ color:'#92400e' }}>{activeListId === 'main' ? 'Main pricelist (your /u/<username>/pricelist)' : (customLists.find(l => l.id === activeListId)?.name || 'Custom list')}</strong>
        </p>

        {rewards.map((r, idx) => (
          <div key={idx} className="card" style={{ marginBottom:10, padding:14, border:'1.5px solid #fde68a', background:'#fffbeb' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <p style={{ fontWeight:800, fontSize:13, color:'#92400e' }}>🎁 Tier #{idx+1}</p>
              <button onClick={() => removeReward(idx)} style={{ fontSize:11, color:'#dc2626', background:'none', border:'none', cursor:'pointer', fontWeight:700 }}>✕ Remove</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#78350f', textTransform:'uppercase', letterSpacing:0.5 }}>Spend Threshold ($)</label>
                <input type="number" min="1" value={r.threshold} onChange={e => updateReward(idx, 'threshold', parseInt(e.target.value) || 0)}
                  style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #fde68a', borderRadius:8, fontSize:14, marginTop:3 }} placeholder="500" />
              </div>
              <div>
                <label style={{ fontSize:10, fontWeight:700, color:'#78350f', textTransform:'uppercase', letterSpacing:0.5 }}>Approx. Value ($)</label>
                <input type="number" min="0" step="0.01" value={r.value || ''} onChange={e => updateReward(idx, 'value', parseFloat(e.target.value) || 0)}
                  style={{ width:'100%', padding:'8px 10px', border:'1.5px solid #fde68a', borderRadius:8, fontSize:14, marginTop:3 }} placeholder="25.00" />
              </div>
            </div>

            {/* Gift product picker (1 or 2 options) */}
            <label style={{ fontSize:10, fontWeight:700, color:'#78350f', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:6 }}>
              Gift Options <span style={{ fontWeight:500, textTransform:'none', letterSpacing:0, fontSize:10, color:'#78350f' }}>(1 or 2 — customer chooses if 2)</span>
            </label>

            {[0, 1].map(optIdx => {
              const opt = r.options?.[optIdx]
              return (
                <div key={optIdx} style={{ display:'flex', gap:6, marginBottom:6 }}>
                  <select
                    value={opt?.product_id || ''}
                    onChange={e => e.target.value ? setRewardOption(idx, optIdx, e.target.value) : removeRewardOption(idx, optIdx)}
                    style={{ flex:1, padding:'8px 10px', border:'1.5px solid #fde68a', borderRadius:8, fontSize:13, background:'white', color: opt ? '#1a1a1a' : '#94a3b8' }}
                  >
                    <option value="">{optIdx === 0 ? '— Pick a gift product —' : '— Optional second choice —'}</option>
                    {products.filter(p => p.is_active !== false).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.brand ? ` · ${p.brand}` : ''}{p.cost ? ` (cost $${p.cost})` : ''}
                      </option>
                    ))}
                  </select>
                  {opt && (
                    <button onClick={() => removeRewardOption(idx, optIdx)} style={{ padding:'8px 12px', borderRadius:8, border:'1.5px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontWeight:700, fontSize:11, cursor:'pointer' }} title="Remove option">✕</button>
                  )}
                </div>
              )
            })}

            {(!r.options || r.options.length === 0) && r.name && (
              <p style={{ fontSize:11, color:'#92400e', marginTop:6, fontStyle:'italic' }}>
                ⚠️ Legacy reward — old text was: "{r.name}". Pick a product above to upgrade.
              </p>
            )}
          </div>
        ))}

        <div style={{ display:'flex', gap:8, marginBottom:24 }}>
          <button onClick={addReward} style={{ flex:1, padding:'10px', borderRadius:10, border:'1.5px dashed #fde68a', background:'#fffbeb', color:'#92400e', fontWeight:700, fontSize:13, cursor:'pointer' }}>
            ＋ Add Reward Tier
          </button>
          {rewards.length > 0 && (
            <button onClick={() => saveRewards(rewards)} disabled={savingRewards}
              style={{ padding:'10px 18px', borderRadius:10, border:'none', background:'linear-gradient(135deg,#d4a843,#b8860b)', color:'#0a0a0a', fontWeight:800, fontSize:13, cursor:'pointer' }}>
              {savingRewards ? 'Saving...' : '💾 Save Rewards'}
            </button>
          )}
        </div>

        {/* Product picker */}
        <p className="section-header">Add Products</p>
        <div style={{ position:'relative', marginBottom:12 }}>
          <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', fontSize:15, color:'var(--text-muted)' }}>🔍</span>
          <input type="search" placeholder="Search your products..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ width:'100%', padding:'10px 14px 10px 38px', border:'1.5px solid var(--border)', borderRadius:24, fontSize:14, background:'var(--gray-light)' }} />
        </div>

        {filteredProducts.map(product => {
          const active = isFeatured(product.id)
          const isSaving = saving === product.id
          return (
            <div key={product.id} className="card" style={{ marginBottom:8, padding:'10px 13px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:8, overflow:'hidden', flexShrink:0, background:'var(--gray-light)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                {product.image_url ? <img src={product.image_url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : '📦'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontWeight:700, fontSize:14 }}>{product.name}</p>
                <p style={{ fontSize:11, color:'var(--text-muted)' }}>{product.category}{product.brand ? ` · ${product.brand}` : ''}</p>
              </div>
              <button onClick={() => toggle(product)} disabled={isSaving}
                style={{
                  padding:'6px 14px', borderRadius:18, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, flexShrink:0,
                  background: isSaving ? '#d1d5db' : active ? '#dcfce7' : 'var(--blue)',
                  color: isSaving ? '#6b7280' : active ? '#16a34a' : 'white',
                }}>
                {isSaving ? '...' : active ? '✅ Featured' : '＋ Feature'}
              </button>
            </div>
          )
        })}
      </div>

      {toast && <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000, whiteSpace:'nowrap' }}>{toast}</div>}
    </div>
  )
}
