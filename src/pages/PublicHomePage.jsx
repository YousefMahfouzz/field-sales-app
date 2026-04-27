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
  const [emailCopied, setEmailCopied] = useState(false)

  useEffect(() => {
    document.body.classList.add('pricelist-page')
    return () => document.body.classList.remove('pricelist-page')
  }, [])

  useEffect(() => {
    supabase.from('homepage_featured')
      .select('id, sort_order, product:products(id, name, description, image_url, images, brand, category)')
      .eq('is_active', true).order('sort_order')
      .then(({ data }) => {
        setFeatured((data || []).map(f => f.product).filter(Boolean))
        setLoading(false)
      })
    supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
      .then(({ data }) => { if (data?.value) setLogo(data.value) })
  }, [])

  const copyEmail = () => {
    navigator.clipboard?.writeText('orders@kanzsupply.com')
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  const GOLD = '#d4a843'
  const GOLD_LIGHT = '#f0d078'
  const GOLD_DEEP = '#b8860b'

  return (
    <div className="kanz-public-home" style={{ minHeight: '100vh', color: 'white', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', width: '100%', overflowX: 'hidden', position: 'relative' }}>
      <style>{`
        .kanz-public-home {
          background: linear-gradient(-45deg, #0a0a0a, #111108, #0d0b00, #0a0a0a);
          background-size: 400% 400%;
          animation: gradientShift 18s ease infinite;
        }
        .kanz-public-home::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: radial-gradient(ellipse at 20% 50%, rgba(212,168,67,0.05) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 20%, rgba(184,134,11,0.04) 0%, transparent 50%),
                      radial-gradient(ellipse at 50% 80%, rgba(240,208,120,0.03) 0%, transparent 50%);
        }
        @keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes floatBlob { 0%, 100% { transform: translate(0, 0) scale(1); } 33% { transform: translate(30px, -20px) scale(1.1); } 66% { transform: translate(-20px, 15px) scale(0.95); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); opacity: 0.7; } 50% { transform: translateY(8px); opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.4 } 50% { opacity: 0.7 } }
        .kanz-card { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
        .kanz-card:hover {
          transform: translateY(-6px);
          border: 1px solid rgba(212,168,67,0.3) !important;
          background: rgba(212,168,67,0.04) !important;
          box-shadow: 0 16px 48px rgba(212,168,67,0.18);
        }
        .kanz-card:hover img { transform: scale(1.06); }
        .kanz-card img { transition: transform 0.4s ease; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; pointer-events: none; }
        .kanz-img-wrap { position: relative; overflow: hidden; }
        .kanz-img-wrap::after { content: ''; position: absolute; inset: 0; z-index: 2; background: transparent; }
        .kanz-search:focus { outline: none !important; border-color: ${GOLD} !important; box-shadow: 0 0 0 4px rgba(212,168,67,0.15) !important; }
        .kanz-pill { transition: all 0.2s ease; }
        .kanz-pill:hover { transform: translateY(-1px); }
        .kanz-pill:active { transform: scale(0.96); }
        .kanz-cta-btn { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
        .kanz-cta-btn:hover { transform: translateY(-2px); box-shadow: 0 16px 48px rgba(212,168,67,0.5) !important; }
        .kanz-cta-btn:active { transform: translateY(0); }
        * { box-sizing: border-box; }
      `}</style>

      {/* Floating animated blobs */}
      <div style={{ position: 'fixed', top: 80, right: -100, width: 400, height: 400, borderRadius: '50%', background: 'rgba(212,168,67,0.08)', filter: 'blur(80px)', animation: 'floatBlob 14s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', top: '40%', left: -120, width: 320, height: 320, borderRadius: '50%', background: 'rgba(184,134,11,0.07)', filter: 'blur(70px)', animation: 'floatBlob 18s ease-in-out infinite reverse', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: 100, right: '30%', width: 260, height: 260, borderRadius: '50%', background: 'rgba(240,208,120,0.05)', filter: 'blur(60px)', animation: 'floatBlob 16s ease-in-out infinite 3s', pointerEvents: 'none', zIndex: 0 }} />

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(10,10,10,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(212,168,67,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {logo
            ? <img src={logo} alt="Kanz Supply" draggable="false" onContextMenu={e => e.preventDefault()} style={{ height: 38, width: 'auto', borderRadius: 6, objectFit: 'contain' }} />
            : <>
                <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: '#0a0a0a', fontWeight: 900 }}>K</div>
                <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px', color: GOLD_LIGHT }}>Kanz Supply</span>
              </>
          }
        </div>
        <button onClick={() => navigate('/login')} className="kanz-cta-btn"
          style={{ padding: '10px 24px', borderRadius: 24, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: '#0a0a0a', fontWeight: 800, fontSize: 14, letterSpacing: '0.3px', boxShadow: '0 4px 15px rgba(212,168,67,0.35)' }}>
          Login →
        </button>
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 1, padding: 'clamp(100px,12vh,160px) clamp(16px,5vw,80px) clamp(40px,6vh,80px)', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', padding: '7px 18px', borderRadius: 20, background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.25)', marginBottom: 24, fontSize: 12, color: GOLD_LIGHT, fontWeight: 700, letterSpacing: '1.5px' }}>
          ✦ WHOLESALE DISTRIBUTION ✦
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 5.5vw, 76px)', fontWeight: 900, lineHeight: 1.05, marginBottom: 22, letterSpacing: '-2px',
          background: `linear-gradient(90deg, #fff 0%, ${GOLD_LIGHT} 30%, ${GOLD} 50%, ${GOLD_LIGHT} 70%, #fff 100%)`,
          backgroundSize: '200% auto',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          animation: 'shimmer 6s linear infinite',
        }}>
          Premium Products.<br/>Stocked for Your Store.
        </h1>

        <p style={{ fontSize: 'clamp(15px, 2vw, 19px)', color: 'rgba(255,255,255,0.55)', maxWidth: 540, margin: '0 auto 36px', lineHeight: 1.7 }}>
          Top-selling wholesale products for beauty supply stores, gas stations, convenience stores and more — delivered fast across Louisiana, Mississippi, and Texas.
        </p>

        {/* Trust badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
          {[
            { icon: '⭐', text: 'Family Owned' },
            { icon: '📍', text: 'Louisiana Based' },
            { icon: '🚚', text: 'Free Delivery' },
            { icon: '💎', text: 'Competitive Pricing' },
          ].map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(212,168,67,0.15)', fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              <span>{b.icon}</span>{b.text}
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}
          onClick={() => document.getElementById('products').scrollIntoView({ behavior: 'smooth' })}>
          <span style={{ position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%)', fontSize: 18, pointerEvents: 'none' }}>🔍</span>
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); document.getElementById('products').scrollIntoView({ behavior: 'smooth' }) }}
            onClick={e => e.stopPropagation()}
            className="kanz-search"
            style={{
              width: '100%', padding: '16px 20px 16px 52px',
              borderRadius: 40, border: '1.5px solid rgba(212,168,67,0.2)',
              background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: 16,
              outline: 'none', backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
            }}
          />
        </div>

        {/* Stats strip */}
        {!loading && featured.length > 0 && (
          <div style={{ marginTop: 30, display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0, background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.15)', borderRadius: 40, padding: '8px 4px' }}>
            {[
              { val: featured.length, label: 'Products' },
              { val: new Set(featured.map(p => p.category).filter(Boolean)).size, label: 'Categories' },
              { val: '3', label: 'States Served' },
            ].map((s, i, arr) => (
              <div key={i} style={{ padding: '8px 24px', borderRight: i < arr.length - 1 ? '1px solid rgba(212,168,67,0.15)' : 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: GOLD_LIGHT, fontWeight: 900, fontSize: 18 }}>{s.val}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer' }}
          onClick={() => document.getElementById('contact').scrollIntoView({ behavior: 'smooth' })}>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 500, letterSpacing: '0.3px' }}>
            Looking for a custom price list?
          </p>
          <svg width="44" height="44" viewBox="0 0 28 28" fill="none" style={{ animation: 'bounce 1.6s ease-in-out infinite' }}>
            <path d="M14 4 L14 22 M6 15 L14 23 L22 15"
              stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      {/* Products section */}
      <div id="products" style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto', padding: '0 clamp(12px,4vw,48px) 100px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 900, marginBottom: 12, letterSpacing: '-1px', color: 'white' }}>Our Products</h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 16 }}>
            {search
              ? `${featured.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.brand?.toLowerCase().includes(search.toLowerCase()) || p.category?.toLowerCase().includes(search.toLowerCase())).length} results for "${search}"`
              : 'Wholesale-priced products your customers already want'}
          </p>
        </div>

        {!loading && featured.length > 0 && (() => {
          const cats = ['All', ...new Set(featured.map(p => p.category).filter(Boolean))]
          if (cats.length <= 2) return null
          return (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 40, paddingBottom: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
              {cats.map(cat => {
                const active = activeCategory === cat
                return (
                  <button key={cat} className="kanz-pill" onClick={() => setActiveCategory(cat)} style={{
                    padding: '7px 18px', borderRadius: 24, cursor: 'pointer',
                    fontSize: 13, fontWeight: active ? 800 : 600, flexShrink: 0,
                    border: active ? 'none' : '1px solid rgba(212,168,67,0.2)',
                    background: active ? `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})` : 'rgba(255,255,255,0.04)',
                    color: active ? '#0a0a0a' : 'rgba(255,255,255,0.5)',
                    boxShadow: active ? `0 4px 16px rgba(212,168,67,0.4)` : 'none',
                  }}>{cat}</button>
                )
              })}
            </div>
          )
        })()}

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 'clamp(12px,2vw,28px)' }}>
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} style={{ background: 'rgba(212,168,67,0.04)', borderRadius: 20, height: 360, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        )}

        {!loading && featured.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <p style={{ fontSize: 18 }}>Products coming soon</p>
          </div>
        )}

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
              <div key={cat} style={{ marginBottom: 56 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                  <div style={{ height: 1, flex: 1, background: 'rgba(212,168,67,0.15)' }} />
                  <h3 style={{ fontSize: 'clamp(13px,1.8vw,16px)', fontWeight: 800, color: GOLD_LIGHT, letterSpacing: '0.12em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{cat}</h3>
                  <div style={{ height: 1, flex: 1, background: 'rgba(212,168,67,0.15)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px,100%), 1fr))', gap: 'clamp(12px,2vw,28px)' }}>
                  {catProducts.map((product, i) => (
                    <div
                      key={product.id}
                      className="kanz-card"
                      onClick={() => setSelected(product)}
                      onContextMenu={e => e.preventDefault()}
                      style={{
                        background: 'rgba(255,255,255,0.04)', borderRadius: 20,
                        border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden',
                        cursor: 'pointer',
                        animation: `fadeUp 0.5s ease ${i * 0.06}s both`,
                      }}
                    >
                      <div className="kanz-img-wrap" style={{ width: '100%', paddingTop: '65%', position: 'relative', background: 'rgba(255,255,255,0.03)' }}>
                        {product.image_url
                          ? <img src={product.image_url} alt={product.name} draggable="false" onContextMenu={e => e.preventDefault()} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                          : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
                              {product.category?.includes('Hair') ? '💇' : product.category?.includes('Lighter') ? '🔥' : product.category?.includes('Incense') ? '🕯️' : product.category?.includes('Honey') ? '🍯' : product.category?.includes('Fragrance') ? '✨' : '📦'}
                            </div>
                        }
                      </div>
                      <div style={{ padding: '20px 22px 22px' }}>
                        {product.brand && <p style={{ fontSize: 11, color: GOLD_LIGHT, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>{product.brand}</p>}
                        <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, color: 'white', lineHeight: 1.3 }}>{product.name}</h3>
                        {product.description && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.description}</p>}
                        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 1, background: 'rgba(212,168,67,0.1)' }} />
                          <span style={{ fontSize: 12, color: GOLD, fontWeight: 600, whiteSpace: 'nowrap' }}>Contact for pricing →</span>
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

      {/* Contact CTA */}
      <div id="contact" style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(212,168,67,0.1)', padding: '60px 24px 48px', textAlign: 'center', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: 540, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 16, background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.2)', marginBottom: 16, fontSize: 11, color: GOLD_LIGHT, fontWeight: 700, letterSpacing: '1.2px' }}>
            ✉ GET IN TOUCH
          </div>
          <h2 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 900, marginBottom: 14, color: 'white', letterSpacing: '-0.5px' }}>
            Ready to stock your shelves?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
            Send us a message and we'll get back within 24 hours with our full wholesale catalog and pricing.
          </p>
          <button onClick={() => setShowInquiry(true)} className="kanz-cta-btn" style={{
            padding: '17px 40px', borderRadius: 14, border: 'none', cursor: 'pointer',
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: '#0a0a0a',
            fontWeight: 900, fontSize: 17, boxShadow: '0 8px 28px rgba(212,168,67,0.4)',
            letterSpacing: '0.2px',
          }}>
            ✉️ Request a Price List
          </button>
        </div>
        <p style={{ color: 'rgba(212,168,67,0.3)', fontSize: 12, marginTop: 32 }}>
          © 2026 Kanz Supply LLC · Premium Wholesale Distribution
        </p>
      </div>

      {/* Inquiry popup */}
      {showInquiry && (
        <div onClick={() => setShowInquiry(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(10px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d0d0d', borderRadius: 24, maxWidth: 480, width: '100%', border: '1px solid rgba(212,168,67,0.2)', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,168,67,0.1)' }}>
            <div style={{ background: `linear-gradient(135deg, ${GOLD_DEEP} 0%, ${GOLD} 50%, ${GOLD_DEEP} 100%)`, padding: '28px 28px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', filter: 'blur(20px)' }} />
              <p style={{ color: '#0a0a0a', fontWeight: 900, fontSize: 24, marginBottom: 6, position: 'relative' }}>Get Our Price List</p>
              <p style={{ color: 'rgba(10,10,10,0.75)', fontSize: 14, lineHeight: 1.6, position: 'relative' }}>
                Send us your store details and we'll get back within 24 hours.
              </p>
            </div>
            <div style={{ padding: '24px 28px 28px' }}>
              <div style={{ background: 'rgba(212,168,67,0.06)', border: '1px solid rgba(212,168,67,0.15)', borderRadius: 12, padding: '16px 18px', marginBottom: 20 }}>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.8 }}>
                  📋 <strong style={{ color: GOLD_LIGHT }}>Please include in your email:</strong><br/>
                  • <strong style={{ color: 'white' }}>Store name</strong><br/>
                  • <strong style={{ color: 'white' }}>Store address</strong><br/>
                  • <strong style={{ color: 'white' }}>Type of business</strong> (beauty supply, gas station, etc.)
                </p>
              </div>
              <a href="mailto:orders@kanzsupply.com?subject=Price List Request&body=Store Name: %0AStore Address: %0AType of Business: %0A%0AAdditional Notes: "
                onClick={() => setShowInquiry(false)}
                className="kanz-cta-btn"
                style={{
                  display: 'block', width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                  background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: '#0a0a0a',
                  fontWeight: 800, fontSize: 16, textAlign: 'center', textDecoration: 'none',
                  boxShadow: '0 6px 20px rgba(212,168,67,0.4)', boxSizing: 'border-box',
                }}>
                📧 Open Email App
              </a>
              <button onClick={copyEmail} style={{
                width: '100%', marginTop: 10, padding: '12px', borderRadius: 12,
                border: `1px solid ${emailCopied ? GOLD : 'rgba(212,168,67,0.2)'}`,
                background: emailCopied ? 'rgba(212,168,67,0.1)' : 'transparent',
                color: emailCopied ? GOLD_LIGHT : 'rgba(255,255,255,0.65)',
                fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s',
              }}>
                {emailCopied ? '✓ Copied!' : '📋 Copy Email Address'}
              </button>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textAlign: 'center', marginTop: 12 }}>
                orders@kanzsupply.com
              </p>
              <button onClick={() => setShowInquiry(false)} style={{ width: '100%', marginTop: 8, padding: '11px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 14, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product modal */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(12px)' }}>
          <div onClick={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()} style={{ background: '#0d0d0d', borderRadius: 24, maxWidth: 560, width: '100%', overflow: 'hidden', border: '1px solid rgba(212,168,67,0.18)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}>
            {selected.image_url && (
              <div className="kanz-img-wrap" style={{ width: '100%', paddingTop: '50%', position: 'relative' }}>
                <img src={selected.image_url} alt={selected.name} draggable="false" onContextMenu={e => e.preventDefault()} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
            <div style={{ padding: 28 }}>
              {selected.brand && <p style={{ fontSize: 11, color: GOLD_LIGHT, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>{selected.brand}</p>}
              <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12, color: 'white' }}>{selected.name}</h2>
              {selected.description && <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 20 }}>{selected.description}</p>}
              <div style={{ background: 'rgba(212,168,67,0.06)', borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: '1px solid rgba(212,168,67,0.15)' }}>
                <p style={{ color: GOLD_LIGHT, fontSize: 13, fontWeight: 600 }}>💡 Contact your Kanz Supply rep for pricing and to place an order.</p>
              </div>
              <button onClick={() => { setSelected(null); setShowInquiry(true) }} className="kanz-cta-btn" style={{ width: '100%', padding: '14px', borderRadius: 10, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DEEP})`, color: '#0a0a0a', fontWeight: 800, fontSize: 15, marginBottom: 8, boxShadow: '0 4px 14px rgba(212,168,67,0.35)' }}>
                ✉️ Request Pricing
              </button>
              <button onClick={() => setSelected(null)} style={{ width: '100%', padding: '13px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontSize: 15 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
