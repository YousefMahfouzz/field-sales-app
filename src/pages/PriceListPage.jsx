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

// ── Parse piece count AND item name from description ──
// "50 pieces" → { count: 50, itemName: "piece" }
// "30 sachets inside" → { count: 30, itemName: "sachet" }
// "720 sticks" → { count: 720, itemName: "stick" }
// "72 count display" → { count: 72, itemName: "piece" }
function parsePieceInfo(description) {
  if (!description) return null
  const m = description.match(/(\d+)\s*(pieces?|sachets?|sticks?|cans?|packets?|bottles?|bags?|rolls?|bars?|packs?|capsules?|tablets?|count|pcs|ct|pk)/i)
  if (!m) return null
  const count = parseInt(m[1])
  const raw = m[2].toLowerCase()
  // Normalize to singular
  const NAMES = {
    piece: 'piece', pieces: 'piece', pcs: 'piece', count: 'piece', ct: 'piece', pk: 'piece',
    sachet: 'sachet', sachets: 'sachet',
    stick: 'stick', sticks: 'stick',
    can: 'can', cans: 'can',
    packet: 'packet', packets: 'packet',
    bottle: 'bottle', bottles: 'bottle',
    bag: 'bag', bags: 'bag',
    roll: 'roll', rolls: 'roll',
    bar: 'bar', bars: 'bar',
    pack: 'pack', packs: 'pack',
    capsule: 'capsule', capsules: 'capsule',
    tablet: 'tablet', tablets: 'tablet',
  }
  return { count, itemName: NAMES[raw] || 'piece' }
}

// ── Product Card ──
function ProductCard({ product, onOpenLightbox, cartQty, onSetQty }) {
  const [expanded, setExpanded] = useState(false)
  const { color, icon } = getCat(product.category)
  const isSoldOut = product.stock_qty !== null && product.stock_qty !== undefined && product.stock_qty <= 0

  // All images: primary first, then extras
  const allImages = [
    ...(product.image_url ? [product.image_url] : []),
    ...(product.images || []),
  ].filter(Boolean)

  const hasDesc = product.description?.trim()

  // Per-piece pricing – prefer explicit fields, fallback to parsing description
  const parsed = parsePieceInfo(product.description)
  const pieceCount = product.pieces_per_unit || parsed?.count || null
  const pieceName = product.piece_name || parsed?.itemName || 'piece'
  const showPerPiece = pieceCount && pieceCount > 1 && product.sell_price > 0
  const pricePerPiece = showPerPiece ? (product.sell_price / pieceCount) : null

  // Sold-out filter style
  const soldOutFilter = isSoldOut ? 'grayscale(100%) opacity(0.6)' : 'none'

  return (
    <article style={{
      background: isSoldOut ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.07)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: isSoldOut ? 'none' : '0 4px 20px rgba(0,0,0,0.15)',
      border: isSoldOut ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.1)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isSoldOut ? 0.7 : 1,
      position: 'relative',
      backdropFilter: 'blur(8px)',
    }}
      onMouseEnter={e => { if (!isSoldOut) { e.currentTarget.style.boxShadow = '0 12px 40px rgba(212,168,67,0.18)'; e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'; e.currentTarget.style.border = '1px solid rgba(212,168,67,0.25)' }}}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = isSoldOut ? 'none' : '0 4px 20px rgba(0,0,0,0.15)'; e.currentTarget.style.transform = 'translateY(0) scale(1)'; e.currentTarget.style.border = isSoldOut ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(255,255,255,0.1)' }}
    >
      {/* SOLD OUT badge */}
      {isSoldOut && (
        <div style={{
          position: 'absolute', top: 12, left: 12, zIndex: 10,
          background: 'rgba(15,23,42,0.85)', color: 'white',
          padding: '4px 12px', borderRadius: 8,
          fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase',
          backdropFilter: 'blur(4px)',
        }}>
          SOLD OUT
        </div>
      )}

      {/* BEST SELLER badge – only when not sold out */}
      {!isSoldOut && product.is_best_seller && (
        <div style={{
          position: 'absolute', top: 12, right: 12, zIndex: 10,
          background: 'linear-gradient(135deg, #d4a843, #b8860b)', color: '#0a0a0a',
          padding: '4px 12px', borderRadius: 8,
          fontSize: 10, fontWeight: 900, letterSpacing: '0.8px', textTransform: 'uppercase',
          boxShadow: '0 4px 14px rgba(212,168,67,0.5)',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          🔥 Best Seller
        </div>
      )}

      {/* Image strip – protected */}
      {allImages.length > 0 ? (
        <div style={{ position: 'relative' }}>
          <div
            className="pl-img-wrap"
            onClick={() => onOpenLightbox(allImages, 0)}
            onContextMenu={e => e.preventDefault()}
            style={{
              width: '100%', paddingTop: '75%', position: 'relative',
              background: '#0f0c29', cursor: 'zoom-in', overflow: 'hidden',
              filter: soldOutFilter,
            }}
          >
            <img src={allImages[0]} alt={product.name} draggable="false"
              className="pl-protected-img"
              onContextMenu={e => e.preventDefault()}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease' }}
              onMouseEnter={e => { if (!isSoldOut) e.currentTarget.style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
            />
            {allImages.length > 1 && (
              <div style={{
                position: 'absolute', bottom: 8, right: 8,
                background: 'rgba(0,0,0,0.55)', color: 'white',
                borderRadius: 20, padding: '3px 9px', fontSize: 12, fontWeight: 600,
                backdropFilter: 'blur(4px)',
              }}>
                +{allImages.length - 1} more
              </div>
            )}
          </div>
          {/* Thumbnail strip */}
          {allImages.length > 1 && (
            <div style={{ display: 'flex', gap: 4, padding: '6px 8px', background: 'rgba(0,0,0,0.3)', overflowX: 'auto', scrollbarWidth: 'none', filter: soldOutFilter }}>
              {allImages.map((img, i) => (
                <div key={i} onClick={() => onOpenLightbox(allImages, i)}
                  onContextMenu={e => e.preventDefault()}
                  style={{
                    flexShrink: 0, width: 44, height: 44, borderRadius: 6,
                    overflow: 'hidden', cursor: 'pointer',
                    border: '2px solid ' + (i === 0 ? color : 'rgba(255,255,255,0.15)'),
                  }}>
                  <img src={img} alt="" draggable="false" className="pl-protected-img" onContextMenu={e => e.preventDefault()} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{
          width: '100%', paddingTop: '60%', position: 'relative',
          background: isSoldOut ? 'rgba(255,255,255,0.03)' : `linear-gradient(135deg, ${color}20, ${color}08)`,
          filter: soldOutFilter,
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
            <h3 style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3, color: isSoldOut ? 'rgba(255,255,255,0.35)' : '#fff', marginBottom: 2 }}>
              {product.name}
            </h3>
            {product.brand && (
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{product.brand}</p>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: isSoldOut ? 'rgba(255,255,255,0.3)' : color, lineHeight: 1, textDecoration: isSoldOut ? 'line-through' : 'none' }}>
              ${product.sell_price?.toFixed(2)}
            </p>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>per {product.unit || 'unit'}</p>
          </div>
        </div>

        {/* Per-piece pricing – shows when product is a box/case with multiple pieces */}
        {showPerPiece && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: 'linear-gradient(135deg, #eff6ff, #e0f2fe)', border: '1px solid #93c5fd',
            borderRadius: 20, padding: '4px 12px', marginBottom: 8,
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#1d4ed8' }}>
              ${pricePerPiece.toFixed(2)}/{pieceName}
            </span>
            <span style={{ fontSize: 10, color: '#3b82f6' }}>
              · {pieceCount} {pieceName}{pieceCount > 1 ? 's' : ''} in {product.unit || 'box'}
            </span>
          </div>
        )}

        {/* Price range — retail value badge */}
        {(product.price_min || product.price_max) && !isSoldOut && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: '#fef9c3', border: '1px solid #fde047',
            borderRadius: 20, padding: '3px 10px', marginBottom: 8,
            marginLeft: showPerPiece ? 6 : 0,
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
              fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
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

        {/* Add to cart / Request if sold out */}
        {isSoldOut ? (
          <button onClick={() => onSetQty(product, 1)} style={{
            width: '100%', marginTop: 8, padding: '9px 0', borderRadius: 8,
            border: '1.5px solid #cbd5e1', background: '#f8fafc', color: '#475569',
            fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#475569'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#475569' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#cbd5e1' }}
          >
            📋 Request When Available
          </button>
        ) : cartQty > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 8 }}>
            <button onClick={() => onSetQty(product, cartQty - 1)} style={{
              width: 34, height: 34, borderRadius: '8px 0 0 8px', border: '1.5px solid ' + color,
              background: 'white', color, fontWeight: 700, fontSize: 18, cursor: 'pointer',
            }}>−</button>
            <div style={{
              flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1.5px solid ${color}`, borderLeft: 'none', borderRight: 'none',
              fontWeight: 700, fontSize: 14, color: '#fff',
            }}>{cartQty}</div>
            <button onClick={() => onSetQty(product, cartQty + 1)} style={{
              width: 34, height: 34, borderRadius: '0 8px 8px 0', border: '1.5px solid ' + color,
              background: color, color: 'white', fontWeight: 700, fontSize: 18, cursor: 'pointer',
            }}>+</button>
          </div>
        ) : (
          <button onClick={() => onSetQty(product, 1)} style={{
            width: '100%', marginTop: 8, padding: '9px 0', borderRadius: 8,
            border: `1.5px solid ${color}`, background: 'transparent', color,
            fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = color; e.currentTarget.style.color = 'white'; e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = color; e.currentTarget.style.transform = 'scale(1)' }}
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
  const [logoUrl, setLogoUrl] = useState(null)
  // Cart: { productId: { product, qty } }
  const [cart, setCart] = useState({})
  const [showCart, setShowCart] = useState(false)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderSubmitted, setOrderSubmitted] = useState(false)
  const [orderForm, setOrderForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [orderLoading, setOrderLoading] = useState(false)
  const [confirmedTotal, setConfirmedTotal] = useState(0)
  const [rewards, setRewards] = useState([])
  const [rewardChoices, setRewardChoices] = useState({}) // { rewardIdx: optionIdx } – which option customer picked when tier has 2+
  const [showRewardsPopup, setShowRewardsPopup] = useState(false)

  // Fetch logo
  useEffect(() => {
    supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
      .then(({ data }) => { if (data?.value) setLogoUrl(data.value) })
    supabase.from('app_settings').select('value').eq('key', 'rewards').single()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const parsed = JSON.parse(data.value)
              .filter(r => r.threshold > 0 && (r.name || (r.options && r.options.length > 0)))
              .sort((a, b) => a.threshold - b.threshold)
            setRewards(parsed)
          } catch {}
        }
      })
  }, []) // snapshot before cart clears

  // Helper: get display name for a reward (new shape: pick from options, legacy: r.name)
  const rewardDisplay = (r, idx) => {
    if (r.options && r.options.length > 0) {
      if (r.options.length === 1) return r.options[0].name
      const chosen = rewardChoices[idx]
      if (chosen != null && r.options[chosen]) return r.options[chosen].name
      return `${r.options.map(o => o.name).join(' OR ')}`
    }
    return r.name || 'Free gift'
  }
  const rewardNeedsChoice = (r, idx) => {
    return r.options && r.options.length > 1 && rewardChoices[idx] == null
  }

  const cartCount = Object.values(cart).reduce((s, i) => s + i.qty, 0)
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.qty * i.product.sell_price, 0)

  // Reward progress based on cart total
  const earnedRewards = rewards.filter(r => cartTotal >= r.threshold)
  const nextReward = rewards.find(r => cartTotal < r.threshold)
  const nextRewardIdx = nextReward ? rewards.indexOf(nextReward) : -1
  const amountToNextReward = nextReward ? nextReward.threshold - cartTotal : 0
  const rewardProgress = nextReward ? Math.min(100, (cartTotal / nextReward.threshold) * 100) : 100

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
          // Profile not found for this username
          setNotFound(true); setLoading(false); return
        }
      }
      let q = supabase.from('products').select('id,name,brand,sell_price,price_min,price_max,image_url,images,description,category,unit,user_id,stock_qty,pieces_per_unit,piece_name,is_best_seller').eq('is_active', true).order('category').order('name')
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

      // Append earned rewards (with chosen option) to notes so admin sees it
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
        notes: orderForm.notes.trim() + rewardNote,
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
      background_color: '#0a0a0a',
      theme_color: '#d4a843',
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
      <p style={{ color: '#64748b' }}>No listing for <strong>@{username}</strong></p>
    </div>
  )

  return (
    <>
      {/* Global styles for this page */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        :root {
          --pl-bg: #0e0b08;
          --pl-bg-2: #14100c;
          --pl-paper: #f4ede0;
          --pl-ink: #1a140e;
          --pl-gold: #c9a96a;
          --pl-gold-2: #e6c989;
          --pl-gold-deep: #8c6d3d;
          --pl-terracotta: #b95a3a;
          --pl-line: rgba(201, 169, 106, 0.22);
          --pl-serif: 'Fraunces', 'Times New Roman', serif;
          --pl-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --pl-mono: 'JetBrains Mono', ui-monospace, monospace;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--pl-bg); }
        .pl-page {
          min-height: 100vh;
          font-family: var(--pl-sans);
          color: #0f172a;
          background: var(--pl-bg);
          position: relative;
        }
        .pl-page em { font-family: var(--pl-serif); font-style: italic; }
        .pl-page::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background: radial-gradient(ellipse at 20% 50%, rgba(201,169,106,0.05) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 20%, rgba(140,109,61,0.04) 0%, transparent 50%);
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(201,169,106,0.4); }
          50% { box-shadow: 0 0 24px 10px rgba(201,169,106,0.12); }
        }
        @keyframes cartBounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes pulseDot { 0% { box-shadow: 0 0 0 0 rgba(185,90,58,0.6); } 70% { box-shadow: 0 0 0 12px rgba(185,90,58,0); } 100% { box-shadow: 0 0 0 0 rgba(185,90,58,0); } }
        @keyframes tickL { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .pl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }
        @media (max-width: 500px) { .pl-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; } }
        @media (max-width: 320px) { .pl-grid { grid-template-columns: 1fr; } }
        .pl-search:focus { outline: none; border-color: var(--pl-gold) !important; box-shadow: 0 0 0 3px rgba(201,169,106,0.2); }
        .pl-pill { white-space: nowrap; border: none; cursor: pointer; transition: all 0.2s ease; }
        .pl-pill:hover { transform: translateY(-1px); }
        .pl-pill:active { transform: scale(0.95); }
        .pl-scrollbar::-webkit-scrollbar { display: none; }
        .pl-card-animate {
          animation: fadeInUp 0.5s ease both;
        }
        .pl-cat-animate {
          animation: slideInLeft 0.4s ease both;
        }
        /* Image protection */
        .pl-protected-img {
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
          pointer-events: none;
        }
        .pl-img-wrap {
          position: relative;
          user-select: none;
          -webkit-user-select: none;
        }
        .pl-img-wrap::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 2;
          background: transparent;
        }
      `}</style>

      <div className="pl-page" style={{ position: 'relative', zIndex: 1 }}>
        {/* ── ANNOUNCEMENT MARQUEE ── */}
        <div style={{ background: 'var(--pl-bg-2)', borderBottom: '1px solid var(--pl-line)', overflow: 'hidden', position: 'relative', zIndex: 60 }}>
          <div style={{ display: 'flex', gap: 50, whiteSpace: 'nowrap', animation: 'tickL 60s linear infinite', padding: '9px 0' }}>
            {[...Array(2)].flatMap((_, k) => ['CURATED PRODUCT CATALOGUE', 'SAME-DAY DELIVERY · NEW ORLEANS', 'BEAUTY · FRAGRANCE · INCENSE · LIGHTERS', '24-48 HOUR DELIVERY ACROSS THE SOUTH', 'WHOLESALE PRICING ON REQUEST'].map((t, i) => (
              <span key={`${k}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 14, font: '500 10.5px/1 var(--pl-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--pl-gold-2)', flexShrink: 0 }}>
                <span style={{ color: 'var(--pl-gold)' }}>✦</span>
                {t}
              </span>
            )))}
          </div>
        </div>

        {/* ── HERO (editorial style) ── */}
        <div style={{
          background: 'var(--pl-bg)',
          padding: 'clamp(60px, 9vw, 110px) clamp(20px, 5vw, 80px) clamp(36px, 5vw, 60px)',
          position: 'relative', overflow: 'hidden',
          borderBottom: '1px solid var(--pl-line)',
        }}>
          {/* Background watermark */}
          <div style={{ position: 'absolute', bottom: '-3vw', left: '50%', transform: 'translateX(-50%)', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontWeight: 300, fontSize: '24vw', lineHeight: 0.85, color: 'rgba(244,237,224,0.04)', letterSpacing: '-0.05em', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1 }}>
            catalogue
          </div>

          <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', textAlign: 'center', zIndex: 2 }}>
            {/* Logo / avatar */}
            {logoUrl ? (
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 32px',
                overflow: 'hidden', border: '1.5px solid var(--pl-gold)',
                boxShadow: '0 0 0 4px rgba(201,169,106,0.1)',
              }}>
                <img src={logoUrl} alt="Kanz Supply" style={{ width: '100%', height: '100%', objectFit: 'cover', background: 'var(--pl-bg)' }} draggable="false" onContextMenu={e => e.preventDefault()} />
              </div>
            ) : profile && (
              <div style={{
                width: 56, height: 56, borderRadius: '50%', margin: '0 auto 32px',
                background: 'transparent', border: '1.5px solid var(--pl-gold)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, fontWeight: 300, color: 'var(--pl-gold)',
                fontFamily: 'var(--pl-serif)', fontStyle: 'italic',
              }}>
                {displayName[0]?.toUpperCase() || 'K'}
              </div>
            )}

            {/* Eyebrow */}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, font: '500 11px/1 var(--pl-mono)', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--pl-gold-2)', marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, background: 'var(--pl-terracotta)', borderRadius: '50%', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
              {username ? `@${username} · ` : ''}Live Catalogue
            </span>

            {/* Editorial title */}
            <h1 style={{
              fontFamily: 'var(--pl-serif)', fontWeight: 300,
              fontSize: 'clamp(42px, 7vw, 96px)', lineHeight: 0.95,
              letterSpacing: '-0.025em', color: 'var(--pl-paper)',
              marginBottom: 28, maxWidth: 900, margin: '0 auto 28px',
            }}>
              {displayName ? <>{displayName}'s <em style={{ color: 'var(--pl-gold-2)' }}>collection.</em></> : <>Goods <em style={{ color: 'var(--pl-gold-2)' }}>worth selling.</em></>}
            </h1>

            <p style={{
              fontFamily: 'var(--pl-serif)', fontWeight: 300, fontSize: 'clamp(15px, 1.4vw, 18px)',
              lineHeight: 1.55, color: 'rgba(244,237,224,0.72)',
              maxWidth: 540, margin: '0 auto 36px',
            }}>
              Browse the full lineup, add to your order, and we'll come back with wholesale pricing tailored for you.
            </p>

            {/* Stats strip */}
            {products.length > 0 && (
              <div style={{ display: 'inline-flex', gap: 0, border: '1px solid var(--pl-line)', borderRadius: 999, padding: '8px 4px', background: 'rgba(201,169,106,0.04)' }}>
                <div style={{ padding: '8px 24px', borderRight: '1px solid var(--pl-line)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--pl-gold-2)', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 300 }}>{products.length}</span>
                  <span style={{ color: 'rgba(244,237,224,0.6)', font: '500 10px/1 var(--pl-mono)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Items</span>
                </div>
                <div style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--pl-gold-2)', fontFamily: 'var(--pl-serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 300 }}>{categories.length - 1}</span>
                  <span style={{ color: 'rgba(244,237,224,0.6)', font: '500 10px/1 var(--pl-mono)', letterSpacing: '0.18em', textTransform: 'uppercase' }}>Categories</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── STICKY SEARCH + FILTERS ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,10,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(212,168,67,0.12)', padding: 'clamp(10px,2vw,16px) clamp(12px,4vw,40px)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ position: 'relative', marginBottom: categories.length > 2 ? 10 : 0 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>🔍</span>
              <input
                className="pl-search"
                type="search" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search products..."
                style={{
                  width: '100%', padding: '11px 14px 11px 40px',
                  borderRadius: 12, border: '1.5px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)', fontSize: 15, color: '#fff',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s ease',
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
                      background: active ? color : 'rgba(255,255,255,0.08)',
                      color: active ? 'white' : 'rgba(255,255,255,0.6)',
                      boxShadow: active ? `0 2px 12px ${color}50` : 'none',
                      border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
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
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(16px,3vw,40px) clamp(12px,4vw,40px) 80px', position: 'relative', zIndex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.6)' }}>
              <div style={{ fontSize: 40, marginBottom: 12, animation: 'pulseGlow 2s ease-in-out infinite' }}>✨</div>
              <p>Loading products...</p>
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 80, color: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
              <p>{search ? 'No products match your search' : 'No products listed yet'}</p>
            </div>
          )}

          {!loading && Object.entries(grouped).map(([cat, items], catIdx) => {
            const { color, icon } = getCat(cat)
            return (
              <section key={cat} style={{ marginBottom: 48 }}>
                {/* Category heading */}
                <div className="pl-cat-animate" style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginBottom: 24, paddingTop: 16, borderTop: '1px solid var(--pl-line)', animationDelay: `${catIdx * 0.1}s` }}>
                  <span style={{ font: '500 11px/1 var(--pl-mono)', letterSpacing: '0.22em', color: 'var(--pl-gold-2)', flexShrink: 0 }}>№ 0{catIdx + 1}</span>
                  <h2 style={{ fontFamily: 'var(--pl-serif)', fontWeight: 300, fontStyle: 'italic', fontSize: 'clamp(22px, 3vw, 32px)', color: 'var(--pl-paper)', flex: 1, lineHeight: 1.1 }}>{cat}</h2>
                  <span style={{ font: '500 10px/1 var(--pl-mono)', letterSpacing: '0.18em', color: 'rgba(244,237,224,0.4)', flexShrink: 0 }}>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
                </div>

                <div className="pl-grid">
                  {items.map((product, pIdx) => (
                    <div key={product.id} className="pl-card-animate" style={{ animationDelay: `${catIdx * 0.1 + pIdx * 0.06}s` }}>
                      <ProductCard
                        product={product}
                        onOpenLightbox={openLightbox}
                        cartQty={cart[product.id]?.qty || 0}
                        onSetQty={setQty}
                      />
                    </div>
                  ))}
                </div>
              </section>
            )
          })}
        </main>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: '1px solid rgba(212,168,67,0.12)', padding: 'clamp(20px,3vw,32px) clamp(12px,4vw,40px)',
          textAlign: 'center', background: 'rgba(0,0,0,0.3)', position: 'relative', zIndex: 1,
        }}>
          <p style={{ fontSize: 13, color: 'rgba(212,168,67,0.4)' }}>
            Tap any product image to enlarge · Prices subject to change
          </p>
          <p style={{ fontSize: 11, color: 'rgba(212,168,67,0.25)', marginTop: 6 }}>Kanz Supply</p>
        </footer>
      </div>

      {/* ── REWARDS PEEK BUTTON (left side, always visible if rewards exist) ── */}
      {rewards.length > 0 && !showCart && !showOrderForm && !orderSubmitted && (
        <button
          onClick={() => setShowRewardsPopup(true)}
          aria-label="Show rewards"
          style={{
            position: 'fixed', bottom: 28, left: 24, zIndex: 200,
            background: 'linear-gradient(135deg, #d4a843, #b8860b)',
            color: '#0a0a0a', border: 'none', borderRadius: '50%',
            width: 56, height: 56, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 28px rgba(212,168,67,0.45)',
            fontSize: 24,
            transition: 'transform 0.2s ease',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          🎁
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#0a0a0a', color: '#f0d078',
            borderRadius: 10, fontSize: 10, fontWeight: 800,
            padding: '2px 6px', minWidth: 18, lineHeight: 1,
            border: '1.5px solid #f0d078',
          }}>{rewards.length}</span>
        </button>
      )}

      {/* ── REWARDS POPUP (closes on click outside) ── */}
      {showRewardsPopup && (
        <div
          onClick={() => setShowRewardsPopup(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(10,10,10,0.7)',
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
              border: '1.5px solid rgba(212,168,67,0.35)',
              borderRadius: 20,
              padding: '24px 24px 20px',
              maxWidth: 420, width: '100%',
              maxHeight: '85vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              marginBottom: 88,
              animation: 'slideUp 0.3s cubic-bezier(.2,.7,.2,1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, color: '#f0d078', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 6 }}>
                  Spend & Save
                </p>
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
                  Free gifts <span style={{ color: '#f0d078', fontStyle: 'italic', fontFamily: 'Fraunces, serif', fontWeight: 300 }}>with your order</span>
                </h2>
              </div>
              <button onClick={() => setShowRewardsPopup(false)} style={{
                background: 'rgba(255,255,255,0.06)', border: 'none',
                color: 'rgba(255,255,255,0.6)', width: 32, height: 32,
                borderRadius: '50%', fontSize: 18, cursor: 'pointer',
                flexShrink: 0,
              }}>✕</button>
            </div>

            {/* Tier cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {rewards.map((r, idx) => {
                const isEarned = cartTotal >= r.threshold
                const distance = r.threshold - cartTotal
                return (
                  <div key={idx} style={{
                    background: isEarned ? 'rgba(134,239,172,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1.5px solid ${isEarned ? 'rgba(134,239,172,0.4)' : 'rgba(212,168,67,0.2)'}`,
                    borderRadius: 12, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: isEarned ? '#86efac' : '#f0d078', fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                        {isEarned ? '✓ Earned' : `Spend $${r.threshold}+`}
                      </span>
                      {r.value > 0 && (
                        <span style={{ fontSize: 11, color: '#f0d078', fontWeight: 600 }}>
                          ${r.value.toFixed(2)} value
                        </span>
                      )}
                    </div>
                    {/* Show product options */}
                    {r.options && r.options.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                        {r.options.map((opt, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', background: 'rgba(0,0,0,0.3)',
                            borderRadius: 8, border: '1px solid rgba(212,168,67,0.15)',
                          }}>
                            <span style={{ color: '#d4a843', fontSize: 18 }}>🎁</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: '#fff', flex: 1 }}>{opt.name}</span>
                          </div>
                        ))}
                        {r.options.length > 1 && (
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', marginTop: 4 }}>
                            👆 Customer picks one
                          </p>
                        )}
                      </div>
                    ) : (
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>
                        🎁 {r.name || 'Free gift'}
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

            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: 16, lineHeight: 1.5 }}>
              Tap anywhere to close
            </p>
          </div>
        </div>
      )}

      {/* ── REWARD PROGRESS PILL (above FAB, only when cart has items) ── */}
      {cartCount > 0 && !showCart && !showOrderForm && !orderSubmitted && rewards.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 96, right: 24, zIndex: 199,
          maxWidth: 320,
          background: 'linear-gradient(135deg, rgba(10,10,10,0.95), rgba(26,21,0,0.95))',
          border: '1px solid rgba(212,168,67,0.3)', borderRadius: 16,
          padding: '12px 16px', boxShadow: '0 8px 28px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          animation: 'fadeUp 0.4s ease both',
        }}>
          {nextReward ? (
            <>
              <p style={{ fontSize: 11, color: '#f0d078', fontWeight: 700, marginBottom: 4, letterSpacing: 0.3 }}>
                🎁 ${amountToNextReward.toFixed(2)} away from
              </p>
              <p style={{ fontSize: 13, color: '#fff', fontWeight: 800, marginBottom: 8, lineHeight: 1.3 }}>
                {rewardDisplay(nextReward, nextRewardIdx)}
                {nextReward.value > 0 && <span style={{ color: '#d4a843', fontSize: 11, fontWeight: 600 }}> (${nextReward.value.toFixed(2)} value)</span>}
              </p>
              <div style={{ height: 6, borderRadius: 6, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <div style={{ width: `${rewardProgress}%`, height: '100%', background: 'linear-gradient(90deg, #d4a843, #f0d078)', transition: 'width 0.3s ease', borderRadius: 6 }} />
              </div>
              {earnedRewards.length > 0 && (
                <p style={{ fontSize: 10, color: '#86efac', marginTop: 6, fontWeight: 600 }}>
                  ✅ Earned: {earnedRewards.map((r, i) => rewardDisplay(r, rewards.indexOf(r))).join(', ')}
                </p>
              )}
            </>
          ) : (
            <>
              <p style={{ fontSize: 11, color: '#86efac', fontWeight: 700, marginBottom: 4 }}>
                🎉 All rewards unlocked!
              </p>
              <p style={{ fontSize: 12, color: '#fff', lineHeight: 1.4 }}>
                You've earned: {earnedRewards.map((r, i) => rewardDisplay(r, rewards.indexOf(r))).join(', ')}
              </p>
            </>
          )}
        </div>
      )}

      {/* ── CART FAB ── */}
      {cartCount > 0 && !showCart && !showOrderForm && !orderSubmitted && (
        <button
          onClick={() => setShowCart(true)}
          style={{
            position: 'fixed', bottom: 28, right: 24, zIndex: 200,
            background: 'linear-gradient(135deg, #d4a843, #b8860b)',
            color: '#0a0a0a', border: 'none', borderRadius: 32,
            padding: '14px 22px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 8px 28px rgba(212,168,67,0.4)',
            fontSize: 15, fontWeight: 700,
            animation: 'cartBounce 2s ease-in-out infinite',
          }}
        >
          <span style={{
            background: '#0a0a0a', color: '#d4a843', borderRadius: '50%',
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

              {/* Rewards progress */}
              {rewards.length > 0 && (
                <div style={{
                  padding: '14px 16px', borderRadius: 12, marginBottom: 16,
                  background: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
                  border: '1.5px solid #fde68a',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 18 }}>🎁</span>
                    <p style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>
                      {nextReward
                        ? `$${amountToNextReward.toFixed(2)} away from ${rewardDisplay(nextReward, nextRewardIdx)}`
                        : `🎉 You've unlocked all rewards!`
                      }
                    </p>
                  </div>
                  {nextReward && (
                    <>
                      <div style={{ height: 8, borderRadius: 8, background: 'rgba(146,64,14,0.12)', overflow: 'hidden', marginBottom: 8 }}>
                        <div style={{ width: `${rewardProgress}%`, height: '100%', background: 'linear-gradient(90deg, #d4a843, #b8860b)', transition: 'width 0.3s ease', borderRadius: 8 }} />
                      </div>
                      {nextReward.value > 0 && (
                        <p style={{ fontSize: 11, color: '#78350f', fontWeight: 600 }}>
                          Free gift value: ${nextReward.value.toFixed(2)}
                        </p>
                      )}
                    </>
                  )}
                  {earnedRewards.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed rgba(146,64,14,0.2)' }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>✅ Earned</p>
                      {earnedRewards.map((r, i) => {
                        const rIdx = rewards.indexOf(r)
                        const needsChoice = rewardNeedsChoice(r, rIdx)
                        return (
                          <div key={i} style={{ marginBottom: 8 }}>
                            <p style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>
                              🎁 {rewardDisplay(r, rIdx)}{r.value > 0 ? ` ($${r.value.toFixed(2)} value)` : ''}
                            </p>
                            {needsChoice && (
                              <div style={{ marginTop: 6, padding: '8px 10px', background: 'white', border: '1.5px solid #fbbf24', borderRadius: 8 }}>
                                <p style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>👇 Choose your free gift:</p>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                  {r.options.map((opt, optIdx) => (
                                    <button key={optIdx} onClick={() => setRewardChoices(p => ({ ...p, [rIdx]: optIdx }))}
                                      style={{
                                        flex: '1 1 auto', padding: '8px 12px', borderRadius: 8,
                                        border: `1.5px solid ${rewardChoices[rIdx] === optIdx ? '#16a34a' : '#fbbf24'}`,
                                        background: rewardChoices[rIdx] === optIdx ? '#dcfce7' : 'white',
                                        color: rewardChoices[rIdx] === optIdx ? '#166534' : '#92400e',
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
