import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function NicheLandingPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [niche, setNiche] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState({})
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [showOrder, setShowOrder] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: n } = await supabase.from('niche_lists').select('*').eq('slug', slug).single()
      if (!n) { setLoading(false); return }
      setNiche(n)
      const { data: listItems } = await supabase
        .from('niche_list_items')
        .select('*, product:product_id(id,name,brand,description,image_url,images,category,unit,sell_price,price_min,price_max)')
        .eq('niche_list_id', n.id)
        .eq('is_active', true)
        .order('sort_order')
      setItems(listItems || [])
      setLoading(false)
    }
    load()
  }, [slug])

  const cartTotal = Object.values(cart).reduce((s, { item, qty }) => s + qty * (item.custom_price ?? item.product?.sell_price ?? 0), 0)
  const cartCount = Object.values(cart).reduce((s, { qty }) => s + qty, 0)

  const setQty = (itemId, qty, item) => {
    if (qty <= 0) { setCart(p => { const n = {...p}; delete n[itemId]; return n }); return }
    setCart(p => ({ ...p, [itemId]: { item, qty } }))
  }

  const submitOrder = async () => {
    if (!orderForm.name || !orderForm.phone) return
    setSubmitting(true)
    try {
      const orderItems = Object.values(cart).map(({ item, qty }) => ({
        product_id: item.product?.id,
        name: item.product?.name,
        qty,
        unit_price: item.custom_price ?? item.product?.sell_price ?? 0,
        subtotal: qty * (item.custom_price ?? item.product?.sell_price ?? 0),
      }))
      await supabase.from('orders').insert([{
        customer_name: orderForm.name,
        phone: orderForm.phone,
        address: orderForm.address,
        notes: `[${niche.name}] ${orderForm.notes}`,
        items: orderItems,
        total_amount: cartTotal,
        seller_user_id: niche.admin_user_id,
        seller_username: 'joe',
        status: 'pending',
      }])
      setSubmitted(true)
      setCart({})
    } catch (e) { alert('Could not submit: ' + e.message) }
    finally { setSubmitting(false) }
  }

  const color = niche?.theme_color || '#7c3aed'
  const filtered = items.filter(item =>
    !search ||
    item.product?.name?.toLowerCase().includes(search.toLowerCase()) ||
    item.product?.brand?.toLowerCase().includes(search.toLowerCase()) ||
    item.product?.category?.toLowerCase().includes(search.toLowerCase())
  )

  const grouped = {}
  filtered.forEach(item => {
    const cat = item.product?.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  })

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16 }}>Loading...</div>
    </div>
  )

  if (!niche) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18 }}>Price list not found</p>
      <button onClick={() => navigate('/')} style={{ padding: '10px 24px', borderRadius: 20, background: 'white', color: '#0a0a0a', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Go Home</button>
    </div>
  )

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🛒</div>
          <span style={{ fontWeight: 800, fontSize: 16 }}>Kanz Supply</span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {cartCount > 0 && (
            <button onClick={() => setShowOrder(true)} style={{ padding: '8px 18px', borderRadius: 20, border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              🛒 {cartCount} · ${cartTotal.toFixed(2)}
            </button>
          )}
          <button onClick={() => navigate('/login')} style={{ padding: '8px 18px', borderRadius: 20, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Login</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 60, paddingLeft: 24, paddingRight: 24, textAlign: 'center', background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${color}20 0%, transparent 70%)` }}>
        <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 24, background: `${color}22`, border: `1px solid ${color}44`, fontSize: 13, fontWeight: 600, color, marginBottom: 20 }}>
          {niche.name}
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5vw,60px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 16 }}>
          {niche.hero_title || niche.name}
        </h1>
        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.55)', maxWidth: 500, margin: '0 auto 40px', lineHeight: 1.6 }}>
          {niche.hero_subtitle || niche.description}
        </p>
      </section>

      {/* Products */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
          <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, fontSize: 16 }}>🔍</span>
          <input type="search" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '14px 18px 14px 48px', borderRadius: 28, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {items.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
            <p>No products in this price list yet</p>
          </div>
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom: 48 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{cat}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {catItems.map(item => {
                const p = item.product
                const price = item.custom_price ?? p?.sell_price ?? 0
                const qty = cart[item.id]?.qty || 0
                return (
                  <div key={item.id} style={{ borderRadius: 18, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = `${color}44`}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
                  >
                    {/* Image */}
                    <div style={{ aspectRatio: '1', overflow: 'hidden', background: 'rgba(255,255,255,0.03)' }}>
                      {p?.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, opacity: 0.2 }}>📦</div>}
                    </div>
                    <div style={{ padding: '14px 16px 16px' }}>
                      <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, lineHeight: 1.3 }}>{p?.name}</p>
                      {p?.brand && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>{p.brand}</p>}
                      {item.custom_description && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 10, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.custom_description}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
                        <p style={{ fontWeight: 900, fontSize: 18, color }}>${price.toFixed(2)}</p>
                        {qty === 0 ? (
                          <button onClick={() => setQty(item.id, 1, item)} style={{ padding: '7px 16px', borderRadius: 20, border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add</button>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                            <button onClick={() => setQty(item.id, qty - 1, item)} style={{ width: 30, height: 30, borderRadius: '8px 0 0 8px', border: `1px solid ${color}`, background: 'transparent', color, fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>−</button>
                            <div style={{ width: 36, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}`, borderLeft: 'none', borderRight: 'none', fontWeight: 700, fontSize: 14 }}>{qty}</div>
                            <button onClick={() => setQty(item.id, qty + 1, item)} style={{ width: 30, height: 30, borderRadius: '0 8px 8px 0', border: `1px solid ${color}`, background: color, color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>+</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </section>

      {/* Order Modal */}
      {showOrder && (
        <div onClick={() => setShowOrder(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 500, display: 'flex', alignItems: 'flex-end', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', borderRadius: '24px 24px 0 0', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '28px 24px 40px', border: '1px solid rgba(255,255,255,0.1)' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Order Received!</h2>
                <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>We'll be in touch shortly to confirm your order.</p>
                <button onClick={() => { setShowOrder(false); setSubmitted(false) }} style={{ padding: '12px 32px', borderRadius: 24, border: 'none', background: color, color: 'white', fontWeight: 700, cursor: 'pointer' }}>Done</button>
              </div>
            ) : <>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Request Order</h2>
              {/* Cart summary */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: '14px 16px', marginBottom: 20 }}>
                {Object.values(cart).map(({ item, qty }) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>{item.product?.name} × {qty}</span>
                    <span style={{ fontWeight: 700, color }}>${(qty * (item.custom_price ?? item.product?.sell_price ?? 0)).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontWeight: 800, fontSize: 16 }}>
                  <span>Total</span>
                  <span style={{ color }}>${cartTotal.toFixed(2)}</span>
                </div>
              </div>
              {[['name','Your Name *'],['phone','Phone *'],['address','Business Address'],['notes','Notes']].map(([field, label]) => (
                <div key={field} style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6, fontWeight: 600 }}>{label}</label>
                  <input value={orderForm[field]} onChange={e => setOrderForm(p => ({...p,[field]:e.target.value}))}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)', color: 'white', fontSize: 15, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <button onClick={submitOrder} disabled={!orderForm.name || !orderForm.phone || submitting}
                style={{ width: '100%', marginTop: 8, padding: '14px', borderRadius: 16, border: 'none', background: !orderForm.name || !orderForm.phone ? 'rgba(255,255,255,0.1)' : color, color: 'white', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}>
                {submitting ? 'Submitting...' : 'Submit Order Request'}
              </button>
            </>}
          </div>
        </div>
      )}

      {/* Sticky cart bar */}
      {cartCount > 0 && !showOrder && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200 }}>
          <button onClick={() => setShowOrder(true)} style={{ padding: '14px 32px', borderRadius: 32, border: 'none', background: color, color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: `0 8px 32px ${color}66`, display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
            🛒 {cartCount} item{cartCount > 1 ? 's' : ''} · ${cartTotal.toFixed(2)} · Request Order →
          </button>
        </div>
      )}
    </div>
  )
}
