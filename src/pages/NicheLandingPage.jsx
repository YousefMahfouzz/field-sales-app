import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function NicheLandingPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [list, setList] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const load = async () => {
      // Get the price list
      const { data: listData } = await supabase
        .from('price_lists').select('*').eq('slug', slug).eq('is_public', true).eq('is_active', true).single()
      if (!listData) { setNotFound(true); setLoading(false); return }
      setList(listData)

      // Get items with product details
      const { data: itemData } = await supabase
        .from('price_list_items')
        .select(`*, product:products(id, name, description, image_url, images, brand, category, unit)`)
        .eq('price_list_id', listData.id).eq('is_active', true).order('display_order')
      setItems((itemData || []).filter(i => i.product))
      setLoading(false)
    }
    load()
  }, [slug])

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ color:'rgba(255,255,255,0.4)', fontSize:16 }}>Loading...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'white', fontFamily:'system-ui' }}>
      <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
      <p style={{ fontSize:20, fontWeight:700, marginBottom:8 }}>Price list not found</p>
      <p style={{ color:'rgba(255,255,255,0.4)', marginBottom:24 }}>This link may have expired or been made private.</p>
      <button onClick={() => navigate('/')} style={{ padding:'12px 28px', borderRadius:12, background:'white', color:'black', fontWeight:700, border:'none', cursor:'pointer' }}>Go Home</button>
    </div>
  )

  const color = list.banner_color || '#2563eb'
  const grouped = {}
  items.forEach(item => {
    const product = item.product
    if (!product) return
    const cat = product.category || 'Products'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push({ item, product })
  })

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Nav */}
      <nav style={{ position:'sticky', top:0, zIndex:100, padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(10,10,10,0.9)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <button onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:8, background:'none', border:'none', color:'white', cursor:'pointer' }}>
          <div style={{ width:28, height:28, background:`linear-gradient(135deg, ${color}, ${color}88)`, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🛒</div>
          <span style={{ fontWeight:800, fontSize:16 }}>Kanz Supply</span>
        </button>
        <button onClick={() => navigate('/login')} style={{ padding:'8px 20px', borderRadius:20, border:'none', cursor:'pointer', background:color, color:'white', fontWeight:700, fontSize:13 }}>Login →</button>
      </nav>

      {/* Hero banner */}
      <div style={{ padding:'60px 24px 48px', background:`linear-gradient(180deg, ${color}22 0%, transparent 100%)`, borderBottom:`1px solid ${color}22` }}>
        <div style={{ maxWidth:700, margin:'0 auto', textAlign:'center' }}>
          <div style={{ display:'inline-block', padding:'5px 14px', borderRadius:16, background:`${color}25`, border:`1px solid ${color}55`, fontSize:12, color:color, fontWeight:700, letterSpacing:'0.5px', marginBottom:18, textTransform:'uppercase' }}>
            {list.niche || 'Wholesale Price List'}
          </div>
          <h1 style={{ fontSize:'clamp(28px, 5vw, 52px)', fontWeight:900, lineHeight:1.1, marginBottom:16, letterSpacing:'-1.5px' }}>{list.name}</h1>
          {list.description && <p style={{ color:'rgba(255,255,255,0.5)', fontSize:17, lineHeight:1.7, maxWidth:520, margin:'0 auto 28px' }}>{list.description}</p>}
          <button onClick={() => navigate('/login')} style={{ padding:'13px 32px', borderRadius:12, border:'none', cursor:'pointer', background:color, color:'white', fontWeight:700, fontSize:15, boxShadow:`0 8px 24px ${color}44` }}>
            Login to Order →
          </button>
        </div>
      </div>

      {/* Products */}
      <div style={{ maxWidth:1100, margin:'0 auto', padding:'48px 24px 80px' }}>
        {Object.entries(grouped).map(([cat, catItems]) => (
          <div key={cat} style={{ marginBottom:48 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
              <h2 style={{ fontSize:20, fontWeight:800 }}>{cat}</h2>
              <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>{catItems.length} products</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:20 }}>
              {catItems.map(({ item, product }, i) => {
                const hasPrice = item.custom_price > 0
                const hasRange = item.custom_price_min > 0 && item.custom_price_max > 0
                return (
                  <div key={item.id} onClick={() => setSelected({ item, product })}
                    style={{ background:'rgba(255,255,255,0.04)', borderRadius:18, border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden', cursor:'pointer', transition:'all 0.25s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=`${color}55` }}
                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)' }}
                  >
                    <div style={{ width:'100%', paddingTop:'60%', position:'relative', background:'rgba(255,255,255,0.03)' }}>
                      {product.image_url
                        ? <img src={product.image_url} alt={product.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
                        : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:44 }}>📦</div>
                      }
                    </div>
                    <div style={{ padding:'16px 18px 20px' }}>
                      {product.brand && <p style={{ fontSize:10, color:`${color}cc`, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:5 }}>{product.brand}</p>}
                      <p style={{ fontWeight:800, fontSize:16, marginBottom:8, lineHeight:1.3 }}>{product.name}</p>
                      {product.description && <p style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.5, marginBottom:10, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{product.description}</p>}
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10 }}>
                        {hasPrice
                          ? <span style={{ fontWeight:800, fontSize:17, color:color }}>${item.custom_price}/{product.unit || 'unit'}</span>
                          : <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>Login for pricing</span>
                        }
                        {hasRange && <span style={{ fontSize:11, background:`${color}20`, color:color, borderRadius:10, padding:'2px 8px', fontWeight:700 }}>${item.custom_price_min}–${item.custom_price_max}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'60px 24px', textAlign:'center' }}>
        <h2 style={{ fontSize:28, fontWeight:800, marginBottom:12 }}>Ready to place an order?</h2>
        <p style={{ color:'rgba(255,255,255,0.4)', marginBottom:28 }}>Log in to access wholesale pricing and submit your order.</p>
        <button onClick={() => navigate('/login')} style={{ padding:'15px 36px', borderRadius:12, border:'none', cursor:'pointer', background:color, color:'white', fontWeight:700, fontSize:16, boxShadow:`0 8px 28px ${color}44` }}>
          Login to Order →
        </button>
      </div>

      <div style={{ borderTop:'1px solid rgba(255,255,255,0.05)', padding:'24px', textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:12 }}>
        © 2026 Kanz Supply
      </div>

      {/* Product modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(10px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#111', borderRadius:24, maxWidth:540, width:'100%', overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)', maxHeight:'90vh', overflowY:'auto' }}>
            {selected.product.image_url && (
              <div style={{ width:'100%', paddingTop:'50%', position:'relative' }}>
                <img src={selected.product.image_url} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            )}
            <div style={{ padding:26 }}>
              {selected.product.brand && <p style={{ fontSize:11, color:color, fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>{selected.product.brand}</p>}
              <h2 style={{ fontSize:24, fontWeight:900, marginBottom:10 }}>{selected.product.name}</h2>
              {selected.product.description && <p style={{ color:'rgba(255,255,255,0.6)', lineHeight:1.7, marginBottom:18, fontSize:14 }}>{selected.product.description}</p>}
              {(selected.item.custom_price > 0 || (selected.item.custom_price_min > 0 && selected.item.custom_price_max > 0)) && (
                <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'14px 18px', marginBottom:18, display:'flex', gap:20, flexWrap:'wrap' }}>
                  {selected.item.custom_price > 0 && (
                    <div>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:2 }}>Wholesale Price</p>
                      <p style={{ fontWeight:900, fontSize:22, color:color }}>${selected.item.custom_price}<span style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>/{selected.product.unit || 'unit'}</span></p>
                    </div>
                  )}
                  {selected.item.custom_price_min > 0 && (
                    <div>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:2 }}>Retail Range</p>
                      <p style={{ fontWeight:800, fontSize:17 }}>${selected.item.custom_price_min} – ${selected.item.custom_price_max}</p>
                    </div>
                  )}
                </div>
              )}
              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => navigate('/login')} style={{ flex:1, padding:'13px', borderRadius:10, border:'none', cursor:'pointer', background:color, color:'white', fontWeight:700, fontSize:15 }}>Order Now →</button>
                <button onClick={() => setSelected(null)} style={{ padding:'13px 18px', borderRadius:10, border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', background:'transparent', color:'white', fontWeight:600 }}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`* { box-sizing: border-box }`}</style>
    </div>
  )
}
