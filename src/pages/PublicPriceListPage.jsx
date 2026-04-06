import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PublicPriceListPage() {
  const { userId, slug } = useParams()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState({})
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [showOrder, setShowOrder] = useState(false)
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const load = async () => {
      // userId param could be a UUID or a username — resolve to actual user_id
      let resolvedUserId = userId
      const isUUID = /^[0-9a-f-]{36}$/.test(userId)
      if (!isUUID) {
        // It's a username — look up the profile
        const { data: prof } = await supabase.from('profiles')
          .select('id').eq('username', userId).single()
        if (!prof) { setLoading(false); return }
        resolvedUserId = prof.id
      }

      // Get the price list
      const { data: listData } = await supabase.from('price_lists')
        .select('*').eq('user_id', resolvedUserId).eq('slug', slug).single()
      if (!listData) { setLoading(false); return }
      setList(listData)

      // Get items with product info
      const { data: itemsData } = await supabase.from('price_list_items')
        .select('*, products(id, name, brand, description, category, unit, image_url, images, price_min, price_max)')
        .eq('price_list_id', listData.id)
        .order('display_order')
      setItems((itemsData || []).filter(i => i.products))

      // Get seller profile
      const { data: profileData } = await supabase.from('profiles')
        .select('display_name, username').eq('id', resolvedUserId).single()
      setProfile(profileData)
      setLoading(false)
    }
    load()
  }, [userId, slug])

  const cartTotal = Object.values(cart).reduce((s, { item, qty }) => s + qty * (item.custom_price || 0), 0)
  const cartCount = Object.values(cart).reduce((s, { qty }) => s + qty, 0)

  const setQty = (item, qty) => {
    if (qty <= 0) {
      setCart(prev => { const n = { ...prev }; delete n[item.id]; return n })
    } else {
      setCart(prev => ({ ...prev, [item.id]: { item, qty } }))
    }
  }

  const submitOrder = async () => {
    if (!orderForm.name.trim() || !orderForm.phone.trim()) return
    setSubmitting(true)
    try {
      const orderItems = Object.values(cart).map(({ item, qty }) => ({
        product_id: item.products.id,
        name: item.products.name,
        brand: item.products.brand,
        qty, unit_price: item.custom_price,
        subtotal: qty * item.custom_price,
      }))
      const { error } = await supabase.from('orders').insert([{
        customer_name: orderForm.name.trim(),
        phone: orderForm.phone.trim(),
        address: orderForm.address.trim(),
        notes: `[${list.name}] ${orderForm.notes}`.trim(),
        items: orderItems,
        total_amount: cartTotal,
        seller_user_id: userId,
        seller_username: profile?.username,
        status: 'pending',
      }])
      if (error) throw error
      setOrderSubmitted(true)
      setCart({})
    } catch (e) { alert('Could not submit: ' + e.message) }
    finally { setSubmitting(false) }
  }

  const NICHE_ICONS = { beauty: '💄', gas_station: '⛽', convenience: '🏪', grocery: '🛒', pharmacy: '💊' }

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8fafc' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
        <p style={{ color:'#64748b' }}>Loading...</p>
      </div>
    </div>
  )

  if (!list) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#f8fafc' }}>
      <div style={{ textAlign:'center', padding:32 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🔍</div>
        <h2 style={{ marginBottom:8 }}>Price list not found</h2>
        <p style={{ color:'#64748b', marginBottom:20 }}>This link may have expired or been removed.</p>
        <button onClick={() => navigate('/')} style={{ padding:'10px 24px', borderRadius:10, background:'#2563eb', color:'white', border:'none', cursor:'pointer', fontWeight:600 }}>
          Visit Kanz Supply →
        </button>
      </div>
    </div>
  )

  // Group items by category
  const grouped = {}
  items.forEach(item => {
    const cat = item.products?.category || 'Products'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  })

  return (
    <div style={{ fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif', background:'#f8fafc', minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#0f172a,#1e293b)', padding:'20px 20px 16px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
          <div>
            <p style={{ color:'rgba(255,255,255,0.5)', fontSize:11, fontWeight:600, letterSpacing:'0.05em', textTransform:'uppercase' }}>
              {NICHE_ICONS[list.niche]} {list.niche?.replace('_',' ')} price list
            </p>
            <h1 style={{ color:'white', fontWeight:900, fontSize:20, letterSpacing:'-0.5px', marginTop:2 }}>{list.name}</h1>
            {profile?.display_name && (
              <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12, marginTop:2 }}>by {profile.display_name}</p>
            )}
          </div>
          {cartCount > 0 && (
            <button onClick={() => setShowOrder(true)} style={{
              position:'relative', padding:'10px 16px', borderRadius:12,
              background:'linear-gradient(135deg,#f59e0b,#ef4444)',
              border:'none', color:'white', fontWeight:700, fontSize:14, cursor:'pointer',
              boxShadow:'0 4px 16px rgba(245,158,11,0.4)',
            }}>
              🛒 Order ({cartCount})
              <span style={{ display:'block', fontSize:11, fontWeight:600, opacity:0.9 }}>${cartTotal.toFixed(2)}</span>
            </button>
          )}
        </div>
      </div>

      {/* Products */}
      <div style={{ padding:'16px 16px 100px' }}>
        {items.length === 0 && (
          <div style={{ textAlign:'center', padding:48, color:'#94a3b8' }}>
            <p style={{ fontSize:40, marginBottom:12 }}>📦</p>
            <p>No products on this list yet.</p>
          </div>
        )}

        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat}>
            <p style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.1em', padding:'16px 0 8px' }}>{cat}</p>
            {catItems.map(item => {
              const p = item.products
              const qty = cart[item.id]?.qty || 0
              const img = p.image_url || p.images?.[0]
              return (
                <div key={item.id} style={{
                  background:'white', borderRadius:14, marginBottom:10, overflow:'hidden',
                  border:'1px solid #e2e8f0', boxShadow:'0 1px 4px rgba(0,0,0,0.04)',
                  display:'flex', alignItems:'stretch',
                }}>
                  {/* Image */}
                  <div style={{ width:88, flexShrink:0, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28 }}>
                    {img ? <img src={img} alt={p.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" /> : '📦'}
                  </div>
                  {/* Content */}
                  <div style={{ flex:1, padding:'12px 12px 12px 14px', display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ fontWeight:700, fontSize:15, color:'#0f172a', lineHeight:1.2 }}>{p.name}</p>
                      {p.brand && <p style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{p.brand}</p>}
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6 }}>
                        <p style={{ fontWeight:900, fontSize:19, color:'#0f172a' }}>${(item.custom_price||0).toFixed(2)}</p>
                        <p style={{ fontSize:11, color:'#94a3b8' }}>per {p.unit||'unit'}</p>
                      </div>
                      {p.price_min && p.price_max && (
                        <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:'#fef9c3', color:'#854d0e', fontWeight:700, border:'1px solid #fde68a', display:'inline-block', marginTop:4 }}>
                          🏷️ Retail ${p.price_min}–${p.price_max}
                        </span>
                      )}
                    </div>
                    {/* Qty control */}
                    {qty > 0 ? (
                      <div style={{ display:'flex', alignItems:'center', gap:0, flexShrink:0 }}>
                        <button onClick={() => setQty(item, qty-1)} style={{ width:32, height:32, borderRadius:'8px 0 0 8px', border:'1.5px solid #2563eb', background:'white', color:'#2563eb', fontWeight:700, fontSize:18, cursor:'pointer' }}>−</button>
                        <div style={{ width:36, height:32, display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid #2563eb', borderLeft:'none', borderRight:'none', fontWeight:700, fontSize:14 }}>{qty}</div>
                        <button onClick={() => setQty(item, qty+1)} style={{ width:32, height:32, borderRadius:'0 8px 8px 0', border:'1.5px solid #2563eb', background:'#2563eb', color:'white', fontWeight:700, fontSize:18, cursor:'pointer' }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => setQty(item, 1)} style={{
                        padding:'8px 14px', borderRadius:10, border:'1.5px solid #2563eb',
                        background:'white', color:'#2563eb', fontWeight:700, fontSize:13, cursor:'pointer', flexShrink:0,
                      }}>＋ Add</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Floating cart button */}
      {cartCount > 0 && !showOrder && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', zIndex:100 }}>
          <button onClick={() => setShowOrder(true)} style={{
            padding:'14px 32px', borderRadius:28, border:'none', cursor:'pointer',
            background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white',
            fontWeight:700, fontSize:15, boxShadow:'0 8px 24px rgba(37,99,235,0.4)',
            display:'flex', alignItems:'center', gap:10, whiteSpace:'nowrap',
          }}>
            🛒 Request Order · {cartCount} items · ${cartTotal.toFixed(2)}
          </button>
        </div>
      )}

      {/* Order modal */}
      {showOrder && !orderSubmitted && (
        <div className="modal-overlay" onClick={() => setShowOrder(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight:'90vh' }}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom:4 }}>Request This Order</h2>
            <p style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>{cartCount} items · ${cartTotal.toFixed(2)}</p>
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input className="form-input" value={orderForm.name} onChange={e => setOrderForm(f => ({...f, name: e.target.value}))} placeholder="Store or contact name" />
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input className="form-input" type="tel" value={orderForm.phone} onChange={e => setOrderForm(f => ({...f, phone: e.target.value}))} placeholder="+1 (555) 000-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">Address</label>
              <input className="form-input" value={orderForm.address} onChange={e => setOrderForm(f => ({...f, address: e.target.value}))} placeholder="Delivery address" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={orderForm.notes} onChange={e => setOrderForm(f => ({...f, notes: e.target.value}))} placeholder="Any special requests..." style={{ minHeight:60 }} />
            </div>
            <button onClick={submitOrder} disabled={submitting || !orderForm.name.trim() || !orderForm.phone.trim()}
              style={{ width:'100%', padding:'14px', borderRadius:12, border:'none', background: submitting ? '#94a3b8' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'white', fontWeight:700, fontSize:16, cursor:'pointer' }}>
              {submitting ? '⏳ Sending...' : '✅ Submit Order Request'}
            </button>
          </div>
        </div>
      )}

      {/* Confirmation */}
      {orderSubmitted && (
        <div className="modal-overlay">
          <div className="modal-sheet" style={{ textAlign:'center', padding:'32px 24px' }}>
            <div style={{ fontSize:56, marginBottom:16 }}>✅</div>
            <h2 style={{ marginBottom:8 }}>Order Sent!</h2>
            <p style={{ color:'#64748b', marginBottom:24 }}>Your rep will contact you shortly to confirm.</p>
            <button onClick={() => setOrderSubmitted(false)} style={{ padding:'12px 32px', borderRadius:12, background:'#2563eb', color:'white', border:'none', fontWeight:700, cursor:'pointer' }}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}
