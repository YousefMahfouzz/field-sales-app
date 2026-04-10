import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PublicHomePage() {
  const navigate = useNavigate()
  const [featured, setFeatured] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [logo, setLogo] = useState(null)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [showInquiry, setShowInquiry] = useState(false)

  useEffect(() => {
    document.body.classList.add('pricelist-page')
    return () => document.body.classList.remove('pricelist-page')
  }, [])

  useEffect(() => {
    // Load featured products
    supabase.from('homepage_featured')
      .select('id, sort_order, product:products(id, name, description, image_url, images, brand, category)')
      .eq('is_active', true).order('sort_order')
      .then(({ data }) => {
        setFeatured((data || []).map(f => f.product).filter(Boolean))
        setLoading(false)
      })
    // Load logo
    supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
      .then(({ data }) => { if (data?.value) setLogo(data.value) })
  }, [])

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'white', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', width:'100%', overflowX:'hidden' }}>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.7; }
          50% { transform: translateY(8px); opacity: 1; }
        }
      `}</style>

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
      <div style={{ padding:'clamp(100px,12vh,160px) clamp(16px,5vw,80px) clamp(40px,6vh,80px)', textAlign:'center' }}>
        <div style={{ display:'inline-block', padding:'6px 16px', borderRadius:20, background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', marginBottom:24, fontSize:13, color:'#a5b4fc', fontWeight:600, letterSpacing:'0.5px' }}>
          WHOLESALE DISTRIBUTION
        </div>
        <h1 style={{ fontSize:'clamp(28px, 5vw, 72px)', fontWeight:900, lineHeight:1.1, marginBottom:20, letterSpacing:'-2px', background:'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          Premium Products.<br/>Stocked for Your Store.
        </h1>
        <p style={{ fontSize:'clamp(16px, 2vw, 20px)', color:'rgba(255,255,255,0.5)', maxWidth:520, margin:'0 auto 40px', lineHeight:1.7 }}>
          Top-selling wholesale products for beauty supply stores, gas stations, convenience stores and more — delivered to your door.
        </p>
        <div style={{ maxWidth:480, margin:'0 auto', position:'relative' }}
          onClick={() => document.getElementById('products').scrollIntoView({ behavior:'smooth' })}>
          <span style={{ position:'absolute', left:18, top:'50%', transform:'translateY(-50%)', fontSize:18, pointerEvents:'none' }}>🔍</span>
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); document.getElementById('products').scrollIntoView({ behavior:'smooth' }) }}
            onClick={e => e.stopPropagation()}
            style={{
              width:'100%', padding:'16px 20px 16px 52px',
              borderRadius:40, border:'1.5px solid rgba(255,255,255,0.15)',
              background:'rgba(255,255,255,0.07)', color:'white', fontSize:16,
              outline:'none', backdropFilter:'blur(10px)',
              boxShadow:'0 4px 24px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        {/* ↓ Price list CTA arrow */}
        <div style={{ marginTop:40, display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer' }}
          onClick={() => document.getElementById('contact').scrollIntoView({ behavior:'smooth' })}>
          <p style={{ color:'rgba(255,255,255,0.45)', fontSize:14, fontWeight:500, letterSpacing:'0.3px' }}>
            Looking for a custom price list?
          </p>
          <svg
            width="44" height="44" viewBox="0 0 28 28" fill="none"
            style={{ animation:'bounce 1.6s ease-in-out infinite' }}>
            <path d="M14 4 L14 22 M6 15 L14 23 L22 15"
              stroke="rgba(99,102,241,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Products */}
      <div id="products" style={{ maxWidth:1400, margin:'0 auto', padding:'0 clamp(12px,4vw,48px) 100px' }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <h2 style={{ fontSize:'clamp(28px, 4vw, 44px)', fontWeight:800, marginBottom:12, letterSpacing:'-1px' }}>Our Products</h2>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:16 }}>
            {search
              ? `${featured.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())).length} results for "${search}"`
              : 'Wholesale-priced products your customers already want'}
          </p>
        </div>

        {/* Category filter pills */}
        {!loading && featured.length > 0 && (() => {
          const cats = ['All', ...new Set(featured.map(p => p.category).filter(Boolean))]
          if (cats.length <= 2) return null
          return (
            <div style={{ display:'flex', gap:8, overflowX:'auto', scrollbarWidth:'none', marginBottom:40, paddingBottom:4, justifyContent:'center', flexWrap:'wrap' }}>
              {cats.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                  padding:'7px 18px', borderRadius:24, border:'1.5px solid', cursor:'pointer',
                  fontSize:13, fontWeight:600, flexShrink:0, transition:'all 0.15s',
                  borderColor: activeCategory===cat ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.15)',
                  background: activeCategory===cat ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: activeCategory===cat ? 'white' : 'rgba(255,255,255,0.45)',
                }}>{cat}</button>
              ))}
            </div>
          )
        })()}

        {/* Loading skeletons */}
        {loading && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap:'clamp(12px,2vw,28px)' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ background:'rgba(255,255,255,0.04)', borderRadius:20, height:360, animation:'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && featured.length === 0 && (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📦</div>
            <p style={{ fontSize:18 }}>Products coming soon</p>
          </div>
        )}

        {/* Products grouped by category */}
        {!loading && featured.length > 0 && (() => {
          const filteredAll = featured.filter(p =>
            (!search ||
              p.name?.toLowerCase().includes(search.toLowerCase()) ||
              p.brand?.toLowerCase().includes(search.toLowerCase()) ||
              p.category?.toLowerCase().includes(search.toLowerCase())
            ) &&
            (activeCategory === 'All' || p.category === activeCategory)
          )
          const usedCats = activeCategory !== 'All'
            ? [activeCategory]
            : [...new Set(filteredAll.map(p => p.category || 'Other'))]

          return usedCats.map(cat => {
            const catProducts = filteredAll.filter(p => (p.category || 'Other') === cat)
            if (!catProducts.length) return null
            return (
              <div key={cat} style={{ marginBottom:56 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:28 }}>
                  <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.1)' }} />
                  <h3 style={{ fontSize:'clamp(13px,1.8vw,16px)', fontWeight:800, color:'rgba(255,255,255,0.6)', letterSpacing:'0.08em', textTransform:'uppercase', whiteSpace:'nowrap' }}>{cat}</h3>
                  <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.1)' }} />
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap:'clamp(12px,2vw,28px)' }}>
                  {catProducts.map((product, i) => (
                    <div
                      key={product.id}
                      onClick={() => setSelected(product)}
                      style={{
                        background:'rgba(255,255,255,0.04)', borderRadius:20,
                        border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden',
                        cursor:'pointer', transition:'all 0.3s',
                        animation: `fadeUp 0.5s ease ${i*0.06}s both`,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.border='1px solid rgba(99,102,241,0.4)'; e.currentTarget.style.background='rgba(255,255,255,0.07)' }}
                      onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.border='1px solid rgba(255,255,255,0.08)'; e.currentTarget.style.background='rgba(255,255,255,0.04)' }}
                    >
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
                          <span style={{ fontSize:12, color:'rgba(255,255,255,0.25)', whiteSpace:'nowrap' }}>Contact rep for pricing →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        })()}
      </div>

            {/* Footer */}
      {/* Contact CTA */}
      <div id="contact" style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'48px 24px', textAlign:'center' }}>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, marginBottom:20 }}>
          Interested in carrying our products in your store?
        </p>
        <button onClick={() => setShowInquiry(true)} style={{
          padding:'16px 36px', borderRadius:14, border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#6366f1,#2563eb)', color:'white',
          fontWeight:800, fontSize:17, boxShadow:'0 8px 28px rgba(99,102,241,0.45)',
          letterSpacing:'0.2px', transition:'all 0.2s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 36px rgba(99,102,241,0.55)' }}
          onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 8px 28px rgba(99,102,241,0.45)' }}>
          ✉️ Email Us for a Price List
        </button>
        <p style={{ color:'rgba(255,255,255,0.2)', fontSize:12, marginTop:16 }}>
          © 2026 Kanz Supply · Premium Wholesale Distribution
        </p>
      </div>

      {/* Inquiry popup */}
      {showInquiry && (
        <div onClick={() => setShowInquiry(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20, backdropFilter:'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background:'#111', borderRadius:24, maxWidth:480, width:'100%', border:'1px solid rgba(255,255,255,0.12)', overflow:'hidden' }}>
            {/* Header */}
            <div style={{ background:'linear-gradient(135deg,#6366f1,#2563eb)', padding:'28px 28px 24px' }}>
              <p style={{ color:'white', fontWeight:900, fontSize:22, marginBottom:6 }}>Get Our Price List</p>
              <p style={{ color:'rgba(255,255,255,0.75)', fontSize:14, lineHeight:1.6 }}>
                Send us your store details and we'll get back to you with our full wholesale catalog and pricing.
              </p>
            </div>
            {/* Body */}
            <div style={{ padding:'24px 28px 28px' }}>
              <div style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'14px 16px', marginBottom:20 }}>
                <p style={{ color:'rgba(255,255,255,0.5)', fontSize:13, lineHeight:1.7 }}>
                  📋 <strong style={{ color:'rgba(255,255,255,0.8)' }}>Please include in your email:</strong><br/>
                  • <strong style={{ color:'white' }}>Store name</strong><br/>
                  • <strong style={{ color:'white' }}>Store address</strong><br/>
                  • <strong style={{ color:'white' }}>Type of business</strong> (beauty supply, gas station, convenience store, etc.)
                </p>
              </div>
              <a href="mailto:orders@kanzsupply.com?subject=Price List Request&body=Store Name: %0AStore Address: %0AType of Business: %0A%0AAdditional Notes: "
                onClick={() => setShowInquiry(false)}
                style={{
                  display:'block', width:'100%', padding:'15px', borderRadius:12, border:'none',
                  background:'linear-gradient(135deg,#6366f1,#2563eb)', color:'white',
                  fontWeight:800, fontSize:16, textAlign:'center', textDecoration:'none',
                  boxShadow:'0 6px 20px rgba(99,102,241,0.4)', boxSizing:'border-box',
                }}>
                📧 Open Email App
              </a>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:12, textAlign:'center', marginTop:12 }}>
                orders@kanzsupply.com
              </p>
              <button onClick={() => setShowInquiry(false)} style={{ width:'100%', marginTop:8, padding:'12px', borderRadius:12, border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:14, cursor:'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13 }}>💡 Contact your Kanz Supply rep for pricing and to place an order.</p>
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
