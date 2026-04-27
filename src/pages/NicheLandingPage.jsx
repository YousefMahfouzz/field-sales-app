import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function NicheLandingPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [seller, setSeller] = useState(null) // {user_id, username}
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selected, setSelected] = useState(null)
  const [cart, setCart] = useState({}) // { itemId: { qty, item, product } }
  const [showCart, setShowCart] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [confirmedTotal, setConfirmedTotal] = useState(0)
  const [rewardChoices, setRewardChoices] = useState({}) // { rewardIdx: optionIdx }
  const [showRewardsPopup, setShowRewardsPopup] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: listData } = await supabase
        .from('price_lists').select('*').eq('slug', slug).eq('is_public', true).eq('is_active', true).single()
      if (!listData) { setNotFound(true); setLoading(false); return }
      setList(listData)

      // Load seller info for order routing
      if (listData.user_id) {
        const { data: profileData } = await supabase
          .from('profiles').select('id, username, display_name').eq('id', listData.user_id).single()
        setSeller(profileData || { id: listData.user_id })
      }

      // Items with product details
      const { data: itemData } = await supabase
        .from('price_list_items')
        .select(`*, product:products(id, name, description, image_url, images, brand, category, unit, sell_price, user_id)`)
        .eq('price_list_id', listData.id).eq('is_active', true).order('display_order')
      setItems((itemData || []).filter(i => i.product))

      // Load rewards SCOPED to this list (rewards_list_<id>) – fall back to none if not set
      const { data: rewardsData } = await supabase
        .from('app_settings').select('value').eq('key', `rewards_list_${listData.id}`).single()
      if (rewardsData?.value) {
        try {
          setRewards(JSON.parse(rewardsData.value)
            .filter(r => r.threshold > 0 && (r.name || (r.options && r.options.length > 0)))
            .sort((a, b) => a.threshold - b.threshold))
        } catch {}
      }

      setLoading(false)
    }
    load()
  }, [slug])

  // Get effective price for an item (custom price if set, otherwise product sell_price)
  const priceFor = (item, product) => item?.custom_price > 0 ? item.custom_price : (product?.sell_price || 0)

  // Cart helpers
  const setQty = (itemId, item, product, qty) => {
    if (qty <= 0) {
      setCart(p => { const n = { ...p }; delete n[itemId]; return n })
    } else {
      setCart(p => ({ ...p, [itemId]: { qty, item, product } }))
    }
  }
  const addToCart = (item, product) => {
    setQty(item.id, item, product, (cart[item.id]?.qty || 0) + 1)
  }
  const cartCount = Object.values(cart).reduce((s, i) => s + i.qty, 0)
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.qty * priceFor(i.item, i.product), 0)

  const earnedRewards = rewards.filter(r => cartTotal >= r.threshold)
  const nextReward = rewards.find(r => cartTotal < r.threshold)
  const nextRewardIdx = nextReward ? rewards.indexOf(nextReward) : -1
  const amountToNext = nextReward ? nextReward.threshold - cartTotal : 0
  const rewardProgress = nextReward ? Math.min(100, (cartTotal / nextReward.threshold) * 100) : 100

  // Helper: get display name for a reward
  const rewardDisplay = (r, idx) => {
    if (r.options && r.options.length > 0) {
      if (r.options.length === 1) return r.options[0].name
      const chosen = rewardChoices[idx]
      if (chosen != null && r.options[chosen]) return r.options[chosen].name
      return r.options.map(o => o.name).join(' OR ')
    }
    return r.name || 'Free gift'
  }
  const rewardNeedsChoice = (r, idx) => r.options && r.options.length > 1 && rewardChoices[idx] == null

  const submitOrder = async () => {
    if (!orderForm.name.trim() || !orderForm.phone.trim() || !orderForm.address.trim()) {
      alert('Please fill in your name, phone, and address.')
      return
    }
    setOrderLoading(true)
    try {
      const orderItems = Object.values(cart).map(({ qty, item, product }) => ({
        product_id: product.id,
        name: product.name,
        brand: product.brand,
        qty,
        unit_price: priceFor(item, product),
        subtotal: qty * priceFor(item, product),
      }))

      // Append earned rewards (with chosen option) to notes
      let rewardNote = ''
      if (earnedRewards.length > 0) {
        const rewardLines = earnedRewards.map(r => {
          const rIdx = rewards.indexOf(r)
          return `• ${rewardDisplay(r, rIdx)}${r.value > 0 ? ` ($${r.value.toFixed(2)} value)` : ''}`
        }).join('\n')
        rewardNote = `\n\n🎁 FREE GIFTS EARNED:\n${rewardLines}`
      }

      const { error } = await supabase.from('orders').insert([{
        customer_name: orderForm.name.trim(),
        phone: orderForm.phone.trim(),
        address: orderForm.address.trim(),
        notes: (orderForm.notes.trim() || '') + (list.name ? `\n[List: ${list.name}]` : '') + rewardNote,
        items: orderItems,
        total_amount: cartTotal,
        seller_user_id: seller?.id || list.user_id || null,
        seller_username: seller?.username || null,
        status: 'pending',
      }])
      if (error) throw error
      setConfirmedTotal(cartTotal)
      setOrderSubmitted(true)
      setCart({})
    } catch (err) {
      alert('Could not submit order: ' + err.message)
    } finally {
      setOrderLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>Loading...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
      <p style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Price list not found</p>
      <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>This link may have expired or been made private.</p>
      <button onClick={() => navigate('/')} style={{ padding: '12px 28px', borderRadius: 12, background: 'white', color: 'black', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Go Home</button>
    </div>
  )

  const color = list.banner_color || '#c9a96a'
  const grouped = {}
  items.forEach(item => {
    const product = item.product
    if (!product) return
    const cat = product.category || 'Products'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ item, product })
  })

  return (
    <div style={{ minHeight: '100vh', background: '#0e0b08', color: '#f4ede0', fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');
        @keyframes pulseDot { 0% { box-shadow: 0 0 0 0 rgba(185,90,58,0.6); } 70% { box-shadow: 0 0 0 12px rgba(185,90,58,0); } 100% { box-shadow: 0 0 0 0 rgba(185,90,58,0); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }
        @keyframes cartBounce { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .niche-card { transition: all 0.3s ease; }
        .niche-card:hover { transform: translateY(-4px); border-color: ${color}55 !important; }
        .niche-card img { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; pointer-events: none; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(14,11,8,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(201,169,106,0.18)' }}>
        <button onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', color: '#f4ede0', cursor: 'pointer' }}>
          <div style={{ width: 30, height: 30, border: `1.5px solid ${color}`, color: color, fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 17, display: 'grid', placeItems: 'center', borderRadius: '50%' }}>K</div>
          <span style={{ fontWeight: 600, fontSize: 14, letterSpacing: '0.18em' }}>KANZ <em style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, color: color, marginLeft: 2 }}>supply</em></span>
        </button>
      </nav>

      {/* Hero (editorial) */}
      <div style={{ padding: 'clamp(48px, 8vw, 88px) 24px clamp(36px, 5vw, 60px)', background: '#0e0b08', borderBottom: '1px solid rgba(201,169,106,0.18)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: '-3vw', left: '50%', transform: 'translateX(-50%)', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontWeight: 300, fontSize: '22vw', lineHeight: 0.85, color: 'rgba(244,237,224,0.04)', letterSpacing: '-0.05em', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1 }}>
          {(list.niche || 'catalogue').toLowerCase()}
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, font: '500 11px/1 "JetBrains Mono", monospace', letterSpacing: '0.32em', textTransform: 'uppercase', color: color, marginBottom: 24 }}>
            <span style={{ width: 7, height: 7, background: '#b95a3a', borderRadius: '50%', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
            {list.niche || 'Curated Selection'}
          </span>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(40px, 7vw, 84px)', lineHeight: 0.95, letterSpacing: '-0.025em', color: '#f4ede0', marginBottom: 22 }}>
            {list.name}
          </h1>
          {list.description && (
            <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 'clamp(15px, 1.4vw, 18px)', color: 'rgba(244,237,224,0.72)', maxWidth: 540, margin: '0 auto', lineHeight: 1.55 }}>
              {list.description}
            </p>
          )}
          {items.length > 0 && (
            <div style={{ marginTop: 32, display: 'inline-flex', gap: 0, border: '1px solid rgba(201,169,106,0.22)', borderRadius: 999, padding: '8px 4px', background: 'rgba(201,169,106,0.04)' }}>
              <div style={{ padding: '8px 22px', borderRight: '1px solid rgba(201,169,106,0.22)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#e6c989', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 22, fontWeight: 300 }}>{items.length}</span>
                <span style={{ color: 'rgba(244,237,224,0.6)', font: '500 10px/1 "JetBrains Mono", monospace', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Items</span>
              </div>
              <div style={{ padding: '8px 22px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#e6c989', fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 22, fontWeight: 300 }}>{Object.keys(grouped).length}</span>
                <span style={{ color: 'rgba(244,237,224,0.6)', font: '500 10px/1 "JetBrains Mono", monospace', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Categories</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 24px 120px' }}>
        {Object.entries(grouped).map(([cat, catItems], catIdx) => (
          <div key={cat} style={{ marginBottom: 56 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginBottom: 24, paddingTop: 16, borderTop: '1px solid rgba(201,169,106,0.22)' }}>
              <span style={{ font: '500 11px/1 "JetBrains Mono", monospace', letterSpacing: '0.22em', color: '#e6c989', flexShrink: 0 }}>№ 0{catIdx + 1}</span>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(22px, 3vw, 32px)', color: '#f4ede0', flex: 1, lineHeight: 1.1 }}>{cat}</h2>
              <span style={{ font: '500 10px/1 "JetBrains Mono", monospace', letterSpacing: '0.18em', color: 'rgba(244,237,224,0.4)', flexShrink: 0 }}>{catItems.length} {catItems.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: 18 }}>
              {catItems.map(({ item, product }, i) => {
                const hasPrice = item.custom_price > 0
                const inCart = cart[item.id]
                return (
                  <div key={item.id} className="niche-card"
                    onContextMenu={e => e.preventDefault()}
                    style={{
                      background: 'rgba(255,255,255,0.04)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden',
                      animation: `fadeUp 0.5s ease ${(catIdx * 0.1 + i * 0.05)}s both`,
                    }}>
                    <div onClick={() => setSelected({ item, product })} style={{ width: '100%', paddingTop: '60%', position: 'relative', background: 'rgba(255,255,255,0.03)', cursor: 'pointer' }}>
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} draggable="false" onContextMenu={e => e.preventDefault()} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                        : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44 }}>📦</div>
                      }
                    </div>
                    <div style={{ padding: '16px 18px 18px' }}>
                      {product.brand && <p style={{ fontSize: 10, color: color, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>{product.brand}</p>}
                      <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 18, marginBottom: 6, lineHeight: 1.25, color: '#f4ede0' }}>{product.name}</p>
                      {product.description && <p style={{ fontSize: 12, color: 'rgba(244,237,224,0.45)', lineHeight: 1.5, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 }}>
                        <span style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontStyle: 'italic', fontSize: 19, color: '#e6c989' }}>
                          {hasPrice ? <>${item.custom_price}<span style={{ fontSize: 11, color: 'rgba(244,237,224,0.5)' }}>/{product.unit || 'unit'}</span></> : <span style={{ fontSize: 12, color: 'rgba(244,237,224,0.4)' }}>—</span>}
                        </span>
                        {inCart ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0e0b08', border: `1px solid ${color}55`, borderRadius: 999, padding: '4px 6px' }}>
                            <button onClick={() => setQty(item.id, item, product, inCart.qty - 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: color, fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>−</button>
                            <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 700, color: '#f4ede0' }}>{inCart.qty}</span>
                            <button onClick={() => setQty(item.id, item, product, inCart.qty + 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: color, color: '#0e0b08', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>+</button>
                          </div>
                        ) : (
                          <button onClick={() => addToCart(item, product)} style={{ padding: '8px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', background: color, color: '#0e0b08', fontWeight: 700, fontSize: 12, letterSpacing: '0.04em' }}>+ Add</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* ── REWARDS PEEK BUTTON (left side, always visible if rewards exist) ── */}
      {rewards.length > 0 && !showCart && !showOrderForm && !orderSubmitted && (
        <button
          onClick={() => setShowRewardsPopup(true)}
          aria-label="Show rewards"
          style={{
            position: 'fixed', bottom: 28, left: 24, zIndex: 200,
            background: `linear-gradient(135deg, ${color}, ${color}dd)`,
            color: '#0e0b08', border: 'none', borderRadius: '50%',
            width: 56, height: 56, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 8px 28px ${color}66`,
            fontSize: 24,
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          🎁
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#0e0b08', color: color,
            borderRadius: 10, fontSize: 10, fontWeight: 800,
            padding: '2px 6px', minWidth: 18, lineHeight: 1,
            border: `1.5px solid ${color}`,
          }}>{rewards.length}</span>
        </button>
      )}

      {/* ── REWARDS POPUP ── */}
      {showRewardsPopup && (
        <div
          onClick={() => setShowRewardsPopup(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(14,11,8,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-start',
            padding: 24,
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, #14100c, #1a1500)',
              border: `1.5px solid ${color}55`,
              borderRadius: 20,
              padding: '24px 24px 20px',
              maxWidth: 420, width: '100%',
              maxHeight: '85vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              marginBottom: 88,
              animation: 'slideUp 0.3s cubic-bezier(.2,.7,.2,1)',
              color: '#f4ede0',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: color, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>
                  Spend & Save
                </p>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                  Free gifts <span style={{ color: color, fontStyle: 'italic', fontFamily: 'Fraunces, serif', fontWeight: 300 }}>with your order</span>
                </h2>
              </div>
              <button onClick={() => setShowRewardsPopup(false)} style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(255,255,255,0.6)', width: 32, height: 32,
                borderRadius: '50%', fontSize: 18, cursor: 'pointer',
                flexShrink: 0,
              }}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rewards.map((r, idx) => {
                const isEarned = cartTotal >= r.threshold
                const distance = r.threshold - cartTotal
                return (
                  <div key={idx} style={{
                    background: isEarned ? 'rgba(134,239,172,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${isEarned ? 'rgba(134,239,172,0.4)' : `${color}33`}`,
                    borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: isEarned ? '#86efac' : color, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', fontFamily: 'JetBrains Mono, monospace' }}>
                        {isEarned ? '✓ Earned' : `Spend $${r.threshold}+`}
                      </span>
                      {r.value > 0 && (
                        <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>
                          ${r.value.toFixed(2)} value
                        </span>
                      )}
                    </div>
                    {r.options && r.options.length > 0 ? (
                      <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {r.options.map((opt, i) => {
                          const imgUrl = opt.image_url
                          return (
                            <div key={i} style={{
                              flex: '1 1 140px', maxWidth: 180,
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                            }}>
                              <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
                                <div style={{
                                  position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden',
                                  background: imgUrl ? '#000' : 'linear-gradient(135deg, #1a1500, #2a2010)',
                                  border: `1.5px solid ${color}40`,
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {imgUrl ? (
                                    <img src={imgUrl} alt={opt.name} draggable="false" onContextMenu={e => e.preventDefault()}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover', userSelect: 'none', pointerEvents: 'none' }} />
                                  ) : (
                                    <span style={{ fontSize: 38, opacity: 0.3 }}>📦</span>
                                  )}
                                </div>
                                <div style={{
                                  position: 'absolute', top: 0, bottom: 0, left: '50%',
                                  width: 'clamp(14px, 14%, 22px)', transform: 'translateX(-50%)',
                                  background: `linear-gradient(180deg, ${color}, ${color}cc 50%, ${color}88 100%)`,
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.4)',
                                  pointerEvents: 'none',
                                }} />
                                <div style={{
                                  position: 'absolute', left: 0, right: 0, top: '50%',
                                  height: 'clamp(14px, 14%, 22px)', transform: 'translateY(-50%)',
                                  background: `linear-gradient(90deg, ${color}, ${color}cc 50%, ${color}88 100%)`,
                                  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.25), 0 2px 6px rgba(0,0,0,0.4)',
                                  pointerEvents: 'none',
                                }} />
                                <svg viewBox="0 0 80 56" style={{
                                  position: 'absolute', top: '-18%', left: '50%', transform: 'translateX(-50%)',
                                  width: '60%', height: 'auto', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))',
                                  pointerEvents: 'none',
                                }}>
                                  <defs>
                                    <linearGradient id={`niche-bow-${idx}-${i}`} x1="0" x2="0" y1="0" y2="1">
                                      <stop offset="0%" stopColor={color} stopOpacity="1" />
                                      <stop offset="100%" stopColor={color} stopOpacity="0.6" />
                                    </linearGradient>
                                  </defs>
                                  <path d="M 40 30 Q 8 6, 6 28 Q 4 46, 38 34 Z" fill={`url(#niche-bow-${idx}-${i})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                  <path d="M 40 30 Q 72 6, 74 28 Q 76 46, 42 34 Z" fill={`url(#niche-bow-${idx}-${i})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                  <ellipse cx="40" cy="30" rx="7" ry="9" fill={`url(#niche-bow-${idx}-${i})`} stroke="rgba(0,0,0,0.4)" strokeWidth="0.8" />
                                  <ellipse cx="38" cy="27" rx="2" ry="3" fill="rgba(255,255,255,0.4)" />
                                </svg>
                                {isEarned && (
                                  <div style={{
                                    position: 'absolute', top: 6, right: 6, zIndex: 5,
                                    width: 24, height: 24, borderRadius: '50%',
                                    background: '#16a34a', color: 'white',
                                    display: 'grid', placeItems: 'center',
                                    fontSize: 14, fontWeight: 800,
                                    boxShadow: '0 2px 8px rgba(22,163,74,0.5)',
                                  }}>✓</div>
                                )}
                              </div>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#fff', textAlign: 'center', lineHeight: 1.3 }}>
                                {opt.name}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 8 }}>
                        🎁 {r.name || 'Free gift'}
                      </p>
                    )}
                    {r.options && r.options.length > 1 && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginTop: 10, textAlign: 'center' }}>
                        👆 Customer picks one
                      </p>
                    )}
                    {!isEarned && cartTotal > 0 && (
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
                        ${distance.toFixed(2)} more to unlock
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 16 }}>
              Tap anywhere to close
            </p>
          </div>
        </div>
      )}

      {/* Reward progress pill (above cart FAB) */}
      {cartCount > 0 && !showCart && !showOrderForm && !orderSubmitted && rewards.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 96, right: 24, zIndex: 199, maxWidth: 320,
          background: 'linear-gradient(135deg, rgba(14,11,8,0.96), rgba(26,21,0,0.96))',
          border: '1px solid rgba(201,169,106,0.32)', borderRadius: 16,
          padding: '12px 16px', boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)', animation: 'fadeUp 0.4s ease both',
        }}>
          {nextReward ? (
            <>
              <p style={{ fontSize: 11, color: '#e6c989', fontWeight: 700, marginBottom: 4 }}>🎁 ${amountToNext.toFixed(2)} away from</p>
              <p style={{ fontSize: 13, color: '#fff', fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
                {rewardDisplay(nextReward, nextRewardIdx)}
                {nextReward.value > 0 && <span style={{ color: color, fontSize: 11, fontWeight: 600 }}> (${nextReward.value.toFixed(2)} value)</span>}
              </p>
              <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${rewardProgress}%`, height: '100%', background: `linear-gradient(90deg, ${color}, #e6c989)`, transition: 'width 0.3s ease', borderRadius: 6 }} />
              </div>
              {earnedRewards.length > 0 && <p style={{ fontSize: 10, color: '#86efac', marginTop: 6, fontWeight: 600 }}>✅ Earned: {earnedRewards.map(r => rewardDisplay(r, rewards.indexOf(r))).join(', ')}</p>}
            </>
          ) : (
            <>
              <p style={{ fontSize: 11, color: '#86efac', fontWeight: 700, marginBottom: 4 }}>🎉 All rewards unlocked!</p>
              <p style={{ fontSize: 12, color: '#fff', lineHeight: 1.4 }}>You've earned: {earnedRewards.map(r => rewardDisplay(r, rewards.indexOf(r))).join(', ')}</p>
            </>
          )}
        </div>
      )}

      {/* CART FAB */}
      {cartCount > 0 && !showCart && !showOrderForm && !orderSubmitted && (
        <button onClick={() => setShowCart(true)} style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 200,
          padding: '16px 24px', borderRadius: 999, border: 'none', cursor: 'pointer',
          background: color, color: '#0e0b08', fontWeight: 800, fontSize: 15,
          boxShadow: `0 12px 40px ${color}55`,
          display: 'flex', alignItems: 'center', gap: 10,
          animation: 'cartBounce 1.5s ease-in-out infinite',
        }}>
          <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#0e0b08', color: color, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12 }}>{cartCount}</span>
          View Order · ${cartTotal.toFixed(2)}
        </button>
      )}

      {/* CART DRAWER */}
      {showCart && !showOrderForm && !orderSubmitted && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(12px)' }} onClick={() => setShowCart(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0e0b08', borderRadius: '24px 24px 0 0', maxWidth: 600, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderTop: `1px solid ${color}33`, color: '#f4ede0' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(201,169,106,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 24 }}>Your <em style={{ color: color }}>Order</em></h2>
              <button onClick={() => setShowCart(false)} style={{ background: 'none', border: 'none', color: 'rgba(244,237,224,0.4)', fontSize: 22, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
              {Object.values(cart).map(({ qty, item, product }) => {
                const price = priceFor(item, product)
                return (
                  <div key={item.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 8, background: 'rgba(255,255,255,0.04)', flexShrink: 0, overflow: 'hidden' }}>
                      {product.image_url && <img src={product.image_url} alt="" draggable="false" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{product.name}</p>
                      <p style={{ fontSize: 12, color: 'rgba(244,237,224,0.5)' }}>${price.toFixed(2)} × {qty} = ${(price * qty).toFixed(2)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <button onClick={() => setQty(item.id, item, product, qty - 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.06)', color: color, fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>−</button>
                      <span style={{ minWidth: 22, textAlign: 'center', fontWeight: 700 }}>{qty}</span>
                      <button onClick={() => setQty(item.id, item, product, qty + 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: color, color: '#0e0b08', fontWeight: 700, cursor: 'pointer', fontSize: 16 }}>+</button>
                    </div>
                  </div>
                )
              })}

              <div style={{ margin: '16px 0', padding: '14px 16px', background: 'rgba(255,255,255,0.04)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'rgba(244,237,224,0.6)' }}>Total ({cartCount} item{cartCount !== 1 ? 's' : ''})</span>
                <span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 26, fontWeight: 300, color: color }}>${cartTotal.toFixed(2)}</span>
              </div>

              {/* Reward progress in drawer */}
              {rewards.length > 0 && (
                <div style={{ padding: '14px 16px', borderRadius: 12, marginBottom: 14, background: 'linear-gradient(135deg, rgba(201,169,106,0.08), rgba(140,109,61,0.05))', border: '1px solid rgba(201,169,106,0.22)' }}>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#e6c989', marginBottom: 8 }}>
                    {nextReward ? `🎁 $${amountToNext.toFixed(2)} away from ${rewardDisplay(nextReward, nextRewardIdx)}` : `🎉 All rewards unlocked!`}
                  </p>
                  {nextReward && (
                    <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ width: `${rewardProgress}%`, height: '100%', background: `linear-gradient(90deg, ${color}, #e6c989)`, borderRadius: 8 }} />
                    </div>
                  )}
                  {earnedRewards.length > 0 && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(201,169,106,0.25)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>✅ Earned</p>
                      {earnedRewards.map((r, i) => {
                        const rIdx = rewards.indexOf(r)
                        const needsChoice = rewardNeedsChoice(r, rIdx)
                        return (
                          <div key={i} style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 12, color: '#a7f3d0', fontWeight: 600 }}>
                              🎁 {rewardDisplay(r, rIdx)}{r.value > 0 ? ` ($${r.value.toFixed(2)})` : ''}
                            </p>
                            {needsChoice && (
                              <div style={{ marginTop: 6, padding: '8px 10px', background: 'rgba(0,0,0,0.3)', border: `1.5px solid ${color}55`, borderRadius: 8 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#e6c989', marginBottom: 6 }}>👇 Choose your free gift:</p>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {r.options.map((opt, optIdx) => (
                                    <button key={optIdx} onClick={() => setRewardChoices(p => ({ ...p, [rIdx]: optIdx }))}
                                      style={{
                                        flex: '1 1 auto', padding: '8px 12px', borderRadius: 8,
                                        border: `1.5px solid ${rewardChoices[rIdx] === optIdx ? '#86efac' : 'rgba(201,169,106,0.4)'}`,
                                        background: rewardChoices[rIdx] === optIdx ? 'rgba(134,239,172,0.15)' : 'transparent',
                                        color: rewardChoices[rIdx] === optIdx ? '#a7f3d0' : '#e6c989',
                                        fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                      }}>
                                      {rewardChoices[rIdx] === optIdx ? '✓ ' : ''}{opt.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <p style={{ fontSize: 11, color: 'rgba(244,237,224,0.4)', lineHeight: 1.6, textAlign: 'center', marginTop: 12 }}>
                ✓ No payment required online. We'll call to confirm and arrange delivery.
              </p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(201,169,106,0.18)' }}>
              <button onClick={() => { setShowCart(false); setShowOrderForm(true) }} style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: color, color: '#0e0b08', fontWeight: 800, fontSize: 16, cursor: 'pointer' }}>
                Continue → Your Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER FORM */}
      {showOrderForm && !orderSubmitted && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(12px)' }} onClick={() => setShowOrderForm(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0e0b08', borderRadius: '24px 24px 0 0', maxWidth: 600, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderTop: `1px solid ${color}33`, color: '#f4ede0' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(201,169,106,0.18)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 24 }}>Your <em style={{ color: color }}>details</em></h2>
                <p style={{ fontSize: 12, color: 'rgba(244,237,224,0.5)', marginTop: 2 }}>{cartCount} items · ${cartTotal.toFixed(2)}</p>
              </div>
              <button onClick={() => { setShowOrderForm(false); setShowCart(true) }} style={{ background: 'none', border: 'none', color: 'rgba(244,237,224,0.4)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>← Back</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'e.g. Maria Johnson' },
                { key: 'phone', label: 'Phone Number *', placeholder: 'e.g. (504) 555-0123', type: 'tel' },
                { key: 'address', label: 'Store / Delivery Address *', placeholder: 'Street, City, State, ZIP', textarea: true },
                { key: 'notes', label: 'Notes (optional)', placeholder: 'Any special requests, business name, etc.', textarea: true },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(244,237,224,0.7)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>{f.label}</label>
                  {f.textarea ? (
                    <textarea
                      value={orderForm[f.key]}
                      onChange={e => setOrderForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      rows={f.key === 'notes' ? 2 : 3}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid rgba(201,169,106,0.18)', fontSize: 15, background: 'rgba(255,255,255,0.04)', color: '#f4ede0', fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor = color}
                      onBlur={e => e.target.style.borderColor = 'rgba(201,169,106,0.18)'}
                    />
                  ) : (
                    <input
                      type={f.type || 'text'}
                      value={orderForm[f.key]}
                      onChange={e => setOrderForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid rgba(201,169,106,0.18)', fontSize: 15, background: 'rgba(255,255,255,0.04)', color: '#f4ede0', outline: 'none' }}
                      onFocus={e => e.target.style.borderColor = color}
                      onBlur={e => e.target.style.borderColor = 'rgba(201,169,106,0.18)'}
                    />
                  )}
                </div>
              ))}
              <div style={{ background: 'rgba(201,169,106,0.06)', border: '1px solid rgba(201,169,106,0.2)', borderRadius: 12, padding: '14px 16px', marginTop: 8 }}>
                <p style={{ fontSize: 12, color: '#e6c989', lineHeight: 1.6, fontWeight: 600 }}>
                  ✓ <strong>No payment required online.</strong><br />
                  <span style={{ color: 'rgba(244,237,224,0.7)', fontWeight: 500 }}>We'll call you to confirm the order, arrange delivery, and collect payment when we drop off.</span>
                </p>
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(201,169,106,0.18)' }}>
              <button onClick={submitOrder} disabled={orderLoading} style={{ width: '100%', padding: 16, borderRadius: 12, border: 'none', background: color, color: '#0e0b08', fontWeight: 800, fontSize: 16, cursor: orderLoading ? 'not-allowed' : 'pointer', opacity: orderLoading ? 0.6 : 1 }}>
                {orderLoading ? 'Submitting...' : `Submit Order · $${cartTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ORDER CONFIRMATION */}
      {orderSubmitted && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(12px)' }}>
          <div style={{ background: '#0e0b08', borderRadius: 24, maxWidth: 460, width: '100%', padding: '40px 32px', textAlign: 'center', border: `1px solid ${color}55`, color: '#f4ede0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: color, color: '#0e0b08', display: 'grid', placeItems: 'center', fontSize: 32, fontWeight: 900, margin: '0 auto 24px' }}>✓</div>
            <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 32, marginBottom: 14 }}>Order <em style={{ color: color }}>received.</em></h2>
            <p style={{ color: 'rgba(244,237,224,0.7)', fontSize: 15, lineHeight: 1.7, marginBottom: 8 }}>
              Thanks {orderForm.name.split(' ')[0]}! We've got your order for <strong style={{ color: color }}>${confirmedTotal.toFixed(2)}</strong>.
            </p>
            <p style={{ color: 'rgba(244,237,224,0.5)', fontSize: 14, marginBottom: 28 }}>
              We'll call you at <strong>{orderForm.phone}</strong> within 24 hours to confirm delivery details.
            </p>
            <button onClick={() => { setOrderSubmitted(false); setOrderForm({ name: '', phone: '', address: '', notes: '' }) }} style={{ padding: '13px 28px', borderRadius: 10, border: `1.5px solid ${color}`, background: 'transparent', color: color, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Browse More Products
            </button>
          </div>
        </div>
      )}

      {/* Product modal */}
      {selected && (
        <div onClick={() => setSelected(null)} onContextMenu={e => e.preventDefault()} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(12px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#14100c', borderRadius: 20, maxWidth: 560, width: '100%', overflow: 'hidden', border: `1px solid ${color}33`, maxHeight: '90vh', overflowY: 'auto', color: '#f4ede0' }}>
            {selected.product.image_url && (
              <div style={{ width: '100%', paddingTop: '50%', position: 'relative' }}>
                <img src={selected.product.image_url} alt="" draggable="false" onContextMenu={e => e.preventDefault()} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ padding: 28 }}>
              {selected.product.brand && <p style={{ fontSize: 11, color: color, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>{selected.product.brand}</p>}
              <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 28, marginBottom: 14, lineHeight: 1.15 }}>{selected.product.name}</h2>
              {selected.product.description && <p style={{ color: 'rgba(244,237,224,0.65)', lineHeight: 1.7, marginBottom: 18, fontSize: 14 }}>{selected.product.description}</p>}
              {selected.item.custom_price > 0 && (
                <div style={{ background: 'rgba(201,169,106,0.06)', borderRadius: 12, padding: '14px 18px', marginBottom: 18, border: '1px solid rgba(201,169,106,0.2)' }}>
                  <p style={{ fontSize: 11, color: 'rgba(244,237,224,0.5)', marginBottom: 4 }}>Wholesale Price</p>
                  <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontStyle: 'italic', fontSize: 30, color: color }}>
                    ${selected.item.custom_price}<span style={{ fontSize: 13, color: 'rgba(244,237,224,0.5)' }}>/{selected.product.unit || 'unit'}</span>
                  </p>
                  {selected.item.custom_price_min > 0 && (
                    <p style={{ fontSize: 12, color: 'rgba(244,237,224,0.55)', marginTop: 6 }}>Suggested retail: ${selected.item.custom_price_min} – ${selected.item.custom_price_max}</p>
                  )}
                </div>
              )}
              {cart[selected.item.id] ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', background: 'rgba(201,169,106,0.08)', borderRadius: 12, marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>In your order</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => setQty(selected.item.id, selected.item, selected.product, cart[selected.item.id].qty - 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.08)', color: color, fontWeight: 700, cursor: 'pointer', fontSize: 18 }}>−</button>
                    <span style={{ minWidth: 28, textAlign: 'center', fontWeight: 800, fontSize: 16 }}>{cart[selected.item.id].qty}</span>
                    <button onClick={() => setQty(selected.item.id, selected.item, selected.product, cart[selected.item.id].qty + 1)} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: color, color: '#0e0b08', fontWeight: 700, cursor: 'pointer', fontSize: 18 }}>+</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => addToCart(selected.item, selected.product)} style={{ width: '100%', padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer', background: color, color: '#0e0b08', fontWeight: 800, fontSize: 15, marginBottom: 10 }}>
                  + Add to Order
                </button>
              )}
              <button onClick={() => setSelected(null)} style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(244,237,224,0.6)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid rgba(201,169,106,0.18)', padding: '24px', textAlign: 'center', color: 'rgba(244,237,224,0.3)', fontSize: 11, font: '500 11px/1.6 "JetBrains Mono", monospace', letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        © 2026 <em style={{ color: color, fontFamily: 'Fraunces, serif' }}>Kanz</em> Supply LLC · Family Owned
      </div>
    </div>
  )
}
