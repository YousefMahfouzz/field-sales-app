import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function HomepagePage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [niches, setNiches] = useState([])
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  useEffect(() => {
    Promise.all([
      supabase.from('homepage_featured')
        .select('sort_order, product:product_id(id, name, description, image_url, images, category, brand)')
        .order('sort_order'),
      supabase.from('niche_lists').select('*').eq('is_active', true).order('sort_order'),
    ]).then(([{ data: featured }, { data: n }]) => {
      setProducts((featured || []).map(f => f.product).filter(Boolean))
      setNiches(n || [])
      setLoading(false)
    })
  }, [])

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', background: '#0a0a0a', color: 'white' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '0 24px', height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🛒</div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>Kanz Supply</span>
        </div>

        {/* Desktop nav links */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a href="#products" style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
            onClick={e => { e.preventDefault(); document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' }) }}>
            Products
          </a>
          {niches.map(n => (
            <a key={n.id} href={`/store/${n.slug}`} style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}>
              {n.name}
            </a>
          ))}
          <button onClick={() => navigate('/login')} style={{
            padding: '9px 22px', borderRadius: 24, border: '1.5px solid rgba(255,255,255,0.3)',
            background: 'white', color: '#0a0a0a', fontSize: 14, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s',
          }}>
            Login
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '100px 24px 60px',
        background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.25) 0%, transparent 70%)',
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow orbs */}
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', top: '10%', left: '20%', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)', bottom: '20%', right: '15%', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 24, padding: '6px 16px', marginBottom: 28, fontSize: 13, color: '#c4b5fd', fontWeight: 600 }}>
            ✦ Premium Wholesale Distribution
          </div>
          <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 24 }}>
            Products that move.
            <br />
            <span style={{ background: 'linear-gradient(135deg, #c084fc, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Margins that matter.
            </span>
          </h1>
          <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>
            Wholesale supply for beauty stores, gas stations, and convenience retailers across Louisiana and beyond.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}
              style={{ padding: '14px 32px', borderRadius: 28, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
              Browse Products →
            </button>
            <button onClick={() => navigate('/login')}
              style={{ padding: '14px 32px', borderRadius: 28, border: '1.5px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'white', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              Partner Login
            </button>
          </div>
        </div>
      </section>

      {/* ── NICHE CARDS ── */}
      {niches.length > 0 && (
        <section style={{ padding: '80px 24px', maxWidth: 1100, margin: '0 auto' }}>
          <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Tailored For Your Business</p>
          <h2 style={{ textAlign: 'center', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, marginBottom: 48, letterSpacing: '-1px' }}>Shop by store type</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {niches.map(n => (
              <a key={n.id} href={`/store/${n.slug}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '32px 28px', borderRadius: 20,
                  background: `linear-gradient(135deg, ${n.theme_color}22, ${n.theme_color}08)`,
                  border: `1px solid ${n.theme_color}33`,
                  cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 20px 40px ${n.theme_color}22` }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: n.theme_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
                    {n.slug.includes('beauty') ? '💄' : n.slug.includes('gas') ? '⛽' : '🏪'}
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: 'white' }}>{n.name}</h3>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, marginBottom: 20 }}>{n.description}</p>
                  <span style={{ fontSize: 13, fontWeight: 700, color: n.theme_color }}>View Price List →</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* ── FEATURED PRODUCTS ── */}
      <section id="products" style={{ padding: '80px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ textAlign: 'center', fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Featured Products</p>
        <h2 style={{ textAlign: 'center', fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, marginBottom: 12, letterSpacing: '-1px' }}>Our Catalog</h2>
        <p style={{ textAlign: 'center', fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 56 }}>Premium products, ready to stock</p>

        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ height: 220, background: 'rgba(255,255,255,0.04)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ padding: 20 }}>
                  <div style={{ height: 16, background: 'rgba(255,255,255,0.06)', borderRadius: 8, marginBottom: 8 }} />
                  <div style={{ height: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 8, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(255,255,255,0.3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📦</div>
            <p style={{ fontSize: 18 }}>Products coming soon</p>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {products.map((product, i) => (
            <div key={product.id}
              onClick={() => setLightbox(product)}
              style={{
                borderRadius: 20, overflow: 'hidden',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', transition: 'all 0.25s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
            >
              {/* Image */}
              <div style={{ aspectRatio: '4/3', overflow: 'hidden', background: 'rgba(255,255,255,0.03)', position: 'relative' }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s' }}
                    onMouseEnter={e => e.target.style.transform = 'scale(1.06)'}
                    onMouseLeave={e => e.target.style.transform = ''}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, opacity: 0.3 }}>📦</div>
                )}
                {product.category && (
                  <div style={{ position: 'absolute', top: 12, left: 12, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {product.category}
                  </div>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: '18px 20px 20px' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'white', lineHeight: 1.3 }}>{product.name}</h3>
                {product.brand && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 500 }}>by {product.brand}</p>}
                {product.description && (
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        margin: '40px 24px 80px',
        maxWidth: 900, marginLeft: 'auto', marginRight: 'auto',
        padding: '60px 40px', borderRadius: 28,
        background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.2))',
        border: '1px solid rgba(124,58,237,0.3)',
        textAlign: 'center',
      }}>
        <h2 style={{ fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 900, marginBottom: 16, letterSpacing: '-0.5px' }}>Ready to stock your store?</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.6)', marginBottom: 32, lineHeight: 1.6 }}>
          Login to access wholesale pricing, place orders, and manage your account.
        </p>
        <button onClick={() => navigate('/login')} style={{
          padding: '14px 40px', borderRadius: 28, border: 'none',
          background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: 'white',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
        }}>
          Get Started →
        </button>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.08)', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#7c3aed,#2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🛒</div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Kanz Supply</span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>© 2026 Kanz Supply. All rights reserved.</p>
      </footer>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', borderRadius: 24, overflow: 'hidden', maxWidth: 600, width: '100%', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
            {lightbox.image_url && <img src={lightbox.image_url} alt={lightbox.name} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }} />}
            <div style={{ padding: '24px 28px 28px' }}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>{lightbox.name}</h2>
              {lightbox.brand && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>by {lightbox.brand}</p>}
              {lightbox.description && <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 20 }}>{lightbox.description}</p>}
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => navigate('/login')} style={{ flex: 1, padding: '12px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg,#7c3aed,#2563eb)', color: 'white', fontWeight: 700, fontSize: 15, cursor: 'pointer' }}>
                  Login for Pricing →
                </button>
                <button onClick={() => setLightbox(null)} style={{ padding: '12px 20px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>✕</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
