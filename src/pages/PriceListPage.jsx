import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function inferCategory(name) {
  const n = (name || '').toLowerCase()
  if (/wig|lace front|closure|frontal/.test(n)) return 'Wigs'
  if (/bundle|weave|extension|weft|track/.test(n)) return 'Hair Extensions & Weaves'
  if (/braid|loc|twist|crochet|kinky|marley|senegal/.test(n)) return 'Braiding Hair'
  if (/shampoo|conditioner|treatment|mask|serum|leave.in|deep conditioner/.test(n)) return 'Hair Care & Treatments'
  if (/flat iron|curling|dryer|clippers|brush|heat tool/.test(n)) return 'Styling Tools'
  if (/lotion|cream|body wash|face|skin|sunscreen|toner/.test(n)) return 'Skin Care'
  if (/nail|polish|gel|acrylic|press.on/.test(n)) return 'Nail Care'
  if (/lipstick|foundation|mascara|lash|makeup|concealer|blush/.test(n)) return 'Cosmetics & Makeup'
  if (/perfume|cologne|fragrance|body oil|mist/.test(n)) return 'Fragrance & Oils'
  if (/clip|pin|band|headband|bonnet|cap|wrap|net/.test(n)) return 'Accessories'
  if (/air freshener|freshener|febreze|glade|car freshener/.test(n)) return 'Air Fresheners'
  if (/incense|candle|stick|cone|oud|bakhoor/.test(n)) return 'Incense & Candles'
  if (/honey|royal|bull|enhancement|stamina/.test(n)) return 'Male Enhancement'
  if (/charger|charging|usb|cable|lightning|type.c|power bank/.test(n)) return 'Phone Chargers & Cables'
  if (/case|cover|screen protector/.test(n)) return 'Phone Cases & Accessories'
  return 'Other'
}

const CAT = {
  'Wigs':                        { icon: '👑', color: '#c026d3' },
  'Hair Extensions & Weaves':    { icon: '💇', color: '#7c3aed' },
  'Braiding Hair':               { icon: '🌀', color: '#0891b2' },
  'Hair Care & Treatments':      { icon: '🧴', color: '#16a34a' },
  'Styling Tools':               { icon: '⚡', color: '#d97706' },
  'Skin Care':                   { icon: '✨', color: '#0d9488' },
  'Nail Care':                   { icon: '💅', color: '#e11d48' },
  'Cosmetics & Makeup':          { icon: '💄', color: '#9333ea' },
  'Accessories':                 { icon: '🎀', color: '#2563eb' },
  'Fragrance & Oils':            { icon: '🌸', color: '#db2777' },
  'Air Fresheners':              { icon: '🍃', color: '#059669' },
  'Incense & Candles':           { icon: '🕯️', color: '#92400e' },
  'Male Enhancement':            { icon: '🍯', color: '#b45309' },
  'Phone Chargers & Cables':     { icon: '🔌', color: '#1d4ed8' },
  'Phone Cases & Accessories':   { icon: '📱', color: '#374151' },
  'Food & Snacks':               { icon: '🍬', color: '#dc2626' },
  'Health & Wellness':           { icon: '💊', color: '#0284c7' },
  'Other':                       { icon: '📦', color: '#64748b' },
}
const getCat = c => CAT[c] || CAT['Other']

// ── Lightbox ──
function Lightbox({ images, startIndex, onClose }) {
  const [idx, setIdx] = useState(startIndex)
  const prev = () => setIdx(i => (i - 1 + images.length) % images.length)
  const next = () => setIdx(i => (i + 1) % images.length)

  useEffect(() => {
    const handler = e => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16,
        background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
        width: 40, height: 40, borderRadius: '50%', fontSize: 20, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>✕</button>

      {/* Prev */}
      {images.length > 1 && (
        <button onClick={e => { e.stopPropagation(); prev() }} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
          width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer',
        }}>‹</button>
      )}

      <img
        src={images[idx]}
        alt=""
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 'min(90vw, 700px)', maxHeight: '85vh',
          objectFit: 'contain', borderRadius: 12,
          boxShadow: '0 25px 80px rgba(0,0,0,0.6)',
        }}
      />

      {/* Next */}
      {images.length > 1 && (
        <button onClick={e => { e.stopPropagation(); next() }} style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white',
          width: 44, height: 44, borderRadius: '50%', fontSize: 20, cursor: 'pointer',
        }}>›</button>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 8,
        }}>
          {images.map((_, i) => (
            <div key={i} onClick={e => { e.stopPropagation(); setIdx(i) }} style={{
              width: i === idx ? 20 : 8, height: 8, borderRadius: 4,
              background: i === idx ? 'white' : 'rgba(255,255,255,0.35)',
              cursor: 'pointer', transition: 'all 0.2s',
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Product Card ──
function ProductCard({ product, onOpenLightbox, cartQty, onSetQty }) {
  const [expanded, setExpanded] = useState(false)
  const { color, icon } = getCat(product.category)

  // All images: primary first, then extras
  const allImages = [
    ...(product.image_url ? [product.image_url] : []),
    ...(product.images || []),
  ].filter(Boolean)

  const hasDesc = product.description?.trim()

  return (
    <article style={{
      background: 'white',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
      border: '1px solid #f1f5f9',
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.13)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Image strip */}
      {allImages.length > 0 ? (
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => onOpenLightbox(allImages, 0)}
            style={{
              width: '100%', paddingTop: '75%', position: 'relative',
              background: '#f8fafc', cursor: 'zoom-in', overflow: 'hidden',
            }}
          >
            <img src={allImages[0]} alt={product.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            {allImages.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(0,0,0,0.55)', color: 'white',
                borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 600,
              }}>
                +{allImages.length - 1} more
              </div>
            )}
          </div>
          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: '#f8fafc', overflowX: 'auto', scrollbarWidth: 'none' }}>
              {allImages.map((img, i) => (
                <div key={i} onClick={() => onOpenLightbox(allImages, i)}
                  style={{
                    flexShrink: 0, width: 44, height: 44, borderRadius: 6,
                    overflow: 'hidden', cursor: 'pointer',
                    border: '2px solid ' + (i === 0 ? color : '#e2e8f0'),
                  }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          width: '100%', paddingTop: '60%', position: 'relative',
          background: `linear-gradient(135deg, ${color}18, ${color}08)`,
        }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
            {icon}
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: '#0f172a', marginBottom: 2 }}>
              {product.name}
            </h3>
            {product.brand && (
              <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{product.brand}</p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>
              ${product.sell_price?.toFixed(2)}
            </p>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>per {product.unit || 'unit'}</p>
          </div>
        </div>

        {/* Price range — retail value badge */}
        {(product.price_min || product.price_max) && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#fef9c3', border: '1px solid #fde047',
            borderRadius: 20, padding: '3px 10px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 11 }}>🏷️</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#854d0e' }}>
              Sells for{' '}
              {product.price_min && product.price_max
                ? `$${product.price_min}–$${product.price_max}`
                : product.price_min ? `from $${product.price_min}`
                : `up to $${product.price_max}`}
            </span>
            <span style={{ fontSize: 10, color: '#a16207' }}>retail</span>
          </div>
        )}

        {hasDesc && (
          <>
            <p style={{
              fontSize: 13, color: '#64748b', lineHeight: 1.6,
              overflow: expanded ? 'visible' : 'hidden',
              display: expanded ? 'block' : '-webkit-box',
              WebkitLineClamp: expanded ? 'none' : 2,
              WebkitBoxOrient: 'vertical',
              marginBottom: 6,
            }}>
              {product.description}
            </p>
            {product.description.length > 100 && (
              <button onClick={() => setExpanded(!expanded)} style={{
                background: 'none', border: 'none', color, fontSize: 12,
                fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 8,
              }}>
                {expanded ? '▲ Less' : '▼ Read more'}
              </button>
            )}
          </>
        )}

        {/* Add to cart */}
        {cartQty > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8 }}>
            <button onClick={() => onSetQty(product, cartQty - 1)} style={{
              width: 34, height: 34, borderRadius: '8px 0 0 8px', border: '1.5px solid ' + color,
              background: 'white', color, fontWeight: 700, fontSize: 18, cursor: 'pointer',
            }}>−</button>
            <div style={{
              flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${color}`, borderLeft: 'none', borderRight: 'none',
              fontWeight: 700, fontSize: 14, color: '#0f172a',
            }}>{cartQty}</div>
            <button onClick={() => onSetQty(product, cartQty + 1)} style={{
              width: 34, height: 34, borderRadius: '0 8px 8px 0', border: '1.5px solid ' + color,
              background: color, color: 'white', fontWeight: 700, fontSize: 18, cursor: 'pointer',
            }}>+</button>
          </div>
        ) : (
          <button onClick={() => onSetQty(product, 1)} style={{
            width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 8,
            border: `1.5px solid ${color}`, background: 'white', color,
            fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = 'white' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = color }}
          >
            + Add to Order
          </button>
        )}
      </div>
    </article>
  )
}

// ── Main Page ──
export default function PriceListPage() {
  const { username } = useParams()
  const [products, setProducts] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [search, setSearch] = useState('')
  const [activeCat, setActiveCat] = useState('all')
  const [lightbox, setLightbox] = useState(null)
  // Cart: { productId: { product, qty } }
  const [cart, setCart] = useState({})
  const [showCart, setShowCart] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [orderLoading, setOrderLoading] = useState(false)
  const [confirmedTotal, setConfirmedTotal] = useState(0) // snapshot before cart clears

  const cartCount = Object.values(cart).reduce((s, i) => s + i.qty, 0)
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.qty * i.product.sell_price, 0)

  const setQty = (product, qty) => {
    if (qty <= 0) {
      setCart(p => { const n = { ...p }; delete n[product.id]; return n })
    } else {
      setCart(p => ({ ...p, [product.id]: { product, qty } }))
    }
  }

  useEffect(() => {
    document.body.classList.add('pricelist-page')
    return () => document.body.classList.remove('pricelist-page')
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      let userId = null
      if (username) {
        const { data: p } = await supabase.from('profiles').select('id,username,display_name').eq('username', username).single()
        if (p) {
          setProfile(p); userId = p.id
        } else {
          // Profile blocked by RLS for public (anon) visitors
          // This means the Supabase profile policy needs to allow anon reads
          // For now, show not found - user needs to use /pl/:userId/:slug URLs
          setNotFound(true); setLoading(false); return
        }
      }
      let q = supabase.from('products').select('id,name,brand,sell_price,price_min,price_max,image_url,images,description,category,unit,user_id').eq('is_active', true).order('category').order('name')
      if (userId) q = q.eq('user_id', userId)
      const { data } = await q
      if (username && !userId && (!data || data.length === 0)) {
        setNotFound(true); setLoading(false); return
      }
      setProducts((data || []).map(p => ({ ...p, category: p.category || inferCategory(p.name) })))
      setLoading(false)
    }
    load()
  }, [username])

  const submitOrder = async () => {
    if (!orderForm.name.trim() || !orderForm.phone.trim()) return
    setOrderLoading(true)
    try {
      const items = Object.values(cart).map(({ product, qty }) => ({
        product_id: product.id,
        name: product.name,
        brand: product.brand,
        qty,
        unit_price: product.sell_price,
        subtotal: qty * product.sell_price,
      }))

      // seller_user_id: prefer from product, fallback to profile lookup
      const sellerUserId = products[0]?.user_id || profile?.id || null

      const { error } = await supabase.from('orders').insert([{
        customer_name: orderForm.name.trim(),
        phone: orderForm.phone.trim(),
        address: orderForm.address.trim(),
        notes: orderForm.notes.trim(),
        items,
        total_amount: cartTotal,
        seller_user_id: sellerUserId,
        seller_username: username || profile?.username || null,
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

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]
  const filtered = products.filter(p =>
    (!search || p.name?.toLowerCase().includes(search.toLowerCase())) &&
    (activeCat === 'all' || p.category === activeCat)
  )
  const grouped = {}
  filtered.forEach(p => { const c = p.category || 'Other'; (grouped[c] = grouped[c] || []).push(p) })

  const openLightbox = useCallback((images, index) => setLightbox({ images, index }), [])

  const displayName = profile?.display_name || profile?.username || ''

  // ── Inject per-user manifest so "Add to Home Screen" opens THIS page ──
  useEffect(() => {
    if (!username) return
    const pageUrl = `${window.location.origin}/u/${username}/pricelist`
    const manifestData = {
      name: displayName ? `${displayName} — Price List` : 'Kanz Supply Price List',
      short_name: displayName || 'Price List',
      description: `Browse ${displayName || username}'s products and request an order.`,
      start_url: `/u/${username}/pricelist`,
      scope: `/u/${username}/`,
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f8fafc',
      theme_color: '#2563eb',
      icons: [
        { src: `${window.location.origin}/pwa-192x192.png`, sizes: '192x192', type: 'image/png' },
        { src: `${window.location.origin}/pwa-512x512.png`, sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    }
    const blob = new Blob([JSON.stringify(manifestData)], { type: 'application/manifest+json' })
    const url = URL.createObjectURL(blob)

    // Remove any existing manifest link and inject our user-specific one
    document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove())
    const link = document.createElement('link')
    link.rel = 'manifest'
    link.href = url
    document.head.appendChild(link)

    // Also update page title and apple meta for this user
    document.title = displayName ? `${displayName} — Price List` : 'Kanz Supply'
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]')
    if (appleTitle) appleTitle.content = displayName || 'Price List'

    // Update og:url so sharing shows the right link
    const ogUrl = document.querySelector('meta[property="og:url"]')
    if (ogUrl) ogUrl.content = pageUrl
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.content = manifestData.name

    return () => {
      URL.revokeObjectURL(url)
      // Restore original manifest on unmount
      document.querySelectorAll('link[rel="manifest"]').forEach(el => el.remove())
      const orig = document.createElement('link')
      orig.rel = 'manifest'
      orig.href = '/manifest.webmanifest'
      document.head.appendChild(orig)
      document.title = 'Kanz Supply'
    }
  }, [username, displayName])


  if (notFound) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 32 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>😕</div>
      <h2 style={{ color: '#0f172a', marginBottom: 8 }}>Page not found</h2>
      <p style={{ color: '#64748b', marginBottom: 8 }}>
          {username ? `Listing for @${username} requires login to view.` : 'No listing found.'}
        </p>
        {username && (
          <p style={{ color: '#94a3b8', fontSize: 13 }}>
            If you received a direct price list link, please use that URL instead.
          </p>
        )}
    </div>
  )

  return (
    <>
      {/* Global styles for this page */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8fafc; }
        .pl-page { min-height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #0f172a; background: #f8fafc; }
        .pl-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
        @media (max-width: 500px) { .pl-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
        @media (max-width: 320px) { .pl-grid { grid-template-columns: 1fr; } }
        .pl-search:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
        .pl-pill { white-space: nowrap; border: none; cursor: pointer; transition: all 0.15s; }
        .pl-pill:hover { opacity: 0.85; }
        .pl-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>

      <div className="pl-page">
        {/* ── HERO ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 70%, #5b21b6 100%)',
          padding: 'clamp(36px, 6vw, 72px) clamp(16px, 5vw, 80px) clamp(28px, 4vw, 56px)',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Background blobs */}
          <div style={{ position: 'absolute', top: -60, right: -60, width: 240, height: 240, borderRadius: '50%', background: 'rgba(139,92,246,0.25)', filter: 'blur(40px)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: '30%', width: 200, height: 200, borderRadius: '50%', background: 'rgba(236,72,153,0.2)', filter: 'blur(50px)' }} />

          <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
            {profile && (
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
                background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, fontWeight: 700, color: 'white',
                boxShadow: '0 0 0 4px rgba(255,255,255,0.15)',
              }}>
                {displayName[0]?.toUpperCase() || '?'}
              </div>
            )}
            <h1 style={{
              fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 900, lineHeight: 1.15,
              background: 'linear-gradient(135deg, #fff 0%, #e0d7ff 50%, #f9a8d4 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              marginBottom: 8, letterSpacing: '-0.5px',
            }}>
              {displayName ? `${displayName}'s Products` : 'Product Catalogue'}
            </h1>
            {username && <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>@{username}</p>}
            {products.length > 0 && (
              <div style={{ marginTop: 18, display: 'inline-flex', gap: 24, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', borderRadius: 40, padding: '10px 28px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}><span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>{products.length}</span> items</span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}><span style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>{categories.length - 1}</span> categories</span>
              </div>
            )}
          </div>
        </div>

        {/* ── STICKY SEARCH + FILTERS ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(248,250,252,0.95)', backdropFilter: 'blur(10px)', borderBottom: '1px solid #e2e8f0', padding: 'clamp(10px,2vw,16px) clamp(12px,4vw,40px)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ position: 'relative', marginBottom: categories.length > 2 ? 10 : 0 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
              <input
                className="pl-search"
                type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                style={{
                  width: '100%', padding: '11px 14px 11px 40px',
                  borderRadius: 12, border: '1.5px solid #e2e8f0',
                  background: 'white', fontSize: 15, color: '#0f172a',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}
              />
            </div>
            {categories.length > 2 && (
              <div className="pl-scrollbar" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {categories.map(cat => {
                  const isAll = cat === 'all'
                  const color = isAll ? '#6366f1' : getCat(cat).color
                  const active = activeCat === cat
                  return (
                    <button key={cat} className="pl-pill" onClick={() => setActiveCat(cat)} style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      background: active ? color : 'white',
                      color: active ? 'white' : '#475569',
                      boxShadow: active ? `0 2px 8px ${color}40` : '0 1px 3px rgba(0,0,0,0.08)',
                      border: active ? 'none' : '1px solid #e2e8f0',
                    }}>
                      {isAll ? 'All' : `${getCat(cat).icon} ${cat}`}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── CONTENT ── */}
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px,3vw,40px) clamp(12px,4vw,40px) 80px' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
              <p>Loading products...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
              <p>{search ? 'No products match your search' : 'No products listed yet'}</p>
            </div>
          )}

          {!loading && Object.entries(grouped).map(([cat, items]) => {
            const { color, icon } = getCat(cat)
            return (
              <section key={cat} style={{ marginBottom: 48 }}>
                {/* Category heading */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: color + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>{icon}</div>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{cat}</h2>
                    <p style={{ fontSize: 12, color: '#94a3b8' }}>{items.length} product{items.length !== 1 ? 's' : ''}</p>
                  </div>
                  <div style={{ flex: 1, height: 1, background: '#f1f5f9', marginLeft: 8 }} />
                </div>

                <div className="pl-grid">
                  {items.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpenLightbox={openLightbox}
                      cartQty={cart[product.id]?.qty || 0}
                      onSetQty={setQty}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </main>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: '1px solid #e2e8f0', padding: 'clamp(20px,3vw,32px) clamp(12px,4vw,40px)',
          textAlign: 'center', background: 'white',
        }}>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>
            Tap any product image to enlarge · Prices subject to change
          </p>
        </footer>
      </div>

      {/* ── CART FAB ── */}
      {cartCount > 0 && !showCart && !showOrderForm && !orderSubmitted && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: 'fixed', bottom: 28, right: 24, zIndex: 200,
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white', border: 'none', borderRadius: 32,
            padding: '14px 22px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 28px rgba(99,102,241,0.45)',
            fontSize: 15, fontWeight: 700,
          }}
        >
          <span style={{
            background: 'white', color: '#6366f1', borderRadius: '50%',
            width: 24, height: 24, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 13, fontWeight: 800,
          }}>{cartCount}</span>
          View Order · ${cartTotal.toFixed(2)}
        </button>
      )}

      {/* ── CART PANEL ── */}
      {showCart && !showOrderForm && !orderSubmitted && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }} onClick={() => setShowCart(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', width: '100%', maxWidth: 540,
              borderRadius: '24px 24px 0 0', padding: '0 0 32px',
              maxHeight: '85vh', overflowY: 'auto',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
            }}
          >
            {/* Handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>

            <div style={{ padding: '12px 24px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Your Order</h2>
                <button onClick={() => setShowCart(false)} style={{
                  background: '#f1f5f9', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, cursor: 'pointer', fontSize: 16,
                }}>✕</button>
              </div>

              {/* Cart items */}
              {Object.values(cart).map(({ product, qty }) => (
                <div key={product.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0', borderBottom: '1px solid #f1f5f9',
                }}>
                  {/* Thumb */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 10, flexShrink: 0,
                    background: '#f8fafc', overflow: 'hidden',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>
                    {product.image_url
                      ? <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : getCat(product.category).icon}
                  </div>

                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{product.name}</p>
                    {product.brand && <p style={{ fontSize: 12, color: '#94a3b8' }}>{product.brand}</p>}
                    <p style={{ fontSize: 13, color: '#6366f1', fontWeight: 600 }}>
                      ${(product.sell_price * qty).toFixed(2)}
                    </p>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                    <button onClick={() => setQty(product, qty - 1)} style={{
                      width: 30, height: 30, borderRadius: '6px 0 0 6px',
                      border: '1.5px solid #e2e8f0', background: 'white',
                      cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#374151',
                    }}>−</button>
                    <div style={{
                      width: 36, height: 30, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', border: '1.5px solid #e2e8f0',
                      borderLeft: 'none', borderRight: 'none',
                      fontWeight: 700, fontSize: 14,
                    }}>{qty}</div>
                    <button onClick={() => setQty(product, qty + 1)} style={{
                      width: 30, height: 30, borderRadius: '0 6px 6px 0',
                      border: '1.5px solid #6366f1', background: '#6366f1',
                      cursor: 'pointer', fontSize: 16, fontWeight: 700, color: 'white',
                    }}>+</button>
                  </div>
                </div>
              ))}

              {/* Total */}
              <div style={{
                margin: '16px 0', padding: '14px 16px',
                background: '#f8fafc', borderRadius: 12,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 15, color: '#64748b' }}>Total ({cartCount} item{cartCount !== 1 ? 's' : ''})</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#6366f1' }}>${cartTotal.toFixed(2)}</span>
              </div>

              {/* Discount note */}
              <div style={{
                padding: '10px 14px', background: '#fefce8',
                border: '1px solid #fde047', borderRadius: 10, marginBottom: 16,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <p style={{ fontSize: 13, color: '#854d0e', lineHeight: 1.5 }}>
                  We offer <strong>discounts for large orders</strong> and customers with multiple stores. Ask us when we confirm your order!
                </p>
              </div>

              <button
                onClick={() => { setShowCart(false); setShowOrderForm(true) }}
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(99,102,241,0.35)',
                }}
              >
                Request This Order →
              </button>
              <button onClick={() => setShowCart(false)} style={{
                width: '100%', marginTop: 10, padding: '12px 0', borderRadius: 12,
                border: '1.5px solid #e2e8f0', background: 'white',
                color: '#64748b', fontSize: 14, cursor: 'pointer',
              }}>
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ORDER FORM ── */}
      {showOrderForm && !orderSubmitted && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div style={{
            background: 'white', width: '100%', maxWidth: 540,
            borderRadius: '24px 24px 0 0', padding: '0 0 40px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.2)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
            </div>

            <div style={{ padding: '12px 24px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <button onClick={() => { setShowOrderForm(false); setShowCart(true) }} style={{
                  background: '#f1f5f9', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, cursor: 'pointer', fontSize: 16,
                }}>←</button>
                <h2 style={{ fontSize: 20, fontWeight: 800 }}>Your Details</h2>
              </div>

              {/* Order summary chip */}
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 14px', background: '#f8fafc', borderRadius: 10, marginBottom: 20,
              }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>{cartCount} item{cartCount !== 1 ? 's' : ''}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#6366f1' }}>${cartTotal.toFixed(2)}</span>
              </div>

              {/* Form fields */}
              {[
                { key: 'name', label: 'Your Name *', placeholder: 'Full name', type: 'text' },
                { key: 'phone', label: 'Phone Number *', placeholder: '+1 (555) 000-0000', type: 'tel' },
                { key: 'address', label: 'Delivery Address', placeholder: 'Street, City, State', type: 'text' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    {label}
                  </label>
                  <input
                    type={type}
                    value={orderForm[key]}
                    onChange={e => setOrderForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10,
                      border: '1.5px solid #e2e8f0', fontSize: 15,
                      boxSizing: 'border-box', outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    onFocus={e => e.target.style.borderColor = '#6366f1'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>
              ))}

              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                  Notes / Special Requests
                </label>
                <textarea
                  value={orderForm.notes}
                  onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any special requests, preferred delivery time, questions about bulk discounts..."
                  rows={3}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', fontSize: 15, resize: 'none',
                    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
                  }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                />
              </div>

              {/* Discount reminder */}
              <div style={{
                padding: '10px 14px', background: '#fefce8',
                border: '1px solid #fde047', borderRadius: 10, marginBottom: 20,
                display: 'flex', gap: 8,
              }}>
                <span>💡</span>
                <p style={{ fontSize: 12, color: '#854d0e', lineHeight: 1.5 }}>
                  <strong>Multi-store or bulk order?</strong> Mention it in notes — we'll apply discounts when we confirm.
                </p>
              </div>

              <button
                onClick={submitOrder}
                disabled={orderLoading || !orderForm.name.trim() || !orderForm.phone.trim()}
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 12, border: 'none',
                  background: orderLoading || !orderForm.name.trim() || !orderForm.phone.trim()
                    ? '#e2e8f0' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: orderLoading || !orderForm.name.trim() || !orderForm.phone.trim()
                    ? '#94a3b8' : 'white',
                  fontSize: 16, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {orderLoading ? 'Submitting...' : '✅ Submit Order Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ORDER CONFIRMED ── */}
      {orderSubmitted && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div style={{
            background: 'white', borderRadius: 24, padding: '40px 32px',
            maxWidth: 400, width: '100%', textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 36,
            }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 10, color: '#0f172a' }}>
              Order Received!
            </h2>
            <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, marginBottom: 8 }}>
              Thanks <strong>{orderForm.name}</strong>! We've received your order request and will contact you at <strong>{orderForm.phone}</strong> to confirm.
            </p>
            <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, marginBottom: 28 }}>
              We'll bring your items directly to you. Ask us about discounts for large or multi-store orders!
            </p>
            <div style={{
              padding: '12px 16px', background: '#f8fafc', borderRadius: 12, marginBottom: 24,
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span style={{ color: '#64748b', fontSize: 14 }}>Order Total</span>
              <span style={{ fontWeight: 800, fontSize: 18, color: '#6366f1' }}>${confirmedTotal.toFixed(2)}</span>
            </div>
            <button
              onClick={() => { setOrderSubmitted(false); setShowOrderForm(false); setOrderForm({ name: '', phone: '', address: '', notes: '' }) }}
              style={{
                width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Continue Browsing
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={() => setLightbox(null)} />
      )}
    </>
  )
}
