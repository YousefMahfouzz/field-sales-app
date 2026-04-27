import { useState, useEffect, useRef } from 'react'
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
  const [rewards, setRewards] = useState([])
  const [heroIdx, setHeroIdx] = useState(0)
  const [navScrolled, setNavScrolled] = useState(false)
  const productsRef = useRef(null)
  const contactRef = useRef(null)
  const rewardsRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('pricelist-page')
    return () => document.body.classList.remove('pricelist-page')
  }, [])

  useEffect(() => {
    supabase.from('homepage_featured')
      .select('id, sort_order, product:products(id, name, description, image_url, images, brand, category, is_best_seller)')
      .eq('is_active', true).order('sort_order')
      .then(({ data }) => {
        setFeatured((data || []).map(f => f.product).filter(Boolean))
        setLoading(false)
      })
    supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
      .then(({ data }) => { if (data?.value) setLogo(data.value) })
    supabase.from('app_settings').select('value').eq('key', 'rewards').single()
      .then(({ data }) => {
        if (data?.value) {
          try { setRewards(JSON.parse(data.value).filter(r => r.name && r.threshold > 0).sort((a,b) => a.threshold - b.threshold)) }
          catch {}
        }
      })
  }, [])

  // Reveal-on-scroll observer
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') })
    }, { threshold: 0.12 })
    document.querySelectorAll('.reveal-section').forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [featured.length, rewards.length])

  // Nav scroll effect
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Hero rotating images (use first 4 featured product images)
  const heroImages = featured.filter(p => p.image_url).slice(0, 4).map(p => ({ url: p.image_url, label: p.category || p.brand || 'Featured' }))
  useEffect(() => {
    if (heroImages.length === 0) return
    const iv = setInterval(() => setHeroIdx(i => (i + 1) % heroImages.length), 5000)
    return () => clearInterval(iv)
  }, [heroImages.length])

  const copyEmail = () => {
    navigator.clipboard?.writeText('orders@kanzsupply.com')
    setEmailCopied(true)
    setTimeout(() => setEmailCopied(false), 2000)
  }

  // Marquee items for the announcement bar
  const announceItems = [
    'WHOLESALE DISTRIBUTION', 'LOUISIANA · MISSISSIPPI · ALABAMA · TEXAS · ARKANSAS · TENNESSEE',
    'SAME-DAY DELIVERY IN GREATER NEW ORLEANS', 'FAMILY OWNED SINCE DAY ONE',
    'BEAUTY · FRAGRANCE · INCENSE · LIGHTERS', '24-48 HOUR DELIVERY ACROSS THE SOUTH',
  ]

  return (
    <div className="ks-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300..900&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap');

        :root {
          --bg: #0e0b08;
          --bg-2: #14100c;
          --paper: #f4ede0;
          --paper-2: #ebe2cf;
          --ink: #1a140e;
          --ink-2: #3d3329;
          --gold: #c9a96a;
          --gold-2: #e6c989;
          --gold-deep: #8c6d3d;
          --rose: #c9617a;
          --terracotta: #b95a3a;
          --line: rgba(201, 169, 106, 0.22);
          --serif: 'Fraunces', 'Times New Roman', serif;
          --sans: 'Inter', system-ui, sans-serif;
          --mono: 'JetBrains Mono', ui-monospace, monospace;
        }

        body.pricelist-page { background: var(--bg) !important; color: var(--paper); margin: 0; }
        .ks-page { background: var(--bg); color: var(--paper); font-family: var(--sans); font-size: 15px; line-height: 1.55; -webkit-font-smoothing: antialiased; min-height: 100vh; position: relative; overflow-x: hidden; }
        .ks-page * { box-sizing: border-box; }
        .ks-page em { font-style: italic; font-family: var(--serif); }

        .reveal-section { opacity: 0; transform: translateY(40px); transition: opacity 1.2s cubic-bezier(.2,.6,.2,1), transform 1.2s cubic-bezier(.2,.6,.2,1); }
        .reveal-section.visible { opacity: 1; transform: none; }

        @keyframes tickL { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pulseDot { 0% { box-shadow: 0 0 0 0 rgba(185,90,58,0.6); } 70% { box-shadow: 0 0 0 12px rgba(185,90,58,0); } 100% { box-shadow: 0 0 0 0 rgba(185,90,58,0); } }
        @keyframes barGo { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        @keyframes mqIn { from { opacity: 0; transform: translateY(60%); } to { opacity: 1; transform: none; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: none; } }

        /* Image protection */
        .ks-page img { user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; pointer-events: none; }
        .ks-img-wrap { position: relative; }
        .ks-img-wrap::after { content: ''; position: absolute; inset: 0; z-index: 2; background: transparent; }

        /* ── 1. ANNOUNCEMENT ── */
        .ks-announce { background: var(--bg-2); border-bottom: 1px solid var(--line); overflow: hidden; position: relative; z-index: 60; }
        .ks-announce-track { display: flex; gap: 50px; white-space: nowrap; animation: tickL 60s linear infinite; padding: 9px 0; }
        .ks-announce-item { display: inline-flex; align-items: center; gap: 14px; font: 500 10.5px/1 var(--mono); letter-spacing: 0.18em; text-transform: uppercase; color: var(--gold-2); flex-shrink: 0; }
        .ks-announce-item .star { color: var(--gold); flex-shrink: 0; }

        /* ── 2. NAV ── */
        .ks-nav { position: sticky; top: 0; z-index: 50; background: rgba(14,11,8,0.55); backdrop-filter: blur(20px) saturate(140%); -webkit-backdrop-filter: blur(20px) saturate(140%); border-bottom: 1px solid transparent; transition: background 0.3s, border-color 0.3s; }
        .ks-nav.scrolled { background: rgba(14,11,8,0.92); border-bottom-color: var(--line); }
        .ks-nav-inner { max-width: 1500px; margin: 0 auto; padding: 18px 40px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 30px; }
        .ks-nav-l { display: flex; gap: 30px; }
        .ks-nav-link { font: 500 11px/1 var(--mono); letter-spacing: 0.2em; text-transform: uppercase; color: rgba(244,237,224,0.7); transition: color 0.2s; cursor: pointer; background: none; border: none; }
        .ks-nav-link:hover { color: var(--gold-2); }
        .ks-logo { display: flex; align-items: center; gap: 12px; cursor: pointer; }
        .ks-logo-mark { width: 32px; height: 32px; border: 1.5px solid var(--gold); color: var(--gold); font-family: var(--serif); font-style: italic; font-size: 18px; display: grid; place-items: center; border-radius: 50%; }
        .ks-logo-mark img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
        .ks-logo-word { font: 600 13px/1 var(--sans); letter-spacing: 0.32em; color: var(--paper); }
        .ks-logo-word em { font-family: var(--serif); font-weight: 400; letter-spacing: 0.05em; color: var(--gold-2); margin-left: 2px; }
        .ks-nav-r { display: flex; align-items: center; gap: 16px; justify-content: flex-end; }
        .ks-nav-cta { display: inline-flex; align-items: center; gap: 8px; padding: 11px 18px; background: var(--gold); color: var(--bg); border-radius: 999px; font: 600 11.5px/1 var(--sans); letter-spacing: 0.08em; text-transform: uppercase; transition: background 0.2s; cursor: pointer; border: none; }
        .ks-nav-cta:hover { background: var(--gold-2); }

        /* ── 3. HERO ── */
        .ks-hero { position: relative; height: calc(100vh - 90px); min-height: 640px; overflow: hidden; background: var(--bg); }
        .ks-hero-img { position: absolute; inset: 0; background-size: cover; background-position: center; opacity: 0; transition: opacity 2.5s ease; transform-origin: center; will-change: transform, opacity; filter: brightness(0.45) contrast(1.05); }
        .ks-hero-img.on { opacity: 1; animation: kenBurns 12s ease-out forwards; }
        @keyframes kenBurns {
          0% { transform: scale(1.0) translate(0, 0); }
          100% { transform: scale(1.15) translate(-2%, -1.5%); }
        }
        .ks-hero-grain { position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E"); opacity: 0.18; mix-blend-mode: overlay; pointer-events: none; }
        .ks-hero-vignette { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(14,11,8,0.55) 0%, rgba(14,11,8,0.25) 30%, rgba(14,11,8,0.4) 60%, rgba(14,11,8,0.94) 100%), radial-gradient(ellipse at 30% 50%, transparent 30%, rgba(14,11,8,0.5) 90%); }
        .ks-hero-bgmark { position: absolute; bottom: -3vw; left: 50%; transform: translateX(-50%); font-family: var(--serif); font-style: italic; font-weight: 300; font-size: 28vw; line-height: 0.85; color: rgba(244,237,224,0.06); letter-spacing: -0.05em; pointer-events: none; white-space: nowrap; z-index: 1; }
        .ks-hero-copy { position: absolute; inset: 0; z-index: 2; padding: 8vh 80px 60px 80px; display: flex; flex-direction: column; justify-content: flex-end; max-width: 1500px; margin: 0 auto; }
        .ks-hero-eyebrow { font: 500 11px/1 var(--mono); letter-spacing: 0.32em; text-transform: uppercase; color: var(--gold-2); margin-bottom: 28px; display: inline-flex; align-items: center; gap: 12px; }
        .ks-hero-eyebrow .dot { width: 7px; height: 7px; background: var(--terracotta); border-radius: 50%; display: inline-block; animation: pulseDot 2s infinite; }
        .ks-hero-title { font-family: var(--serif); font-weight: 300; font-size: clamp(48px, 9vw, 132px); line-height: 0.92; letter-spacing: -0.025em; color: var(--paper); margin-bottom: 32px; max-width: 1100px; }
        .ks-hero-title em { font-style: italic; color: var(--gold-2); font-weight: 300; }
        .ks-hero-sub { font-family: var(--serif); font-weight: 300; font-size: clamp(15px, 1.4vw, 18px); line-height: 1.5; color: rgba(244,237,224,0.78); max-width: 580px; margin-bottom: 44px; }
        .ks-hero-cta { display: flex; gap: 14px; margin-bottom: 60px; flex-wrap: wrap; }
        .ks-btn-prime { display: inline-flex; align-items: center; gap: 10px; padding: 17px 26px; background: var(--gold); color: var(--bg); border-radius: 999px; font: 600 13px/1 var(--sans); letter-spacing: 0.06em; text-transform: uppercase; transition: background 0.2s, transform 0.2s; cursor: pointer; border: none; }
        .ks-btn-prime:hover { background: var(--gold-2); transform: translateY(-1px); }
        .ks-btn-ghost { display: inline-flex; align-items: center; gap: 10px; padding: 17px 26px; border: 1px solid rgba(244,237,224,0.3); color: var(--paper); border-radius: 999px; font: 500 12px/1 var(--mono); letter-spacing: 0.18em; text-transform: uppercase; transition: border-color 0.2s, background 0.2s; cursor: pointer; background: none; }
        .ks-btn-ghost:hover { border-color: var(--gold); background: rgba(201,169,106,0.05); }

        /* Reel index */
        .ks-hero-reel { display: flex; gap: 0; border-top: 1px solid rgba(244,237,224,0.12); padding-top: 18px; max-width: 720px; }
        .ks-hero-reel-btn { flex: 1; text-align: left; padding: 10px 14px 10px 0; display: flex; flex-direction: column; gap: 4px; opacity: 0.5; transition: opacity 0.2s; border-right: 1px solid rgba(244,237,224,0.08); background: none; border-top: none; border-bottom: none; cursor: pointer; }
        .ks-hero-reel-btn:last-child { border-right: 0; }
        .ks-hero-reel-btn.on { opacity: 1; }
        .ks-hero-reel-btn .num { font: 500 10px/1 var(--mono); letter-spacing: 0.2em; color: var(--gold-2); text-align: left; }
        .ks-hero-reel-btn .lbl { font-family: var(--serif); font-style: italic; font-weight: 400; font-size: 16px; color: var(--paper); text-align: left; }
        .ks-hero-reel-btn .bar { height: 2px; background: rgba(244,237,224,0.1); margin-top: 6px; position: relative; overflow: hidden; }
        .ks-hero-reel-btn .bar .fill { position: absolute; inset: 0; background: var(--gold); transform: scaleX(0); transform-origin: left; }
        .ks-hero-reel-btn.on .bar .fill { animation: barGo 5s linear forwards; }

        .ks-hero-side { position: absolute; right: 22px; top: 50%; transform: translateY(-50%) rotate(180deg); writing-mode: vertical-rl; font: 500 10px/1 var(--mono); letter-spacing: 0.4em; color: rgba(244,237,224,0.4); display: flex; flex-direction: column; gap: 14px; z-index: 2; }

        /* ── 4. TICKER (live activity) ── */
        .ks-ticker { background: var(--paper); color: var(--ink); padding: 22px 0; overflow: hidden; border-top: 1px solid var(--gold); border-bottom: 1px solid var(--gold); position: relative; }
        .ks-ticker-track { display: flex; gap: 36px; white-space: nowrap; animation: tickL 90s linear infinite; }
        .ks-ticker-item { display: inline-flex; align-items: center; gap: 12px; font: 500 13px/1 var(--sans); flex-shrink: 0; }
        .ks-ticker-item .pulse { width: 7px; height: 7px; background: var(--terracotta); border-radius: 50%; }
        .ks-ticker-item strong { font-family: var(--mono); font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-2); font-weight: 600; }
        .ks-ticker-item .ago { font-family: var(--mono); font-size: 11px; color: var(--ink-2); opacity: 0.6; }
        .ks-ticker-item .dot { color: var(--gold-deep); font-size: 10px; }

        /* ── SECTIONS BASE ── */
        .ks-section { padding: clamp(60px, 10vw, 130px) clamp(20px, 5vw, 80px); max-width: 1500px; margin: 0 auto; position: relative; }
        .ks-sec-eyebrow { font: 500 11px/1 var(--mono); letter-spacing: 0.3em; text-transform: uppercase; color: var(--gold-2); margin-bottom: 24px; display: inline-flex; align-items: center; gap: 10px; }
        .ks-sec-eyebrow .dot { width: 6px; height: 6px; background: var(--terracotta); border-radius: 50%; display: inline-block; animation: pulseDot 2s infinite; }
        .ks-sec-title-lg { font-family: var(--serif); font-weight: 300; font-size: clamp(40px, 6vw, 96px); line-height: 0.96; letter-spacing: -0.025em; color: var(--paper); }
        .ks-sec-title-lg em { color: var(--gold-2); font-style: italic; }
        .ks-sec-sub { font-family: var(--serif); font-weight: 300; font-size: 17px; line-height: 1.55; color: rgba(244,237,224,0.72); max-width: 480px; margin-top: 28px; }
        .ks-sec-head { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 60px; margin-bottom: 70px; }

        /* Search */
        .ks-search-wrap { max-width: 580px; margin: 0 auto 56px; position: relative; }
        .ks-search-wrap .icon { position: absolute; left: 22px; top: 50%; transform: translateY(-50%); color: var(--gold-2); pointer-events: none; }
        .ks-search { width: 100%; padding: 18px 24px 18px 56px; border-radius: 999px; border: 1px solid var(--line); background: rgba(255,255,255,0.03); color: var(--paper); font-size: 16px; font-family: var(--serif); font-style: italic; outline: none; transition: border-color 0.2s; }
        .ks-search:focus { border-color: var(--gold); }
        .ks-search::placeholder { color: rgba(244,237,224,0.4); }

        /* Category pills */
        .ks-cats { display: flex; gap: 8px; overflow-x: auto; flex-wrap: wrap; justify-content: center; margin-bottom: 50px; padding-bottom: 4px; scrollbar-width: none; }
        .ks-cats::-webkit-scrollbar { display: none; }
        .ks-cat-pill { padding: 9px 18px; border-radius: 999px; cursor: pointer; font: 500 11px/1 var(--mono); letter-spacing: 0.18em; text-transform: uppercase; flex-shrink: 0; transition: all 0.2s; border: 1px solid var(--line); background: transparent; color: rgba(244,237,224,0.55); }
        .ks-cat-pill:hover { color: var(--gold-2); border-color: var(--gold-2); }
        .ks-cat-pill.on { background: var(--gold); color: var(--bg); border-color: var(--gold); }

        /* ── COLLECTIONS GRID (products) ── */
        .ks-coll-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 16px; margin-bottom: 60px; }
        .ks-coll-tile { position: relative; overflow: hidden; background: var(--bg-2); border: 1px solid var(--line); cursor: pointer; aspect-ratio: 1 / 1.15; transition: border-color 0.3s; }
        .ks-coll-tile:hover { border-color: rgba(201,169,106,0.5); }
        .ks-coll-img { position: absolute; inset: 0; background-size: cover; background-position: center; transition: transform 1.5s cubic-bezier(.2,.7,.2,1); }
        .ks-coll-tile:hover .ks-coll-img { transform: scale(1.08); }
        .ks-coll-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(14,11,8,0.05) 0%, rgba(14,11,8,0.5) 60%, rgba(14,11,8,0.92) 100%); }
        .ks-coll-corner { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: var(--gold); color: var(--bg); opacity: 0; transform: translate(8px, -8px); transition: all 0.3s; font-size: 18px; font-weight: 700; z-index: 4; }
        .ks-coll-tile:hover .ks-coll-corner { opacity: 1; transform: none; }
        .ks-coll-num { position: absolute; top: 22px; left: 22px; font: 500 10px/1 var(--mono); letter-spacing: 0.2em; color: rgba(244,237,224,0.65); z-index: 3; }
        .ks-coll-content { position: absolute; bottom: 0; left: 0; right: 0; padding: 22px; display: flex; flex-direction: column; gap: 6px; z-index: 3; }
        .ks-coll-brand { font: 500 10px/1 var(--mono); letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold-2); margin-bottom: 4px; }
        .ks-coll-en { font-family: var(--serif); font-weight: 400; font-size: clamp(20px, 2vw, 26px); line-height: 1.1; color: var(--paper); }
        .ks-coll-desc { font-size: 12px; color: rgba(244,237,224,0.55); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-top: 4px; }
        .ks-coll-best { position: absolute; top: 16px; right: 16px; padding: 4px 10px; background: var(--gold); color: var(--bg); border-radius: 4px; font: 700 9px/1 var(--mono); letter-spacing: 0.18em; text-transform: uppercase; z-index: 4; }

        /* Category divider headings */
        .ks-cat-head { display: flex; align-items: baseline; gap: 18px; margin: 60px 0 28px; padding-top: 16px; border-top: 1px solid var(--line); }
        .ks-cat-head-num { font: 500 11px/1 var(--mono); letter-spacing: 0.22em; color: var(--gold-2); flex-shrink: 0; }
        .ks-cat-head-title { font-family: var(--serif); font-weight: 300; font-style: italic; font-size: clamp(24px, 3vw, 36px); color: var(--paper); flex: 1; }
        .ks-cat-head-count { font: 500 10px/1 var(--mono); letter-spacing: 0.18em; color: rgba(244,237,224,0.4); flex-shrink: 0; }

        /* Loading skeletons */
        .ks-skel { background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(201,169,106,0.06), rgba(255,255,255,0.02)); background-size: 200% 100%; animation: shimmer 2s infinite; aspect-ratio: 1 / 1.15; border: 1px solid var(--line); }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        /* ── REWARDS (paper background section) ── */
        .ks-rewards { background: var(--paper); color: var(--ink); padding: clamp(60px, 10vw, 130px) clamp(20px, 5vw, 80px); border-top: 1px solid var(--gold-deep); border-bottom: 1px solid var(--gold-deep); position: relative; }
        .ks-rewards .ks-sec-eyebrow { color: var(--gold-deep); }
        .ks-rewards-inner { max-width: 1500px; margin: 0 auto; }
        .ks-rewards-title { font-family: var(--serif); font-weight: 300; font-size: clamp(40px, 6vw, 96px); line-height: 0.96; letter-spacing: -0.025em; color: var(--ink); }
        .ks-rewards-title em { color: var(--gold-deep); font-style: italic; }
        .ks-rewards-sub { font-family: var(--serif); font-size: 17px; line-height: 1.55; color: var(--ink-2); max-width: 480px; margin-top: 28px; }
        .ks-rewards-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 18px; margin-top: 70px; }
        .ks-reward-card { background: rgba(26,20,14,0.04); border: 1px solid rgba(140,109,61,0.2); padding: 32px 28px; position: relative; overflow: hidden; transition: all 0.4s cubic-bezier(.2,.7,.2,1); }
        .ks-reward-card:hover { background: rgba(26,20,14,0.08); border-color: var(--gold-deep); transform: translateY(-4px); }
        .ks-reward-num { font: 500 10px/1 var(--mono); letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold-deep); margin-bottom: 12px; }
        .ks-reward-thresh { font-family: var(--serif); font-weight: 300; font-size: 38px; color: var(--ink); line-height: 1; margin-bottom: 6px; }
        .ks-reward-thresh em { color: var(--gold-deep); font-style: italic; }
        .ks-reward-name { font-family: var(--serif); font-weight: 400; font-style: italic; font-size: 22px; color: var(--ink); line-height: 1.2; margin-top: 16px; margin-bottom: 8px; }
        .ks-reward-desc { font-size: 13px; line-height: 1.55; color: var(--ink-2); margin-bottom: 14px; }
        .ks-reward-img { width: 100%; height: 140px; margin: 14px 0; border: 1px solid rgba(140,109,61,0.2); position: relative; overflow: hidden; }
        .ks-reward-img img { width: 100%; height: 100%; object-fit: cover; }
        .ks-reward-value { display: inline-block; padding: 4px 12px; border: 1px solid var(--gold-deep); color: var(--gold-deep); font: 600 10px/1 var(--mono); letter-spacing: 0.18em; text-transform: uppercase; }

        /* ── PRICELIST CTA ── */
        .ks-pricelist-cta { background: var(--bg-2); padding: clamp(60px, 10vw, 130px) clamp(20px, 5vw, 80px); position: relative; overflow: hidden; }
        .ks-pricelist-cta-mark { position: absolute; bottom: -8vw; right: -3vw; font-family: var(--serif); font-style: italic; font-weight: 300; font-size: 22vw; line-height: 0.85; color: rgba(201,169,106,0.06); letter-spacing: -0.05em; pointer-events: none; }
        .ks-pricelist-cta-inner { max-width: 1500px; margin: 0 auto; position: relative; z-index: 1; text-align: center; }

        /* ── FOOTER ── */
        .ks-footer { padding: 60px clamp(20px, 5vw, 80px) 40px; border-top: 1px solid var(--line); }
        .ks-footer-inner { max-width: 1500px; margin: 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: end; }
        .ks-footer-meta { font: 500 10px/1.6 var(--mono); letter-spacing: 0.16em; text-transform: uppercase; color: rgba(244,237,224,0.4); }
        .ks-footer-meta em { color: var(--gold-2); font-family: var(--serif); }
        .ks-footer-r { text-align: right; font: 500 10px/1.6 var(--mono); letter-spacing: 0.18em; text-transform: uppercase; color: rgba(244,237,224,0.4); }

        /* ── DELIVERY ZONES ── */
        .ks-delivery { background: var(--bg); padding: clamp(60px, 10vw, 130px) clamp(20px, 5vw, 80px); }
        .ks-delivery-inner { max-width: 1500px; margin: 0 auto; }
        .ks-zone-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 16px; margin-top: 50px; }
        .ks-zone { position: relative; border: 1px solid var(--line); background: var(--bg-2); padding: 32px 28px 28px; display: flex; flex-direction: column; gap: 14px; transition: border-color 0.3s, transform 0.3s; min-height: 280px; }
        .ks-zone:hover { border-color: var(--gold); transform: translateY(-2px); }
        .ks-zone.featured { border-color: var(--terracotta); background: linear-gradient(135deg, rgba(185,90,58,0.1) 0%, transparent 60%), var(--bg-2); }
        .ks-zone-tag { font: 500 10px/1 var(--mono); letter-spacing: 0.22em; text-transform: uppercase; color: var(--gold-2); display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; padding: 6px 12px; border: 1px solid var(--line); border-radius: 2px; }
        .ks-zone.featured .ks-zone-tag { color: var(--paper); background: var(--terracotta); border-color: var(--terracotta); }
        .ks-zone-name { font-family: var(--serif); font-weight: 400; font-style: italic; font-size: 28px; color: var(--paper); line-height: 1.1; }
        .ks-zone-cities { font-size: 13.5px; color: rgba(244,237,224,0.7); line-height: 1.6; }
        .ks-zone-foot { margin-top: auto; padding-top: 18px; border-top: 1px solid var(--line); display: flex; align-items: baseline; gap: 12px; }
        .ks-zone-eta { font-family: var(--serif); font-style: italic; font-weight: 300; font-size: 36px; color: var(--gold-2); line-height: 1; letter-spacing: -0.02em; }
        .ks-zone.featured .ks-zone-eta { color: var(--terracotta); }
        .ks-zone-eta-lbl { font: 500 10px/1 var(--mono); letter-spacing: 0.18em; text-transform: uppercase; color: rgba(244,237,224,0.55); }
        @keyframes pinPulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(2.6); opacity: 0; } }
        .ks-zone-pin { position: absolute; top: 16px; right: 16px; width: 8px; height: 8px; border-radius: 50%; background: var(--gold); }
        .ks-zone.featured .ks-zone-pin { background: var(--terracotta); }
        .ks-zone.featured .ks-zone-pin::after { content: ''; position: absolute; inset: -4px; border-radius: 50%; border: 1.5px solid var(--terracotta); animation: pinPulse 2s ease-out infinite; }

        /* Responsive */
        @media (max-width: 900px) {
          .ks-nav-l { display: none; }
          .ks-nav-inner { grid-template-columns: auto 1fr; padding: 14px 20px; }
          .ks-hero-copy { padding: 7vh 24px 40px; }
          .ks-hero-side { display: none; }
          .ks-hero-reel { max-width: 100%; }
          .ks-hero-reel-btn .lbl { font-size: 13px; }
          .ks-sec-head { grid-template-columns: 1fr; gap: 24px; margin-bottom: 40px; }
          .ks-footer-inner { grid-template-columns: 1fr; gap: 16px; }
          .ks-footer-r { text-align: left; }
        }
      `}</style>

      {/* ── 1. ANNOUNCEMENT BAR ── */}
      <div className="ks-announce">
        <div className="ks-announce-track">
          {[...announceItems, ...announceItems].map((item, i) => (
            <span key={i} className="ks-announce-item">
              <span className="star">✦</span>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ── 2. NAV ── */}
      <nav className={`ks-nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="ks-nav-inner">
          <div className="ks-nav-l">
            <button className="ks-nav-link" onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}>Products</button>
            <button className="ks-nav-link" onClick={() => rewardsRef.current?.scrollIntoView({ behavior: 'smooth' })}>Rewards</button>
            <button className="ks-nav-link" onClick={() => contactRef.current?.scrollIntoView({ behavior: 'smooth' })}>Contact</button>
          </div>
          <div className="ks-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="ks-logo-mark">
              {logo
                ? <img src={logo} alt="Kanz" draggable="false" onContextMenu={e => e.preventDefault()} />
                : <span>K</span>}
            </div>
            <span className="ks-logo-word">KANZ <em>supply</em></span>
          </div>
          <div className="ks-nav-r">
            <button className="ks-nav-cta" onClick={() => navigate('/login')}>Sign In</button>
          </div>
        </div>
      </nav>

      {/* ── 3. HERO ── */}
      <section className="ks-hero">
        {heroImages.map((img, i) => (
          <div key={`${i}-${heroIdx}`} className={`ks-hero-img${i === heroIdx ? ' on' : ''}`} style={{ backgroundImage: `url(${img.url})` }} />
        ))}
        <div className="ks-hero-grain" />
        <div className="ks-hero-vignette" />
        <div className="ks-hero-bgmark">Kanz</div>

        <div className="ks-hero-side">
          <span>EST. NEW ORLEANS</span>
          <span>·</span>
          <span>WHOLESALE TRADE</span>
        </div>

        <div className="ks-hero-copy">
          <span className="ks-hero-eyebrow">
            <span className="dot" />
            Wholesale · Live Inventory
          </span>
          <h1 className="ks-hero-title">
            Goods worth <em>selling.</em><br />
            Pricing worth <em>stocking.</em>
          </h1>
          <p className="ks-hero-sub">
            Premium beauty, fragrance, incense, and convenience-store essentials for shop owners across the Gulf Coast and South — Louisiana, Mississippi, Alabama, Texas, Arkansas, and Tennessee. Family-run, family-priced.
          </p>
          <div className="ks-hero-cta">
            <button className="ks-btn-prime" onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth' })}>
              Browse Products
              <span style={{ fontSize: 14 }}>→</span>
            </button>
            <button className="ks-btn-ghost" onClick={() => setShowInquiry(true)}>
              Request a Pricelist
            </button>
          </div>

          {heroImages.length > 0 && (
            <div className="ks-hero-reel">
              {heroImages.map((img, i) => (
                <button key={i} className={`ks-hero-reel-btn${i === heroIdx ? ' on' : ''}`} onClick={() => setHeroIdx(i)}>
                  <span className="num">0{i + 1}</span>
                  <span className="lbl">{img.label}</span>
                  <span className="bar"><span className="fill" /></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── 4. TICKER (live activity) ── */}
      <div className="ks-ticker">
        <div className="ks-ticker-track">
          {[...Array(2)].flatMap(() => [
            <span key={`a${Math.random()}`} className="ks-ticker-item"><span className="pulse" /><strong>SHOP IN BATON ROUGE</strong> ordered <em>Fragrance & Incense bundle</em><span className="ago">2m ago</span></span>,
            <span key={`b${Math.random()}`} className="ks-ticker-item"><span className="dot">✦</span><strong>NEW DROP</strong> Premium Oud Incense — back in stock <span className="ago">today</span></span>,
            <span key={`c${Math.random()}`} className="ks-ticker-item"><span className="pulse" /><strong>SHOP IN HOUSTON</strong> reordered <em>Lighter case</em><span className="ago">14m ago</span></span>,
            <span key={`d${Math.random()}`} className="ks-ticker-item"><span className="dot">✦</span><strong>RESTOCKED</strong> Hair styling line — <em>13 units</em><span className="ago">1h ago</span></span>,
            <span key={`e${Math.random()}`} className="ks-ticker-item"><span className="pulse" /><strong>SHOP IN BIRMINGHAM</strong> ordered <em>Fragrance set</em><span className="ago">22m ago</span></span>,
            <span key={`f${Math.random()}`} className="ks-ticker-item"><span className="pulse" /><strong>SHOP IN MEMPHIS</strong> opened a new account<span className="ago">3h ago</span></span>,
            <span key={`g${Math.random()}`} className="ks-ticker-item"><span className="dot">✦</span><strong>NEW DROP</strong> Hair butter line — <em>now shipping</em><span className="ago">today</span></span>,
            <span key={`h${Math.random()}`} className="ks-ticker-item"><span className="pulse" /><strong>SHOP IN LITTLE ROCK</strong> reordered <em>Incense 12-pack</em><span className="ago">42m ago</span></span>,
            <span key={`i${Math.random()}`} className="ks-ticker-item"><span className="pulse" /><strong>SHOP IN JACKSON</strong> ordered <em>Beauty supply mix</em><span className="ago">1h ago</span></span>,
            <span key={`j${Math.random()}`} className="ks-ticker-item"><span className="pulse" /><strong>SHOP IN MOBILE</strong> ordered <em>Lighter & incense</em><span className="ago">2h ago</span></span>,
          ])}
        </div>
      </div>

      {/* ── 5. PRODUCTS / COLLECTIONS ── */}
      <section ref={productsRef} className="ks-section reveal-section" id="products">
        <div className="ks-sec-head">
          <div>
            <span className="ks-sec-eyebrow">
              <span className="dot" />
              The Catalog
            </span>
            <h2 className="ks-sec-title-lg">
              Stocked &<br /><em>ready to ship.</em>
            </h2>
          </div>
          <p className="ks-sec-sub" style={{ marginTop: 0 }}>
            Hand-picked products with the demand and the margin to move. Tap any item for details, then ask your rep for pricing.
          </p>
        </div>

        <div className="ks-search-wrap">
          <span className="icon">🔍</span>
          <input type="search" className="ks-search"
            placeholder="Search by name, brand, or category…"
            value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>

        {!loading && featured.length > 0 && (() => {
          const cats = ['All', ...new Set(featured.map(p => p.category).filter(Boolean))]
          if (cats.length <= 2) return null
          return (
            <div className="ks-cats">
              {cats.map(cat => (
                <button key={cat}
                  className={`ks-cat-pill${activeCategory === cat ? ' on' : ''}`}
                  onClick={() => setActiveCategory(cat)}>
                  {cat}
                </button>
              ))}
            </div>
          )
        })()}

        {loading && (
          <div className="ks-coll-grid">
            {[1,2,3,4,5,6].map(i => <div key={i} className="ks-skel" />)}
          </div>
        )}

        {!loading && featured.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'rgba(244,237,224,0.4)' }}>
            <div style={{ fontSize: 48, marginBottom: 16, fontFamily: 'var(--serif)', fontStyle: 'italic' }}>—</div>
            <p className="ks-sec-sub" style={{ margin: '0 auto' }}>Catalog updating soon. Check back shortly.</p>
          </div>
        )}

        {!loading && featured.length > 0 && (() => {
          const filteredAll = featured.filter(p =>
            (!search ||
              p.name?.toLowerCase().includes(search.toLowerCase()) ||
              p.brand?.toLowerCase().includes(search.toLowerCase()) ||
              p.category?.toLowerCase().includes(search.toLowerCase())) &&
            (activeCategory === 'All' || p.category === activeCategory)
          )
          const usedCats = activeCategory !== 'All' ? [activeCategory] : [...new Set(filteredAll.map(p => p.category || 'Other'))]

          return usedCats.map((cat, catIdx) => {
            const catProducts = filteredAll.filter(p => (p.category || 'Other') === cat)
            if (!catProducts.length) return null
            return (
              <div key={cat}>
                <div className="ks-cat-head">
                  <span className="ks-cat-head-num">№ 0{catIdx + 1}</span>
                  <span className="ks-cat-head-title">{cat}</span>
                  <span className="ks-cat-head-count">{catProducts.length} {catProducts.length === 1 ? 'item' : 'items'}</span>
                </div>
                <div className="ks-coll-grid">
                  {catProducts.map((product, i) => (
                    <div key={product.id}
                      className="ks-coll-tile"
                      onClick={() => setSelected(product)}
                      onContextMenu={e => e.preventDefault()}
                      style={{ animation: `fadeUp 0.5s ease ${i * 0.05}s both` }}>
                      {product.image_url
                        ? <div className="ks-coll-img" style={{ backgroundImage: `url(${product.image_url})` }} />
                        : <div className="ks-coll-img" style={{ background: 'linear-gradient(135deg, var(--bg), var(--bg-2))', display: 'grid', placeItems: 'center', fontSize: 64, color: 'rgba(201,169,106,0.3)' }}>
                            {product.category?.includes('Hair') ? '✄' : product.category?.includes('Honey') ? '⌬' : product.category?.includes('Incense') ? '⊹' : '◇'}
                          </div>}
                      <div className="ks-coll-overlay" />
                      {product.is_best_seller && <span className="ks-coll-best">Best Seller</span>}
                      <span className="ks-coll-num">№ {String(i + 1).padStart(2, '0')}</span>
                      <span className="ks-coll-corner">→</span>
                      <div className="ks-coll-content">
                        {product.brand && <span className="ks-coll-brand">{product.brand}</span>}
                        <span className="ks-coll-en">{product.name}</span>
                        {product.description && <span className="ks-coll-desc">{product.description}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })
        })()}
      </section>

      {/* ── 6. REWARDS (paper section) ── */}
      {rewards.length > 0 && (
        <section ref={rewardsRef} className="ks-rewards reveal-section" id="rewards">
          <div className="ks-rewards-inner">
            <div className="ks-sec-head">
              <div>
                <span className="ks-sec-eyebrow">
                  <span className="dot" />
                  Spend & Save
                </span>
                <h2 className="ks-rewards-title">
                  Bigger orders, <em>bigger bonuses.</em>
                </h2>
              </div>
              <p className="ks-rewards-sub" style={{ marginTop: 0 }}>
                Free goods added to every order based on what you spend. The more you stock, the more you save — no codes, no fine print.
              </p>
            </div>

            <div className="ks-rewards-grid">
              {rewards.map((r, i) => (
                <div key={i} className="ks-reward-card" style={{ animation: `fadeUp 0.6s ease ${i * 0.1}s both` }}>
                  <span className="ks-reward-num">Tier 0{i + 1}</span>
                  <div className="ks-reward-thresh">
                    <em>Spend</em> ${r.threshold}
                  </div>
                  {r.image_url && (
                    <div className="ks-reward-img">
                      <img src={r.image_url} alt={r.name} draggable="false" onContextMenu={e => e.preventDefault()} />
                    </div>
                  )}
                  <div className="ks-reward-name">{r.name}</div>
                  {r.description && <div className="ks-reward-desc">{r.description}</div>}
                  {r.value > 0 && <span className="ks-reward-value">${r.value.toFixed(2)} value</span>}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── DELIVERY ZONES ── */}
      <section className="ks-delivery reveal-section">
        <div className="ks-delivery-inner">
          <div className="ks-sec-head">
            <div>
              <span className="ks-sec-eyebrow">
                <span className="dot" />
                Delivery Coverage
              </span>
              <h2 className="ks-sec-title-lg">
                Stocked in <em>days,</em><br />not weeks.
              </h2>
            </div>
            <p className="ks-sec-sub" style={{ marginTop: 0 }}>
              We dispatch from New Orleans across the Gulf Coast and South. Greater New Orleans gets same-day delivery — everywhere else lands in 24–48 hours.
            </p>
          </div>

          <div className="ks-zone-grid">
            <div className="ks-zone featured">
              <span className="ks-zone-pin" />
              <span className="ks-zone-tag">★ Home Zone</span>
              <h3 className="ks-zone-name">Greater New Orleans</h3>
              <p className="ks-zone-cities">
                New Orleans · Metairie · Kenner · Gretna · Marrero · Chalmette · Slidell · Covington · Mandeville · Westwego
              </p>
              <div className="ks-zone-foot">
                <span className="ks-zone-eta">Same Day</span>
                <span className="ks-zone-eta-lbl">Order by 2 PM</span>
              </div>
            </div>

            <div className="ks-zone">
              <span className="ks-zone-pin" />
              <span className="ks-zone-tag">Zone 02</span>
              <h3 className="ks-zone-name">Louisiana & Coastal South</h3>
              <p className="ks-zone-cities">
                Baton Rouge · Lafayette · Lake Charles · Houma · Shreveport · Mobile · Biloxi · Gulfport · Hattiesburg
              </p>
              <div className="ks-zone-foot">
                <span className="ks-zone-eta">24 Hours</span>
                <span className="ks-zone-eta-lbl">Next-day arrival</span>
              </div>
            </div>

            <div className="ks-zone">
              <span className="ks-zone-pin" />
              <span className="ks-zone-tag">Zone 03</span>
              <h3 className="ks-zone-name">Extended Gulf & South</h3>
              <p className="ks-zone-cities">
                Houston · Dallas · Birmingham · Montgomery · Jackson · Tupelo · Memphis · Nashville · Little Rock · Fayetteville
              </p>
              <div className="ks-zone-foot">
                <span className="ks-zone-eta">24–48 Hrs</span>
                <span className="ks-zone-eta-lbl">Most orders ship same day</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 7. PRICELIST CTA ── */}
      <section ref={contactRef} className="ks-pricelist-cta reveal-section" id="contact">
        <div className="ks-pricelist-cta-mark">trade</div>
        <div className="ks-pricelist-cta-inner">
          <span className="ks-sec-eyebrow">
            <span className="dot" />
            Wholesale Inquiries
          </span>
          <h2 className="ks-sec-title-lg" style={{ maxWidth: 900, margin: '0 auto' }}>
            Open an account.<br /><em>Stock the shelves.</em>
          </h2>
          <p className="ks-sec-sub" style={{ margin: '32px auto 44px' }}>
            Send us your store details and we'll come back with our full wholesale catalog and your custom pricing — usually within 24 hours.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="ks-btn-prime" onClick={() => setShowInquiry(true)}>
              Request a Pricelist
              <span style={{ fontSize: 14 }}>→</span>
            </button>
            <button className="ks-btn-ghost" onClick={copyEmail}>
              {emailCopied ? '✓ Copied' : 'orders@kanzsupply.com'}
            </button>
          </div>
        </div>
      </section>

      {/* ── 8. FOOTER ── */}
      <footer className="ks-footer">
        <div className="ks-footer-inner">
          <div className="ks-footer-meta">
            <em>Kanz</em> Supply LLC — Louisiana Wholesale<br />
            ©  2026 · Family Owned · Trade Pricing
          </div>
          <div className="ks-footer-r">
            Louisiana · Mississippi · Alabama · Texas · Arkansas · Tennessee
          </div>
        </div>
      </footer>

      {/* ── INQUIRY MODAL ── */}
      {showInquiry && (
        <div onClick={() => setShowInquiry(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,11,8,0.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(12px)', fontFamily: 'var(--sans)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--paper)', color: 'var(--ink)', maxWidth: 480, width: '100%', overflow: 'hidden', border: '1px solid var(--gold-deep)' }}>
            <div style={{ background: 'var(--bg)', color: 'var(--paper)', padding: '32px 32px 28px', borderBottom: '1px solid var(--gold)' }}>
              <span style={{ font: '500 11px/1 var(--mono)', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'var(--gold-2)', display: 'block', marginBottom: 14 }}>✦ Wholesale Inquiry</span>
              <p style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 28, lineHeight: 1.1, color: 'var(--paper)' }}>
                Get our <em style={{ color: 'var(--gold-2)' }}>pricelist.</em>
              </p>
            </div>
            <div style={{ padding: '28px 32px 32px' }}>
              <div style={{ background: 'rgba(140,109,61,0.08)', border: '1px solid rgba(140,109,61,0.25)', padding: '18px 20px', marginBottom: 22 }}>
                <p style={{ font: '500 10px/1 var(--mono)', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--gold-deep)', marginBottom: 10 }}>Please Include</p>
                <ul style={{ listStyle: 'none', padding: 0, fontFamily: 'var(--serif)', fontSize: 15, color: 'var(--ink-2)', lineHeight: 1.9 }}>
                  <li>— Store name</li>
                  <li>— Store address</li>
                  <li>— Type of business</li>
                </ul>
              </div>
              <a href="mailto:orders@kanzsupply.com?subject=Pricelist Request&body=Store Name: %0AStore Address: %0AType of Business: %0A%0AAdditional Notes: "
                onClick={() => setShowInquiry(false)}
                style={{ display: 'block', width: '100%', padding: '17px', background: 'var(--ink)', color: 'var(--paper)', font: '600 12px/1 var(--sans)', letterSpacing: '0.18em', textTransform: 'uppercase', textAlign: 'center', textDecoration: 'none', marginBottom: 10, transition: 'background 0.2s' }}>
                Open Email App →
              </a>
              <button onClick={copyEmail} style={{
                width: '100%', padding: '15px', background: 'transparent',
                border: `1px solid ${emailCopied ? 'var(--gold-deep)' : 'var(--ink-2)'}`,
                color: emailCopied ? 'var(--gold-deep)' : 'var(--ink)',
                font: `${emailCopied ? '600' : '500'} 11px/1 var(--mono)`,
                letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer', marginBottom: 10,
              }}>
                {emailCopied ? '✓ Copied' : 'Copy orders@kanzsupply.com'}
              </button>
              <button onClick={() => setShowInquiry(false)} style={{ width: '100%', padding: '12px', background: 'transparent', border: 'none', color: 'rgba(26,20,14,0.5)', font: '500 11px/1 var(--mono)', letterSpacing: '0.2em', textTransform: 'uppercase', cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PRODUCT MODAL ── */}
      {selected && (
        <div onClick={() => setSelected(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(14,11,8,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, backdropFilter: 'blur(14px)', fontFamily: 'var(--sans)' }}>
          <div onClick={e => e.stopPropagation()} onContextMenu={e => e.preventDefault()} style={{ background: 'var(--bg-2)', color: 'var(--paper)', maxWidth: 560, width: '100%', overflow: 'hidden', border: '1px solid var(--line)' }}>
            {selected.image_url && (
              <div style={{ width: '100%', aspectRatio: '16 / 10', position: 'relative', background: 'var(--bg)' }}>
                <img src={selected.image_url} alt={selected.name} draggable="false" onContextMenu={e => e.preventDefault()} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 60%, rgba(14,11,8,0.6) 100%)' }} />
              </div>
            )}
            <div style={{ padding: '32px 36px 36px' }}>
              {selected.brand && <p style={{ font: '500 10px/1 var(--mono)', letterSpacing: '0.24em', textTransform: 'uppercase', color: 'var(--gold-2)', marginBottom: 12 }}>{selected.brand}</p>}
              <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 300, fontSize: 32, color: 'var(--paper)', lineHeight: 1.1, marginBottom: 16 }}>{selected.name}</h2>
              {selected.description && <p style={{ fontFamily: 'var(--serif)', fontSize: 15, lineHeight: 1.6, color: 'rgba(244,237,224,0.7)', marginBottom: 22 }}>{selected.description}</p>}
              <div style={{ background: 'rgba(201,169,106,0.06)', border: '1px solid var(--line)', padding: '14px 18px', marginBottom: 22 }}>
                <p style={{ font: '500 10px/1 var(--mono)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--gold-2)', marginBottom: 4 }}>Pricing</p>
                <p style={{ fontFamily: 'var(--serif)', fontSize: 14, color: 'rgba(244,237,224,0.75)' }}>Contact your rep for current wholesale pricing.</p>
              </div>
              <button onClick={() => { setSelected(null); setShowInquiry(true) }} className="ks-btn-prime" style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}>
                Request Pricing →
              </button>
              <button onClick={() => setSelected(null)} className="ks-btn-ghost" style={{ width: '100%', justifyContent: 'center' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
