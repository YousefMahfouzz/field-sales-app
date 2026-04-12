import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { useProducts } from '../hooks/useProducts'
import { useVisits } from '../hooks/useVisits'
import { useAuth } from '../hooks/useAuth'
import { getCurrentPosition, reverseGeocodeArea } from '../lib/geo'
import { loadGoogleMaps, loadPlaces } from '../lib/mapsLoader'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import ProductSelector from '../components/ProductSelector'

// ─────────────────────────────────────────────
// EDIT MODE — regular form, all fields visible
// ─────────────────────────────────────────────
function EditCustomerForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState({
    full_name: customer.full_name || '',
    business_name: customer.business_name || '',
    phone: customer.phone || '',
    address: customer.address || '',
    area: customer.area || '',
    status: customer.status || 'active',
    next_visit_date: customer.next_visit_date || '',
    visit_frequency_days: customer.visit_frequency_days || 30,
    wants_next: customer.wants_next || '',
    notes: customer.notes || '',
    decision_maker: customer.decision_maker || '',
    best_time: customer.best_time || '',
    decision_maker_schedule: customer.decision_maker_schedule || '',
    tags: Array.isArray(customer.tags) ? customer.tags.join(', ') : '',
    rating: customer.rating || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.full_name.trim()) { setError('Store name is required'); return }
    setLoading(true); setError('')
    try {
      await onSave({
        ...form,
        visit_frequency_days: parseInt(form.visit_frequency_days) || 30,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        rating: form.rating ? parseInt(form.rating) : null,
        lat: customer.lat, lng: customer.lng,
      })
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="page" style={{ paddingTop: 14 }}>
      {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '12px 16px', borderRadius: 8, marginBottom: 14, fontSize: 14 }}>{error}</div>}

      <p className="section-header">Store Info</p>
      <div className="form-group">
        <label className="form-label">Store / Business Name *</label>
        <input className="form-input" value={form.business_name} onChange={set('business_name')} placeholder="Store name" />
      </div>
      <div className="form-group">
        <label className="form-label">Contact Name</label>
        <input className="form-input" value={form.full_name} onChange={set('full_name')} placeholder="Your contact at this store" />
      </div>
      <div className="form-group">
        <label className="form-label">Phone</label>
        <input className="form-input" type="tel" value={form.phone} onChange={set('phone')} placeholder="+1 234 567 8900" />
      </div>
      <div className="form-group">
        <label className="form-label">Address</label>
        <input className="form-input" value={form.address} onChange={set('address')} placeholder="Street address" />
      </div>
      <div className="form-group">
        <label className="form-label">{'Area'} / Zone</label>
        <input className="form-input" value={form.area} onChange={set('area')} placeholder="e.g. Downtown, Eastside" />
      </div>

      <p className="section-header">🕐 Contact & Availability</p>
      <div className="form-group">
        <label className="form-label">{'Decision maker'} (name + role)</label>
        <input className="form-input" value={form.decision_maker} onChange={set('decision_maker')} placeholder="e.g. Mike (owner), Sarah (manager)" />
      </div>
      <div className="form-group">
        <label className="form-label">Best time to visit</label>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:8 }}>
          {['Mornings (8–12)','Afternoons (12–4)','Evenings (4–7)','Weekdays','Weekends','Mon–Fri 9–5','Anytime'].map(t => (
            <button key={t} type="button" onClick={() => setForm(f => ({ ...f, best_time: f.best_time === t ? '' : t }))}
              style={{ padding:'7px 13px', borderRadius:20, fontSize:13, cursor:'pointer', fontWeight:500,
                background: form.best_time === t ? 'var(--blue)' : 'var(--gray-light)',
                color: form.best_time === t ? 'white' : 'var(--text)',
                border: `1.5px solid ${form.best_time === t ? 'var(--blue)' : 'var(--border)'}` }}>
              {t}
            </button>
          ))}
        </div>
        <input className="form-input" value={form.best_time} onChange={set('best_time')} placeholder={'Or type custom time...'} style={{ fontSize:14 }} />
      </div>
      <div className="form-group">
        <label className="form-label">{'Extra schedule notes'}</label>
        <input className="form-input" value={form.decision_maker_schedule} onChange={set('decision_maker_schedule')} placeholder="e.g. Off every Friday, restocks Tuesdays" />
      </div>

      <p className="section-header">{'Visit Settings'}</p>
      <div className="form-group">
        <label className="form-label">{'Status'}</label>
        <select className="form-select" value={form.status} onChange={set('status')}>
          <option value="active">{'Active'}</option>
          <option value="priority">{'Priority'}</option>
          <option value="follow_up">{'Follow Up Needed'}</option>
          <option value="do_not_visit">{'Do Not Visit Yet'}</option>
          <option value="avoid">{'Avoid'}</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">{'Next Visit'}</label>
          <input className="form-input" type="date" value={form.next_visit_date || ''} onChange={set('next_visit_date')} />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label className="form-label">{'Every (days)'}</label>
          <input className="form-input" type="number" min="1" value={form.visit_frequency_days} onChange={set('visit_frequency_days')} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">{'What they want next time'}</label>
        <textarea className="form-textarea" value={form.wants_next} onChange={set('wants_next')} placeholder={'Items to bring next visit...'} style={{ minHeight: 56 }} />
      </div>
      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Any notes..." style={{ minHeight: 56 }} />
      </div>
      <div className="form-group">
        <label className="form-label">{'Tags'}</label>
        <input className="form-input" value={form.tags} onChange={set('tags')} placeholder="wholesale, loyal, new" />
      </div>
      <div className="form-group">
        <label className="form-label">Rating</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1,2,3,4,5].map(n => (
            <button key={n} type="button"
              onClick={() => setForm(f => ({ ...f, rating: f.rating === n ? '' : n }))}
              style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1.5px solid', fontSize: 18, cursor: 'pointer',
                borderColor: form.rating >= n ? '#f59e0b' : 'var(--border)',
                background: form.rating >= n ? '#fffbeb' : 'white' }}>⭐</button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 8 }}>
        {loading ? 'Saving...' : 'Save Changes'}
      </button>
      <button type="button" className="btn btn-ghost btn-full" onClick={onCancel} style={{ marginTop: 10 }}>{'Cancel'}</button>
    </form>
  )
}

// ─────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────
function StepBar({ current, total }) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '0 20px', marginBottom: 24 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 4, borderRadius: 4,
          background: i < current ? 'var(--blue)' : i === current ? 'var(--blue)' : 'var(--border)',
          opacity: i === current ? 1 : i < current ? 0.7 : 0.3 }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// NEW CUSTOMER — step by step
// ─────────────────────────────────────────────
export default function AddEditCustomerPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const { customers, addCustomer, updateCustomer } = useCustomers()
  const { products, updateProduct } = useProducts()
  const { user } = useAuth()
  const isEdit = Boolean(id)
  const customer = isEdit ? customers.find(c => c.id === id) : null

  if (isEdit && customer) {
    return (
      <div>
        <div className="page-header">
          <button onClick={() => navigate(-1)} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }}>←</button>
          <h1>Edit Customer</h1>
          <div style={{ width:36 }} />
        </div>
        <EditCustomerForm customer={customer}
          onSave={async payload => { await updateCustomer(id, payload); showToast('✅ Customer updated'); navigate(`/customers/${id}`) }}
          onCancel={() => navigate(-1)}
        />
      </div>
    )
  }

  return <NewCustomerWizard
    searchParams={searchParams} navigate={navigate}
    addCustomer={addCustomer} products={products}
    updateProduct={updateProduct} user={user}
  />
}

function NewCustomerWizard({ searchParams, navigate, addCustomer, products, updateProduct, user }) {
  const TOTAL = 7
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    business_name: searchParams.get('name') || '',
    phone: '',
    lat: searchParams.get('lat') || '',
    lng: searchParams.get('lng') || '',
    address: searchParams.get('address') || '',
    area: '',
    decision_maker: '', best_time: '', notes: '',
  })
  const [nearbyList, setNearbyList] = useState([])
  const [nearbyIdx, setNearbyIdx] = useState(0)
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const [saleOutcome, setSaleOutcome] = useState(null)
  const [callbackDate, setCallbackDate] = useState('')
  const [callbackNote, setCallbackNote] = useState('')
  const [saleItems, setSaleItems] = useState([])
  const [showProducts, setShowProducts] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const totalSale = saleItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const totalCost = saleItems.reduce((s, i) => s + i.qty * i.unit_cost, 0)

  const EXCLUDED = ['circle k', 'circlek']
  const isExcl = name => EXCLUDED.some(b => (name||'').toLowerCase().replace(/\s/g,'').includes(b))

  // Smart type label — detect from Google Places type
  const getTypeInfo = (type) => {
    switch (type) {
      case 'convenience_store': return { icon: '🏪', label: 'Convenience Store' }
      case 'gas_station': return { icon: '⛽', label: 'Gas Station' }
      case 'grocery_store': case 'grocery_or_supermarket': case 'supermarket': return { icon: '🛒', label: 'Grocery Store' }
      case 'liquor_store': return { icon: '🏬', label: 'Liquor Store' }
      case 'hair_care': return { icon: '💇', label: 'Hair Care' }
      case 'beauty_store': case 'beauty_salon': return { icon: '💄', label: 'Beauty Supply' }
      default: return { icon: '🏪', label: 'Store' }
    }
  }

  // Smart area detection from address string
  const detectAreaFromAddress = (address) => {
    if (!address) return ''
    const addr = address.toLowerCase()
    // NOLA metro area detection — check specific neighborhoods/cities first
    const areas = [
      { match: ['east new orleans', 'new orleans east', 'chef menteur', 'read blvd', 'bullard'], area: 'East New Orleans' },
      { match: ['metairie', 'veterans memorial', 'causeway blvd', 'severn ave'], area: 'Metairie' },
      { match: ['kenner', 'williams blvd'], area: 'Kenner' },
      { match: ['harvey', 'lapalco', 'manhattan blvd'], area: 'Westbank' },
      { match: ['gretna', 'belle chasse', 'terrytown', 'marrero', 'westwego'], area: 'Westbank' },
      { match: ['chalmette', 'arabi', 'meraux', 'violet'], area: 'Chalmette' },
      { match: ['slidell', 'pearl river'], area: 'Northshore' },
      { match: ['covington', 'mandeville', 'madisonville', 'abita'], area: 'Northshore' },
      { match: ['hammond', 'ponchatoula', 'amite'], area: 'Northshore' },
      { match: ['laplace', 'reserve', 'gramercy', 'gonzales'], area: 'River Parishes' },
      { match: ['baton rouge', 'br,', 'baton rouge,'], area: 'Baton Rouge' },
      { match: ['baker', 'zachary', 'denham springs'], area: 'Baton Rouge' },
      { match: ['shreveport', 'bossier'], area: 'Shreveport' },
      { match: ['monroe', 'west monroe'], area: 'Monroe' },
      { match: ['lafayette', 'broussard', 'scott'], area: 'Lafayette' },
      { match: ['lake charles', 'sulphur'], area: 'Lake Charles' },
      { match: ['houma', 'thibodaux'], area: 'Houma' },
      { match: ['mid-city', 'mid city', 'tulane', 'carrollton'], area: 'Mid-City' },
      { match: ['uptown', 'magazine st', 'prytania'], area: 'Uptown' },
      { match: ['french quarter', 'bourbon', 'royal st', 'decatur'], area: 'French Quarter' },
      { match: ['gentilly', 'elysian fields'], area: 'Gentilly' },
      { match: ['algiers'], area: 'Algiers' },
      { match: ['new orleans', 'nola'], area: 'New Orleans' },
      // Mississippi / Alabama
      { match: ['biloxi', 'gulfport', 'ocean springs', 'pascagoula', 'moss point'], area: 'MS Gulf Coast' },
      { match: ['hattiesburg'], area: 'Hattiesburg MS' },
      { match: ['jackson, ms', 'jackson,ms'], area: 'Jackson MS' },
      { match: ['mobile, al', 'mobile,al', 'prichard', 'saraland'], area: 'Mobile AL' },
      // Ohio
      { match: ['cleveland', 'east cleveland'], area: 'Cleveland' },
      { match: ['akron'], area: 'Akron' },
      { match: ['euclid'], area: 'Euclid' },
      { match: ['parma'], area: 'Parma' },
      { match: ['lorain'], area: 'Lorain' },
      { match: ['canton'], area: 'Canton' },
      { match: ['maple heights'], area: 'Maple Heights' },
      { match: ['warrensville'], area: 'Warrensville' },
    ]
    for (const { match, area } of areas) {
      if (match.some(m => addr.includes(m))) return area
    }
    return ''
  }

  // Preload Google Maps as soon as wizard mounts so it's ready when user taps GPS
  useEffect(() => { loadGoogleMaps() }, [])

  // Stable fetchNearbyPOI with useCallback
  const fetchNearbyPOI = useCallback(async (lat, lng) => {
    setNearbyLoading(true)
    setNearbyList([])
    try {
      // loadPlaces ensures PlacesService is truly ready (waits up to 5s)
      const ok = await loadPlaces()
      if (!ok) { setStep(2); return }

      const types = [
        'convenience_store', 'gas_station', 'beauty_salon',
        'grocery_store', 'supermarket', 'hair_care', 'beauty_store',
      ]
      const ORDER = {
        convenience_store: 0, gas_station: 1, beauty_salon: 2,
        grocery_store: 3, supermarket: 3, hair_care: 2, beauty_store: 2,
      }

      // Search helper — use legacy PlacesService (most compatible across API versions)
      const searchWithRadius = async (radius) => {
        const all = []
        const mapDiv = document.createElement('div')
        const tempMap = new window.google.maps.Map(mapDiv, { center: { lat, lng }, zoom: 15 })
        const service = new window.google.maps.places.PlacesService(tempMap)

        // Deduplicated types to avoid redundant calls
        const searchTypes = [...new Set(types)]
        let remaining = searchTypes.length

        await new Promise(resolve => {
          const timeout = setTimeout(resolve, 12000)
          searchTypes.forEach(type => {
            service.nearbySearch(
              { location: { lat, lng }, radius, keyword: '', type },
              (places, status, pagination) => {
                const OK = window.google.maps.places.PlacesServiceStatus.OK
                if (status === OK && places) {
                  for (const p of places.slice(0, 8)) {
                    if (isExcl(p.name)) continue
                    if (all.find(x => x.place_id === p.place_id)) continue
                    const dlat = lat - p.geometry.location.lat()
                    const dlng = lng - p.geometry.location.lng()
                    all.push({
                      name: p.name, address: p.vicinity, type,
                      place_id: p.place_id,
                      dist: Math.round(Math.sqrt(dlat*dlat + dlng*dlng) * 111000),
                      rating: p.rating
                    })
                  }
                }
                if (--remaining === 0) { clearTimeout(timeout); resolve() }
              }
            )
          })
        })
        return all
      }

      let all = await searchWithRadius(100)
      if (all.length === 0) all = await searchWithRadius(500)

      all.sort((a, b) => (ORDER[a.type] - ORDER[b.type]) || (a.dist - b.dist))
      setNearbyList(all)
      setNearbyIdx(0)
      setStep(all.length > 0 ? 1 : 2)
    } catch {
      setStep(2)
    } finally {
      setNearbyLoading(false)
    }
  }, []) // stable ref

  // Auto-trigger when GPS comes from URL params (Map → Add Customer Here)
  useEffect(() => {
    const lat = searchParams.get('lat'), lng = searchParams.get('lng')
    const urlName = searchParams.get('name')
    const urlAddr = searchParams.get('address')
    if (lat && lng) {
      const latN = parseFloat(lat), lngN = parseFloat(lng)
      setForm(f => ({
        ...f, lat, lng,
        business_name: urlName ? decodeURIComponent(urlName) : f.business_name,
        address: urlAddr ? decodeURIComponent(urlAddr) : f.address,
      }))
      // Smart area from address first, then geocode as fallback
      const smartArea = detectAreaFromAddress(urlAddr ? decodeURIComponent(urlAddr) : '')
      if (smartArea) {
        setForm(f => ({ ...f, area: f.area || smartArea }))
      } else {
        reverseGeocodeArea(latN, lngN).then(area => {
          if (area) setForm(f => ({ ...f, area: f.area || detectAreaFromAddress(area) || area }))
        })
      }
      // If name came from URL (Map POI), skip GPS + nearby search, go to step 2 or 3
      if (urlName) {
        setStep(2) // go to manual name step (pre-filled)
      } else {
        setNearbyLoading(true)
        fetchNearbyPOI(latN, lngN)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // only on mount, fetchNearbyPOI is stable

  const handleGPS = async () => {
    setGpsLoading(true)
    try {
      const pos = await getCurrentPosition()
      const lat = pos.coords.latitude.toFixed(7)
      const lng = pos.coords.longitude.toFixed(7)
      setForm(f => ({ ...f, lat, lng }))
      // Auto-fill area from GPS — try smart detection from address, then geocode
      reverseGeocodeArea(parseFloat(lat), parseFloat(lng)).then(area => {
        if (area) setForm(f => ({ ...f, area: f.area || detectAreaFromAddress(area) || area }))
      })
      await fetchNearbyPOI(parseFloat(lat), parseFloat(lng))
    } catch { showToast('Could not get location – enable GPS', 'error') }
    finally { setGpsLoading(false) }
  }

  const confirmBusiness = (biz) => {
    const smartArea = detectAreaFromAddress(biz.address)
    setForm(f => ({
      ...f,
      business_name: biz.name,
      address: biz.address || f.address,
      area: smartArea || f.area,
    }))
    setStep(3)
  }
  const rejectBusiness = () => {
    if (nearbyIdx < nearbyList.length - 1) setNearbyIdx(i => i + 1)
    else setStep(2)
  }

  const addSaleItem = ({ product, qty, unit_price, unit_cost }) => {
    setSaleItems(prev => {
      const ex = prev.findIndex(i => i.product_id === product.id)
      if (ex >= 0) { const u=[...prev]; u[ex]={...u[ex],qty:u[ex].qty+qty}; return u }
      return [...prev, { product_id:product.id, product_name:product.name, qty, unit_price, list_price:unit_price, unit_cost, image_url:product.image_url }]
    })
    showToast(`✅ ${product.name} added`)
  }
  const removeItem = idx => setSaleItems(p => p.filter((_,i) => i !== idx))
  const updateQty = (idx, v) => setSaleItems(p => p.map((it,i) => i===idx ? {...it, qty:parseInt(v)||1} : it))
  const updatePrice = (idx, v) => setSaleItems(p => p.map((it,i) => i===idx ? {...it, unit_price:parseFloat(v)||0} : it))

  const handleSave = async () => {
    if (!form.business_name.trim()) { setError('Store name is required'); return }
    if (!form.lat || !form.lng) { setError('Location is required'); return }
    setLoading(true); setError('')
    try {
      const hasSale = saleItems.length > 0
      const status = saleOutcome==='avoid' ? 'avoid' : saleOutcome==='come_back' ? 'follow_up' : 'active'
      let next_visit_date = null
      if (callbackDate) next_visit_date = callbackDate
      else if (saleOutcome !== 'avoid') {
        const d = new Date(); d.setDate(d.getDate()+30); next_visit_date = d.toISOString().split('T')[0]
      }
      const payload = {
        business_name: form.business_name,
        full_name: form.decision_maker || form.business_name,
        phone: form.phone, address: form.address, area: form.area,
        lat: parseFloat(form.lat), lng: parseFloat(form.lng),
        status, next_visit_date, visit_frequency_days: 30,
        decision_maker: form.decision_maker, best_time: form.best_time,
        notes: [form.notes, callbackNote].filter(Boolean).join('\n'),
        sale_amount: hasSale ? totalSale : 0, cost: hasSale ? totalCost : 0,
        last_visit_date: today, tags: [],
      }
      const newCustomer = await addCustomer(payload)
      const { data: visit } = await supabase.from('visits').insert([{
        customer_id:newCustomer.id, user_id:user.id,
        was_visited:true, had_sale:hasSale,
        outcome: saleOutcome||(hasSale?'sold':'no_sale'),
        sale_amount:hasSale?totalSale:0, cost:hasSale?totalCost:0,
        callback_date:callbackDate||null,
        notes:[form.notes,callbackNote].filter(Boolean).join('\n'),
      }]).select().single()

      if (hasSale && visit?.id) {
        await supabase.from('sale_items').insert(saleItems.map(item => ({
          visit_id:visit.id, user_id:user.id,
          product_id:item.product_id, product_name:item.product_name,
          qty:item.qty, unit_price:item.unit_price, unit_cost:item.unit_cost,
        })))
        for (const item of saleItems) {
          const p = products.find(p => p.id === item.product_id)
          if (p) {
            await supabase.from('products').update({ stock_qty: Math.max(0,(p.stock_qty||0)-item.qty) }).eq('id',item.product_id)
            await supabase.from('stock_movements').insert([{ user_id:user.id, product_id:item.product_id, type:'out', qty:item.qty, note:`Sale to ${newCustomer.business_name}` }])
          }
        }
      }
      showToast('✅ Customer added')
      navigate(`/customers/${newCustomer.id}`)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (showProducts) return (
    <div>
      <div className="page-header">
        <button onClick={() => setShowProducts(false)} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }}>←</button>
        <h1>Select Products</h1><div style={{ width:36 }} />
      </div>
      {saleItems.length > 0 && (
        <div style={{
          padding: '8px 16px', background: 'var(--green-light)', borderBottom: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 56, zIndex: 30,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
            🛒 {saleItems.length} item{saleItems.length !== 1 ? 's' : ''} · ${saleItems.reduce((s, i) => s + i.qty * i.unit_price, 0).toFixed(2)}
          </p>
        </div>
      )}
      <div className="page" style={{ paddingTop:12, paddingBottom: 'calc(var(--nav-height) + var(--safe-bottom) + 140px)' }}>
        <ProductSelector products={products} onAdd={addSaleItem} addedItems={saleItems} />
      </div>
      <div style={{
        position: 'fixed', bottom: 'calc(var(--nav-height) + var(--safe-bottom))', left: 0, right: 0, zIndex: 50,
        padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        <button className="btn btn-primary btn-full" onClick={() => setShowProducts(false)} style={{ fontSize: 16, padding: 14 }}>
          {saleItems.length > 0
            ? `Done · ${saleItems.length} item${saleItems.length !== 1 ? 's' : ''} · $${saleItems.reduce((s, i) => s + i.qty * i.unit_price, 0).toFixed(2)}`
            : 'Done'}
        </button>
      </div>
    </div>
  )

  const goBack = () => {
    if (step === 0) navigate(-1)
    else if (step === 1) { setNearbyIdx(0); setStep(0) }
    else if (step === 2 && nearbyList.length > 0) { setNearbyIdx(nearbyList.length-1); setStep(1) }
    else setStep(s => Math.max(0, s-1))
  }

  const Header = ({ title, sub }) => (
    <div>
      <div className="page-header">
        <button onClick={goBack} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }}>←</button>
        <div style={{ flex:1 }} /><div style={{ width:36 }} />
      </div>
      <StepBar current={step} total={TOTAL} />
      <div style={{ padding:'0 20px 18px' }}>
        <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>{title}</h2>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
    </div>
  )

  // ─── STEP 0: GPS ───
  if (step === 0) return (
    <div>
      <Header title="Where are you?" sub="Pin your location to find nearby stores" />
      <div style={{ padding:'0 20px' }}>
        {nearbyLoading && (
          <div style={{ background:'var(--blue-light)',borderRadius:12,padding:'14px 16px',marginBottom:16,display:'flex',gap:10,alignItems:'center' }}>
            <div style={{ fontSize:24,animation:'spin 1s linear infinite' }}>🔍</div>
            <div>
              <p style={{ fontWeight:700,color:'var(--blue)',fontSize:14 }}>Searching nearby stores...</p>
              <p className="text-xs text-muted">Looking for convenience stores & gas stations</p>
            </div>
          </div>
        )}
        {!nearbyLoading && (
          <>
            <button className="btn btn-primary btn-full" onClick={handleGPS} disabled={gpsLoading} style={{ padding:'16px',fontSize:17,marginBottom:14 }}>
              {gpsLoading ? '📡 Getting GPS...' : form.lat ? '🔄 Re-pin location' : '📍 Pin My Location'}
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => setStep(2)} style={{ marginTop:4 }}>
              ✏️ Enter store name manually
            </button>
          </>
        )}
        <button className="btn btn-ghost btn-full" onClick={() => navigate(-1)} style={{ marginTop:8,color:'var(--text-muted)' }}>{'Cancel'}</button>
      </div>
    </div>
  )

  // ─── STEP 1: YES/NO confirmation ───
  if (step === 1) {
    const biz = nearbyList[nearbyIdx]
    if (!biz) { setStep(2); return null }
    const { icon: typeIcon, label: typeLabel } = getTypeInfo(biz.type)
    return (
      <div>
        <Header title="Is this your store?" sub={nearbyList.length > 1 ? `${nearbyIdx+1} of ${nearbyList.length} nearby` : 'Found nearby'} />
        <div style={{ padding:'0 20px' }}>
          <div style={{ background:'white',borderRadius:20,padding:'28px 24px',border:'2px solid var(--border)',marginBottom:16,textAlign:'center',boxShadow:'0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize:52,marginBottom:12 }}>{typeIcon}</div>
            <h2 style={{ fontSize:22,fontWeight:900,marginBottom:6 }}>{biz.name}</h2>
            <p style={{ fontSize:13,color:'#64748b',marginBottom:4 }}>{typeLabel}</p>
            {biz.address && <p style={{ fontSize:12,color:'#94a3b8' }}>{biz.address}</p>}
            {biz.dist && <p style={{ fontSize:11,color:'#cbd5e1',marginTop:4 }}>~{biz.dist}m away</p>}
            {biz.rating && <p style={{ fontSize:13,color:'#f59e0b',marginTop:4 }}>⭐ {biz.rating}</p>}
          </div>
          <div style={{ display:'flex',gap:12,marginBottom:16 }}>
            <button onClick={rejectBusiness} style={{
              flex:1,padding:'18px 0',borderRadius:16,border:'2px solid #e2e8f0',background:'white',
              fontSize:16,fontWeight:700,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',gap:6,
            }}><span style={{ fontSize:28 }}>❌</span>No</button>
            <button onClick={() => confirmBusiness(biz)} style={{
              flex:1,padding:'18px 0',borderRadius:16,border:'none',background:'#16a34a',
              fontSize:16,fontWeight:700,cursor:'pointer',color:'white',display:'flex',flexDirection:'column',alignItems:'center',gap:6,
              boxShadow:'0 4px 16px rgba(22,163,74,0.35)',
            }}><span style={{ fontSize:28 }}>✅</span>Yes!</button>
          </div>
          {nearbyIdx < nearbyList.length-1 && (
            <p className="text-xs text-muted" style={{ textAlign:'center',marginBottom:12 }}>
              Tap ❌ to see next nearby ({nearbyList.length-nearbyIdx-1} more)
            </p>
          )}

          {/* Always show manual entry option with name field */}
          <div style={{ borderTop:'1px solid var(--border)',paddingTop:16,marginTop:8 }}>
            <p className="text-xs text-muted" style={{ marginBottom:8 }}>Not finding it? Type the name:</p>
            <div style={{ display:'flex',gap:8 }}>
              <input
                className="form-input"
                value={form.business_name}
                onChange={set('business_name')}
                placeholder="Type store name..."
                style={{ flex:1,fontSize:15,padding:'12px 14px' }}
              />
              <button
                onClick={() => { if (form.business_name.trim()) setStep(3); else setStep(2) }}
                style={{
                  padding:'12px 18px',borderRadius:10,border:'none',
                  background:'var(--blue)',color:'white',fontWeight:700,
                  fontSize:14,cursor:'pointer',flexShrink:0,
                }}>
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── STEP 2: Manual name ───
  if (step === 2) return (
    <div>
      <Header title="Store name?" sub="Type the name of the business" />
      <div style={{ padding:'0 20px' }}>
        {error && <div style={{ background:'var(--red-light)',color:'var(--red)',padding:'12px',borderRadius:8,marginBottom:12,fontSize:14 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Store / Business Name *</label>
          <input className="form-input" autoFocus value={form.business_name} onChange={set('business_name')}
            placeholder="e.g. Hair Kingdom, Murphy USA" style={{ fontSize:17,padding:'14px 16px' }} />
        </div>
        {/* Location status + relocate */}
        <div style={{ background: form.lat ? 'var(--green-light)' : 'var(--amber-light)', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
          <p style={{ fontSize:13, color: form.lat ? 'var(--green)' : 'var(--amber)', fontWeight:600 }}>
            {form.lat ? '📍 Location pinned' : '⚠️ No location yet'}
          </p>
          <button type="button" onClick={handleGPS} disabled={gpsLoading}
            style={{ fontSize:12, padding:'6px 12px', borderRadius:8, border:'1px solid', borderColor: form.lat ? 'var(--green)' : 'var(--amber)', background:'white', cursor:'pointer', fontWeight:600, color: form.lat ? 'var(--green)' : 'var(--amber)', whiteSpace:'nowrap' }}>
            {gpsLoading ? '📡...' : form.lat ? '🔄 Relocate' : '📍 Pin Location'}
          </button>
        </div>
        <button className="btn btn-primary btn-full" style={{ padding:'14px',fontSize:16 }}
          onClick={() => { if (!form.business_name.trim()) { setError('Enter the store name'); return } setError(''); setStep(3) }}>
          Next →
        </button>
      </div>
    </div>
  )

  // ─── STEP 3: Phone ───
  if (step === 3) return (
    <div>
      <Header title="Phone number?" sub="Optional — for quick dial from the customer card" />
      <div style={{ padding:'0 20px' }}>
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input className="form-input" type="tel" value={form.phone} onChange={set('phone')}
            placeholder="+1 234 567 8900" style={{ fontSize:17,padding:'14px 16px' }} autoFocus />
        </div>
        <button className="btn btn-primary btn-full" style={{ padding:'14px',fontSize:16 }} onClick={() => setStep(4)}>
          {form.phone ? 'Next →' : 'Skip →'}
        </button>
      </div>
    </div>
  )

  // ─── STEP 4: What happened? ───
  if (step === 4) return (
    <div>
      <Header title="What happened?" sub={form.business_name} />
      <div style={{ padding:'0 20px',display:'flex',flexDirection:'column',gap:10 }}>
        {[
          { icon:'💰', label:'Made a sale', sub:'Log what I sold', outcome:'sold', next:5 },
          { icon:'📅', label:'Come back later', sub:'They asked me to return', outcome:'come_back', next:5 },
          { icon:'🤝', label:'No sale today', sub:'Visited but no purchase', outcome:'none', next:6 },
          { icon:'⛔', label:'Not interested', sub:'Mark to avoid', outcome:'avoid', next:6 },
        ].map(({ icon, label, sub, outcome, next }) => (
          <button key={outcome} className="card card-tap"
            onClick={() => { setSaleOutcome(outcome); setStep(next) }}
            style={{ padding:'16px 18px',border:'2px solid var(--border)',textAlign:'left',display:'flex',alignItems:'center',gap:14 }}>
            <span style={{ fontSize:30 }}>{icon}</span>
            <div><p style={{ fontWeight:700,fontSize:16 }}>{label}</p><p className="text-sm text-muted">{sub}</p></div>
          </button>
        ))}
      </div>
    </div>
  )

  // ─── STEP 5: Sale items OR callback ───
  if (step === 5) {
    if (saleOutcome === 'come_back') return (
      <div>
        <div>
          <div className="page-header">
            <button onClick={goBack} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }}>←</button>
            <div style={{ flex:1 }} />
            <button
              onClick={() => setStep(6)}
              disabled={!callbackDate}
              style={{
                background: callbackDate ? 'var(--blue)' : 'var(--gray-light)',
                color: callbackDate ? 'white' : 'var(--text-muted)',
                border: 'none', borderRadius: 8, padding: '6px 14px',
                fontSize: 14, fontWeight: 700,
                cursor: callbackDate ? 'pointer' : 'default',
              }}
            >Next →</button>
          </div>
          <StepBar current={step} total={TOTAL} />
          <div style={{ padding:'0 20px 18px' }}>
            <h2 style={{ fontSize:22,fontWeight:800,marginBottom:4 }}>When to come back?</h2>
          </div>
        </div>
        <div style={{ padding:'0 20px' }}>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap',marginBottom:14 }}>
            {[{l:'Tomorrow',d:1},{l:'In 2 days',d:2},{l:'This week',d:4},{l:'Next week',d:7},{l:'2 weeks',d:14},{l:'Next month',d:30}].map(({l,d}) => {
              const dt=new Date(); dt.setDate(dt.getDate()+d); const val=dt.toISOString().split('T')[0]
              return <button key={l} onClick={() => setCallbackDate(val)} style={{
                padding:'9px 14px',borderRadius:20,fontSize:13,cursor:'pointer',
                background:callbackDate===val?'var(--blue)':'var(--gray-light)',
                color:callbackDate===val?'white':'var(--text)',
                border:`1.5px solid ${callbackDate===val?'var(--blue)':'var(--border)'}`,fontWeight:callbackDate===val?600:400,
              }}>{l}</button>
            })}
          </div>
          <div className="form-group">
            <label className="form-label">Or pick date</label>
            <input className="form-input" type="date" value={callbackDate} min={today} onChange={e => setCallbackDate(e.target.value)} />
          </div>

          {callbackDate && (
            <div style={{ background: 'var(--blue-light)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, border: '1px solid #bfdbfe' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--blue)' }}>
                📅 {new Date(callbackDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">What they said (optional)</label>
            <input className="form-input" value={callbackNote} onChange={e => setCallbackNote(e.target.value)}
              placeholder="e.g. Come back Monday morning, ask for Mike" />
          </div>

          <div className="form-group">
            <label className="form-label" style={{fontWeight:700,fontSize:15}}>Best time to visit</label>
            <p style={{fontSize:12,color:'var(--text-muted)',marginBottom:10,marginTop:2}}>
              Tap one – helps you show up at the right time
            </p>
            {/* Popular */}
            <p style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Popular</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:12}}>
              {[
                'Mornings (8–11am)','After 10am','Midday (11–2pm)',
                'Afternoons (12–4pm)','After 2pm','Late afternoon (3–6pm)',
                'Weekdays only','Anytime',
              ].map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, best_time: f.best_time === t ? '' : t }))}
                  style={{
                    padding:'8px 14px', borderRadius:20, fontSize:13, cursor:'pointer', fontWeight:600,
                    background: form.best_time === t ? 'var(--blue)' : 'var(--surface)',
                    color: form.best_time === t ? 'white' : 'var(--text)',
                    border: `2px solid ${form.best_time === t ? 'var(--blue)' : 'var(--border)'}`,
                  }}>{t}</button>
              ))}
            </div>
            {/* Specific days */}
            <p style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Specific Days</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:12}}>
              {[
                'Mon, Wed, Fri','Tue & Thu','Mon–Fri 9–5',
                'Saturdays','Weekends','Avoid Mondays','Avoid Fridays',
              ].map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, best_time: f.best_time === t ? '' : t }))}
                  style={{
                    padding:'8px 14px', borderRadius:20, fontSize:13, cursor:'pointer', fontWeight:500,
                    background: form.best_time === t ? '#7c3aed' : 'var(--surface)',
                    color: form.best_time === t ? 'white' : 'var(--text)',
                    border: `1.5px solid ${form.best_time === t ? '#7c3aed' : 'var(--border)'}`,
                  }}>{t}</button>
              ))}
            </div>
            {/* Conditions */}
            <p style={{fontSize:11,fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Conditions</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:12}}>
              {[
                'When owner is in','Call first','Morning rush over',
                'After lunch rush','Not during rush hour','Early bird (before 9am)',
              ].map(t => (
                <button key={t} type="button"
                  onClick={() => setForm(f => ({ ...f, best_time: f.best_time === t ? '' : t }))}
                  style={{
                    padding:'8px 14px', borderRadius:20, fontSize:13, cursor:'pointer', fontWeight:500,
                    background: form.best_time === t ? '#059669' : 'var(--surface)',
                    color: form.best_time === t ? 'white' : 'var(--text)',
                    border: `1.5px solid ${form.best_time === t ? '#059669' : 'var(--border)'}`,
                  }}>{t}</button>
              ))}
            </div>
            {form.best_time && (
              <div style={{background:'var(--blue)',color:'white',borderRadius:10,padding:'8px 14px',marginBottom:10,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:13,fontWeight:600}}>{form.best_time}</span>
                <button type="button" onClick={() => setForm(f => ({...f, best_time:''}))}
                  style={{background:'none',border:'none',color:'white',fontSize:18,cursor:'pointer',padding:'0 4px'}}>×</button>
              </div>
            )}
            <input className="form-input" value={form.best_time} onChange={e => setForm(f => ({...f, best_time: e.target.value}))}
              placeholder="Or type custom... e.g. Tuesdays after noon" style={{fontSize:14}} />
          </div>
          <button className="btn btn-ghost btn-full" onClick={() => setStep(6)} style={{ marginTop:8, marginBottom: 40 }}>Skip, just log</button>
        </div>
      </div>
    )
    return (
      <div>
        <Header title="What did you sell?" />
        <div style={{ padding:'0 20px' }}>
          {saleItems.length === 0 && <div style={{ textAlign:'center',padding:'20px 0' }}><div style={{ fontSize:36,marginBottom:8 }}>📦</div><p className="text-sm text-muted">No products added</p></div>}
          {saleItems.map((item,idx) => (
            <div key={idx} style={{ border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',marginBottom:8 }}>
              <div className="flex justify-between items-center" style={{ marginBottom:8 }}>
                <p style={{ fontWeight:600,fontSize:14 }}>{item.product_name}</p>
                <button onClick={() => removeItem(idx)} style={{ background:'none',border:'none',color:'var(--red)',fontSize:20,cursor:'pointer' }}>×</button>
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <div style={{ flex:1 }}><p className="text-xs text-muted" style={{ marginBottom:3 }}>Qty</p>
                  <input type="number" min="1" value={item.qty} onChange={e => updateQty(idx,e.target.value)} style={{ width:'100%',padding:'7px 10px',border:'1px solid var(--border)',borderRadius:8,fontSize:14 }} /></div>
                <div style={{ flex:1.5 }}><p className="text-xs text-muted" style={{ marginBottom:3 }}>Price</p>
                  <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updatePrice(idx,e.target.value)} style={{ width:'100%',padding:'7px 10px',borderRadius:8,fontSize:14,fontWeight:600,border:'1px solid var(--border)' }} /></div>
                <div style={{ flex:1,textAlign:'right' }}><p className="text-xs text-muted" style={{ marginBottom:3 }}>Total</p>
                  <p style={{ fontWeight:700,color:'var(--green)',fontSize:15,paddingTop:10 }}>${(item.qty*item.unit_price).toFixed(2)}</p></div>
              </div>
            </div>
          ))}
          {saleItems.length > 0 && <div style={{ background:'var(--green-light)',borderRadius:10,padding:'10px 14px',marginBottom:10 }}>
            <div className="flex justify-between text-sm"><span className="text-muted">Total</span><span style={{ fontWeight:700 }}>${totalSale.toFixed(2)}</span></div>
          </div>}
          <button className="btn btn-ghost btn-full" onClick={() => setShowProducts(true)} style={{ marginBottom:10 }}>+ Add Product</button>
          <button className="btn btn-primary btn-full" onClick={() => setStep(6)} disabled={saleItems.length===0} style={{ padding:'14px',fontSize:16 }}>
            {saleItems.length > 0 ? `Next → (${saleItems.length} item${saleItems.length>1?'s':''})` : 'Add at least one product'}
          </button>
          <button className="btn btn-ghost btn-full" onClick={() => { setSaleOutcome('none'); setStep(6) }} style={{ marginTop:8 }}>Skip</button>
        </div>
      </div>
    )
  }

  // ─── STEP 6: {'Decision maker'} + save ───
  if (step === 6) return (
    <div>
      <Header title="Who's the decision maker?" sub="Optional — helps you know who to ask for next time" />
      <div style={{ padding:'0 20px' }}>
        {error && <div style={{ background:'var(--red-light)',color:'var(--red)',padding:'12px',borderRadius:8,marginBottom:12,fontSize:14 }}>{error}</div>}
        <div className="form-group">
          <label className="form-label">Name + role <span className="text-muted" style={{ fontWeight:400 }}>(optional)</span></label>
          <input className="form-input" value={form.decision_maker} onChange={set('decision_maker')} placeholder="e.g. Mike (owner), Sarah (manager)" />
        </div>
        <div style={{ background:'var(--gray-light)',borderRadius:12,padding:'12px 14px',marginBottom:16 }}>
          <p style={{ fontWeight:700,fontSize:14,marginBottom:4 }}>{form.business_name}</p>
          <p className="text-xs text-muted">
            {saleOutcome==='sold'&&saleItems.length>0 ? `💰 Sale: $${totalSale.toFixed(2)}` :
             saleOutcome==='come_back' ? `📅 Follow-up${callbackDate?': '+new Date(callbackDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}` :
             saleOutcome==='avoid' ? '⛔ Marked to avoid' : '🤝 Logged, no sale'}
          </p>
        </div>
        <button className="btn btn-primary btn-full" onClick={handleSave} disabled={loading} style={{ padding:'14px',fontSize:16 }}>
          {loading ? 'Saving...' : '✅ Save Customer'}
        </button>
      </div>
    </div>
  )
  return null
}
