import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LandingPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef(null)

  useEffect(() => {
    // Load featured products for landing page
    const load = async () => {
      const { data } = await supabase
        .from('landing_featured')
        .select(`sort_order, products(id, name, brand, description, category, image_url, images)`)
        .order('sort_order')
      setProducts((data || []).map(r => r.products).filter(Boolean))
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Group products by category
  const grouped = {}
  products.forEach(p => {
    const cat = p.category || 'Featured'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  })

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: '#0a0a0a', color: '#f5f5f0', minHeight: '100vh' }}>

      {/* ── HEADER ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 32px',
        height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: scrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : 'none',
        transition: 'all 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16,
          }}>🛒</div>
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px', color: '#f5f5f0' }}>
            Kanz Supply
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', color: 'rgba(245,245,240,0.6)', fontSize: 14, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, fontWeight: 500 }}>
            Products
          </button>
          <button
            onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}
            style={{ background: 'none', border: 'none', color: 'rgba(245,245,240,0.6)', fontSize: 14, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, fontWeight: 500 }}>
            Contact
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '8px 20px', borderRadius: 10,
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              border: 'none', color: 'white', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', marginLeft: 8,
              boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
            }}>
            Distributor Login →
          </button>
        </nav>
      </header>

      {/* ── HERO ── */}
      <section ref={heroRef} style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden', textAlign: 'center',
      }}>
        {/* Ambient background */}
        <div style={{
          position: 'absolute', inset: 0, zIndex: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(245,158,11,0.12) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '20%', left: '10%', width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(239,68,68,0.08) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '20%', right: '10%', width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(60px)',
        }} />

        {/* Badge */}
        <div style={{
          position: 'relative', zIndex: 1,
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 40, padding: '6px 16px', marginBottom: 32,
          fontSize: 13, color: '#f59e0b', fontWeight: 600, letterSpacing: '0.03em',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Wholesale Distributor — Greater New Orleans
        </div>

        {/* Headline */}
        <h1 style={{
          position: 'relative', zIndex: 1,
          fontSize: 'clamp(44px, 8vw, 88px)',
          fontWeight: 900, lineHeight: 1.0,
          letterSpacing: '-3px',
          marginBottom: 24,
          background: 'linear-gradient(135deg, #f5f5f0 30%, rgba(245,245,240,0.5) 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          Premium<br />
          <span style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>Products.</span><br />
          Direct.
        </h1>

        <p style={{
          position: 'relative', zIndex: 1,
          fontSize: 18, color: 'rgba(245,245,240,0.55)', lineHeight: 1.7,
          maxWidth: 520, marginBottom: 44,
        }}>
          Your trusted wholesale partner for beauty supply, convenience, and specialty products across Louisiana, Mississippi, Alabama, Texas, Arkansas, and Tennessee.
        </p>

        {/* CTAs */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button onClick={() => document.getElementById('products-section')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '14px 32px', borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              border: 'none', color: 'white', fontWeight: 700, fontSize: 16,
              cursor: 'pointer', boxShadow: '0 8px 32px rgba(245,158,11,0.35)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            Browse Products
          </button>
          <button onClick={() => document.getElementById('contact-section')?.scrollIntoView({ behavior: 'smooth' })}
            style={{
              padding: '14px 32px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(245,245,240,0.8)', fontWeight: 600, fontSize: 16, cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}>
            Get in Touch
          </button>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
          color: 'rgba(245,245,240,0.3)', fontSize: 11, letterSpacing: '0.1em',
        }}>
          <span>SCROLL</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(to bottom, rgba(245,245,240,0.3), transparent)' }} />
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: '60px 32px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, textAlign: 'center' }}>
          {[
            { num: '4', label: 'States Covered', sub: 'LA · MS · AL · OH' },
            { num: '100+', label: 'Products', sub: 'Beauty, Convenience & More' },
            { num: '24h', label: 'Response Time', sub: 'Fast Order Processing' },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: 48, fontWeight: 900, letterSpacing: '-2px', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.num}</p>
              <p style={{ fontWeight: 700, fontSize: 15, color: '#f5f5f0', marginTop: 4 }}>{s.label}</p>
              <p style={{ fontSize: 12, color: 'rgba(245,245,240,0.4)', marginTop: 2 }}>{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="products-section" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 12, letterSpacing: '0.15em', color: '#f59e0b', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase' }}>Our Catalog</p>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#f5f5f0' }}>
              What We Carry
            </h2>
            <p style={{ color: 'rgba(245,245,240,0.45)', marginTop: 12, fontSize: 16, maxWidth: 500, margin: '12px auto 0' }}>
              Curated wholesale products for convenience stores, beauty supply shops, and gas stations.
            </p>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <div style={{ width: 40, height: 40, border: '2px solid rgba(245,158,11,0.3)', borderTopColor: '#f59e0b', borderRadius: '50%', margin: '0 auto', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!loading && products.length === 0 && (
            <div style={{ textAlign: 'center', padding: 80, color: 'rgba(245,245,240,0.35)' }}>
              <p style={{ fontSize: 48, marginBottom: 16 }}>📦</p>
              <p style={{ fontSize: 18 }}>Products coming soon</p>
            </div>
          )}

          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: 56 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(245,245,240,0.45)' }}>{cat}</h3>
                <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                {items.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY US ── */}
      <section style={{ padding: '80px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center', marginBottom: 48 }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, letterSpacing: '-1px', color: '#f5f5f0' }}>Why Work With Us</h2>
        </div>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20 }}>
          {[
            { icon: '🚀', title: 'Fast Fulfillment', desc: 'Quick turnaround on all orders. We know your shelves can\'t wait.' },
            { icon: '💰', title: 'Wholesale Pricing', desc: 'Competitive margins that keep your business profitable.' },
            { icon: '🤝', title: 'Personal Service', desc: 'Direct relationship with your rep — not a call center.' },
            { icon: '📍', title: 'Local Coverage', desc: 'Serving LA, MS, AL and OH with on-the-ground presence.' },
          ].map(f => (
            <div key={f.title} style={{
              padding: '28px 24px', borderRadius: 16,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(245,158,11,0.25)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 32, marginBottom: 14 }}>{f.icon}</div>
              <p style={{ fontWeight: 700, fontSize: 16, color: '#f5f5f0', marginBottom: 8 }}>{f.title}</p>
              <p style={{ fontSize: 14, color: 'rgba(245,245,240,0.45)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact-section" style={{ padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p style={{ fontSize: 12, letterSpacing: '0.15em', color: '#f59e0b', fontWeight: 700, marginBottom: 16, textTransform: 'uppercase' }}>Get Started</p>
          <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#f5f5f0', marginBottom: 20 }}>
            Ready to Order?
          </h2>
          <p style={{ color: 'rgba(245,245,240,0.45)', fontSize: 16, lineHeight: 1.7, marginBottom: 40 }}>
            Reach out to set up your account and get access to our full price lists tailored to your store type.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 32 }}>
            <a href="tel:8777765258" style={{
              padding: '14px 28px', borderRadius: 12,
              background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
              color: 'white', fontWeight: 700, fontSize: 15,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8,
              boxShadow: '0 8px 24px rgba(245,158,11,0.3)',
            }}>📞 877-7-SOLALT</a>
            <a href="mailto:info@kanzsupply.com" style={{
              padding: '14px 28px', borderRadius: 12,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(245,245,240,0.8)', fontWeight: 600, fontSize: 15,
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8,
            }}>✉️ Email Us</a>
          </div>
          <button onClick={() => navigate('/login')} style={{
            background: 'none', border: 'none', color: 'rgba(245,245,240,0.35)', fontSize: 13,
            cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3,
          }}>
            Already have an account? Sign in →
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px 24px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🛒</div>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'rgba(245,245,240,0.6)' }}>Kanz Supply</span>
        </div>
        <p style={{ color: 'rgba(245,245,240,0.25)', fontSize: 12 }}>© 2026 Kanz Supply. All rights reserved.</p>
      </footer>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px } 
        ::-webkit-scrollbar-track { background: #0a0a0a }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px }
      `}</style>
    </div>
  )
}

function ProductCard({ product }) {
  const [hovered, setHovered] = useState(false)
  const img = product.image_url || product.images?.[0]

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 16,
        background: hovered ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${hovered ? 'rgba(245,158,11,0.3)' : 'rgba(255,255,255,0.07)'}`,
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
      }}>
      {/* Image */}
      <div style={{ width: '100%', aspectRatio: '4/3', background: '#161616', overflow: 'hidden', position: 'relative' }}>
        {img ? (
          <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', transform: hovered ? 'scale(1.05)' : 'scale(1)' }} loading="lazy" />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: 'rgba(255,255,255,0.1)' }}>📦</div>
        )}
        {product.category && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            background: 'rgba(10,10,10,0.75)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '3px 10px',
            fontSize: 10, fontWeight: 700, color: 'rgba(245,245,240,0.7)',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            {product.category}
          </div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: '16px' }}>
        <p style={{ fontWeight: 700, fontSize: 15, color: '#f5f5f0', marginBottom: 4, lineHeight: 1.3 }}>{product.name}</p>
        {product.brand && <p style={{ fontSize: 12, color: 'rgba(245,245,240,0.4)', marginBottom: 8 }}>{product.brand}</p>}
        {product.description && (
          <p style={{ fontSize: 13, color: 'rgba(245,245,240,0.5)', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {product.description}
          </p>
        )}
      </div>
    </div>
  )
}
