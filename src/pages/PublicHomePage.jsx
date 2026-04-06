import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PublicHomePage() {
  const navigate = useNavigate()
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [logo, setLogo] = useState(null)

  useEffect(() => {
    // Load featured products
    supabase.from('homepage_featured')
      .select('id, display_order, product:products(id, name, description, image_url, images, brand, category)')
      .eq('is_active', true).order('display_order')
      .then(({ data }) => {
        setFeatured((data || []).map(f => f.product).filter(Boolean))
        setLoading(false)
      })
    // Load logo
    supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
      .then(({ data }) => { if (data?.value) setLogo(data.value) })
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Nav — Login only in corner */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'0 24px', height:64, display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(10,10,10,0.85)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {logo
            ? <img src={logo} alt="Kanz Supply" style={{ height:38, width:'auto', borderRadius:6, objectFit:'contain' }} />
            : <>
                <div style={{ width:32, height:32, background:'linear-gradient(135deg,#6366f1,#2563eb)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🛒</div>
                <span style={{ fontWeight:800, fontSize:18, letterSpacing:'-0.5px' }}>Kanz Supply</span>
              </>
          }
        </div>
        <button onClick={() => navigate('/login')}
          style={{ padding:'10px 24px', borderRadius:24, border:'none', cursor:'pointer', background:'linear-gradient(135deg,#6366f1,#2563eb)', color:'white', fontWeight:700, fontSize:14, letterSpacing:'0.3px', boxShadow:'0 4px 15px rgba(99,102,241,0.4)' }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(99,102,241,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 4px 15px rgba(99,102,241,0.4)' }}>
          Login →
        </button>
      </nav>

      {/* Hero — no login button here, just scroll to products */}
      <div style={{ paddingTop:140, paddingBottom:80, textAlign:'center', padding:'140px 24px 80px' }}>
        <div style={{ display:'inline-block', padding:'6px 16px', borderRadius:20, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', marginBottom:24, fontSize:13, color:'#a5b4fc', fontWeight:600, letterSpacing:'0.5px' }}>
          WHOLESALE DISTRIBUTION
        </div>
        <h1 style={{ fontSize:'clamp(36px, 6vw, 72px)', fontWeight:900, lineHeight:1.1, marginBottom:20, letterSpacing:'-2px', background:'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Premium Products.<br/>Stocked for Your Store.
        </h1>
        <p style={{ fontSize:'clamp(16px, 2vw, 20px)', color:'rgba(255,255,255,0.5)', maxWidth:520, margin:'0 auto 40px', lineHeight:1.7 }}>
          Top-selling wholesale products for beauty supply stores, gas stations, convenience stores and more — delivered to your door.
        </p>
        <button onClick={() => document.getElementById('products').scrollIntoView({ behavior:'smooth' })}
          style={{ padding:'14px 32px', borderRadius:12, border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', background:'rgba(255,255,255,0.05)', color:'white', fontWeight:600, fontSize:16 }}>
          View Products ↓
        </button>
      </div>

      {/* Products */}
      <div id="products" style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px 100px' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <h2 style={{ fontSize:'clamp(28px, 4vw, 44px)', fontWeight:800, marginBottom:12, letterSpacing:'-1px' }}>Our Products</h2>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:16 }}>Wholesale-priced products your customers already want</p>
        </div>

        {loading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:24 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background:'rgba(255,255,255,0.04)', borderRadius:20, height:360, animation:'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {!loading && featured.length === 0 && (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📦</div>
            <p style={{ fontSize:18 }}>Products coming soon</p>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:28 }}>
          {featured.map((product, i) => (
            <div key={product.id} onClick={() => setSelected(product)}
              style={{ background:'rgba(255,255,255,0.04)', borderRadius:20, border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden', cursor:'pointer', transition:'all 0.3s', animation:`fadeUp 0.5s ease ${i*0.08}s both` }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.border='1px solid rgba(99,102,241,0.4)'; e.currentTarget.style.background='rgba(255,255,255,0.07)' }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.border='1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background='rgba(255,255,255,0.04)' }}>
              <div style={{ width:'100%', paddingTop:'65%', position:'relative', background:'rgba(255,255,255,0.03)', overflow:'hidden' }}>
                {product.image_url
                  ? <img src={product.image_url} alt={product.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} loading="lazy" />
                  : <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:56 }}>
                      {product.category?.includes('Hair') ? '💇' : product.category?.includes('Lighter') ? '🔥' : product.category?.includes('Incense') ? '🕯️' : product.category?.includes('Honey') ? '🍯' : product.category?.includes('Fragrance') ? '✨' : '📦'}
                    </div>
                }
              </div>
              <div style={{ padding:'20px 22px 24px' }}>
                {product.brand && <p style={{ fontSize:11, color:'rgba(99,102,241,0.8)', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:6 }}>{product.brand}</p>}
                <h3 style={{ fontSize:18, fontWeight:800, marginBottom:8, color:'white', lineHeight:1.3 }}>{product.name}</h3>
                {product.description && <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.6, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>{product.description}</p>}
                <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.06)' }} />
                  <span style={{ fontSize:12, color:'rgba(255,255,255,0.25)', whiteSpace:'nowrap' }}>Login for pricing →</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'32px 24px', textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:13 }}>
        © 2026 Kanz Supply · Premium Wholesale Distribution
      </div>

      {/* Product modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:24, backdropFilter:'blur(10px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#111', borderRadius:24, maxWidth:560, width:'100%', overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)' }}>
            {selected.image_url && (
              <div style={{ width:'100%', paddingTop:'50%', position:'relative' }}>
                <img src={selected.image_url} alt={selected.name} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
              </div>
            )}
            <div style={{ padding:28 }}>
              {selected.brand && <p style={{ fontSize:11, color:'#818cf8', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', marginBottom:8 }}>{selected.brand}</p>}
              <h2 style={{ fontSize:26, fontWeight:900, marginBottom:12, color:'white' }}>{selected.name}</h2>
              {selected.description && <p style={{ color:'rgba(255,255,255,0.6)', lineHeight:1.7, marginBottom:20 }}>{selected.description}</p>}
              <div style={{ background:'rgba(255,255,255,0.05)', borderRadius:12, padding:'14px 18px', marginBottom:20, border:'1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>💡 Contact your Kanz Supply rep to place an order for this product.</p>
              </div>
              <button onClick={() => setSelected(null)} style={{ width:'100%', padding:'13px', borderRadius:10, border:'1px solid rgba(255,255,255,0.15)', cursor:'pointer', background:'transparent', color:'white', fontWeight:600, fontSize:15 }}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:0.4 } 50% { opacity:0.7 } }
        * { box-sizing: border-box }
      `}</style>
    </div>
  )
}
