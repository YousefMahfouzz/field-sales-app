import { useState, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { useVisits } from '../hooks/useVisits'
import { useProducts } from '../hooks/useProducts'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import ProductSelector from '../components/ProductSelector'

export default function VisitLogPage() {
  const { customerId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { customers, updateCustomer } = useCustomers()
  const { logVisit } = useVisits()
  const { products, updateProduct } = useProducts()

  const customer = customers.find(c => c.id === customerId)

  // mode: 'visit' = full log visit flow, 'sale' = jump straight to sale recording
  const mode = searchParams.get('mode') || 'visit'

  const [step, setStep] = useState(mode === 'sale' ? 'sale' : 'visit') 
  // steps: 'visit' → 'outcome' → 'sale' → 'done'
  // for sale mode: 'sale' → 'done'

  const [wasVisited, setWasVisited] = useState(mode === 'sale' ? true : true)
  const [outcome, setOutcome] = useState(null) // 'sold' | 'no_sale' | 'come_back' | 'avoid'
  const [notes, setNotes] = useState('')
  const [callbackDate, setCallbackDate] = useState('') // for "come back on..."
  const [callbackNote, setCallbackNote] = useState('')
  const [saleItems, setSaleItems] = useState([])
  const [showProducts, setShowProducts] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [visitGps, setVisitGps] = useState(null)
  const [savedVisitId, setSavedVisitId] = useState(null)
  const [undoing, setUndoing] = useState(false)

  // Silently capture GPS when visit page opens
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setVisitGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}, // silently fail
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      )
    }
  }, [])

  const today = new Date().toISOString().split('T')[0]
  const totalSale = saleItems.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const totalCost = saleItems.reduce((s, i) => s + i.qty * i.unit_cost, 0)
  const totalProfit = totalSale - totalCost

  const addSaleItem = ({ product, qty, unit_price, unit_cost }) => {
    setSaleItems(prev => {
      const existing = prev.findIndex(i => i.product_id === product.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = { ...updated[existing], qty: updated[existing].qty + qty }
        return updated
      }
      return [...prev, {
        product_id: product.id, product_name: product.name,
        qty, unit_price, unit_cost,
        list_price: unit_price,
        image_url: product.image_url,
      }]
    })
    // Don't close – let user keep adding more products
    showToast(`✅ ${product.name} added`)
  }

  const removeSaleItem = idx => setSaleItems(prev => prev.filter((_, i) => i !== idx))
  const updateQty = (idx, val) => setSaleItems(prev => prev.map((item, i) => i === idx ? { ...item, qty: parseInt(val) || 1 } : item))
  const updatePrice = (idx, val) => setSaleItems(prev => prev.map((item, i) => i === idx ? { ...item, unit_price: parseFloat(val) || 0 } : item))

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const hasSale = saleItems.length > 0
      const visitData = {
        customer_id: customerId,
        user_id: user.id,
        was_visited: mode === 'sale' ? true : wasVisited,
        had_sale: hasSale,
        outcome: outcome || (hasSale ? 'sold' : 'no_sale'),
        notes: [notes, callbackNote].filter(Boolean).join('\n'),
        sale_amount: hasSale ? totalSale : 0,
        cost: hasSale ? totalCost : 0,
        callback_date: callbackDate || null,
        visit_lat: visitGps?.lat || null,
        visit_lng: visitGps?.lng || null,
      }

      // Insert visit
      const { data: visit, error: visitError } = await supabase
        .from('visits').insert([visitData]).select().single()
      if (visitError) throw visitError

      // Insert sale items
      if (hasSale && visit?.id) {
        await supabase.from('sale_items').insert(
          saleItems.map(item => ({
            visit_id: visit.id, user_id: user.id,
            product_id: item.product_id, product_name: item.product_name,
            qty: item.qty, unit_price: item.unit_price, unit_cost: item.unit_cost,
          }))
        )
        // Deduct stock for each product
        for (const item of saleItems) {
          const product = products.find(p => p.id === item.product_id)
          if (product) {
            const newQty = Math.max(0, (product.stock_qty || 0) - item.qty)
            await updateProduct(item.product_id, { stock_qty: newQty })
            await supabase.from('stock_movements').insert([{
              user_id: user.id, product_id: item.product_id,
              type: 'out', qty: item.qty,
              note: `Sale to ${customer?.full_name || 'customer'}`,
            }])
          }
        }
      }

      // Update customer record
      const customerUpdates = {
        last_visit_date: today,
        status: outcome === 'avoid' ? 'avoid' : customer?.status === 'do_not_visit' ? 'active' : customer?.status,
      }
      if (hasSale) {
        customerUpdates.sale_amount = (customer?.sale_amount || 0) + totalSale
        customerUpdates.cost = (customer?.cost || 0) + totalCost
      }
      // Set next visit date
      if (callbackDate) {
        customerUpdates.next_visit_date = callbackDate
      } else if (hasSale) {
        // Sale: always schedule 30 days out automatically
        const next = new Date()
        next.setDate(next.getDate() + 30)
        customerUpdates.next_visit_date = next.toISOString().split('T')[0]
      }
      // No sale + no callback date: leave next_visit_date as-is (keep whatever was manually set)
      await updateCustomer(customerId, customerUpdates)

      setSavedVisitId(visit?.id || null)
      showToast(hasSale ? `💰 Sale saved – $${totalSale.toFixed(2)}` : '✅ Visit logged')
      setDone(true)
    } catch (err) {
      showToast('❌ ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ─── UNDO ───
  const handleUndo = async () => {
    if (!savedVisitId) return
    setUndoing(true)
    try {
      // Soft-delete the visit
      await supabase.from('visits').update({ deleted_at: new Date().toISOString() }).eq('id', savedVisitId)
      // Delete associated sale items
      await supabase.from('sale_items').delete().eq('visit_id', savedVisitId)
      // Restore stock for sold items
      for (const item of saleItems) {
        const product = products.find(p => p.id === item.product_id)
        if (product) {
          await updateProduct(item.product_id, { stock_qty: (product.stock_qty || 0) + item.qty })
        }
      }
      // Revert customer sale totals
      if (saleItems.length > 0) {
        await updateCustomer(customerId, {
          sale_amount: Math.max(0, (customer?.sale_amount || 0) - totalSale),
          cost: Math.max(0, (customer?.cost || 0) - totalCost),
        })
      }
      navigate(`/customers/${customerId}`)
    } catch (err) {
      showToast('Undo failed: ' + err.message, 'error')
    } finally {
      setUndoing(false)
    }
  }

  // ─── DONE SCREEN ───
  // Find next suggested customer (due today or available, excluding current)
  const nextCustomer = (() => {
    const today = new Date().toLocaleDateString('en-CA')
    const hour = new Date().getHours() + new Date().getMinutes() / 60
    const candidates = customers.filter(c =>
      c.id !== customerId &&
      c.status !== 'avoid' &&
      c.status !== 'do_not_visit' &&
      (c.next_visit_date === today || (c.next_visit_date && c.next_visit_date < today) || (!c.next_visit_date || c.next_visit_date <= today) && hour >= 10 && hour < 15)
    )
    // Prioritize: due today first, then overdue, then available
    candidates.sort((a, b) => {
      const aToday = a.next_visit_date === today ? 0 : 1
      const bToday = b.next_visit_date === today ? 0 : 1
      if (aToday !== bToday) return aToday - bToday
      return (a.next_visit_date || '9999').localeCompare(b.next_visit_date || '9999')
    })
    return candidates[0] || null
  })()

  if (done) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ fontSize: 64, marginBottom: 12 }}>
        {outcome === 'come_back' ? '📅' : outcome === 'avoid' ? '⛔' : saleItems.length > 0 ? '💰' : '✅'}
      </div>
      <h2 style={{ marginBottom: 6 }}>
        {outcome === 'come_back' ? 'Follow-up scheduled!' : outcome === 'avoid' ? 'Marked to avoid' : saleItems.length > 0 ? 'Sale logged!' : 'Visit logged!'}
      </h2>
      <p className="text-muted text-sm" style={{ textAlign: 'center', marginBottom: 20 }}>
        {customer?.full_name}
        {callbackDate ? ` · Come back ${new Date(callbackDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
      </p>
      {saleItems.length > 0 && (
        <div className="card" style={{ width: '100%', maxWidth: 320, marginBottom: 20, background: 'var(--green-light)' }}>
          <p className="text-xs text-muted" style={{ marginBottom: 8 }}>{'Sale summary'}</p>
          {saleItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm" style={{ marginBottom: 4 }}>
              <span>{item.qty}× {item.product_name}</span>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 600 }}>${(item.qty * item.unit_price).toFixed(2)}</span>
                {item.list_price > 0 && item.unit_price !== item.list_price && (
                  <span style={{ fontSize: 10, marginLeft: 4, color: item.unit_price < item.list_price ? 'var(--red)' : 'var(--green)' }}>
                    {item.unit_price < item.list_price ? '▼' : '▲'}
                  </span>
                )}
              </div>
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 8 }}>
            <div className="flex justify-between text-sm"><span className="text-muted">Total</span><span style={{ fontWeight: 700 }}>${totalSale.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted">Profit</span><span style={{ fontWeight: 700, color: 'var(--green)' }}>${totalProfit.toFixed(2)}</span></div>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 320 }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => navigate('/')}>🏠 Home</button>
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => navigate(`/customers/${customerId}`)}>👤 Profile</button>
      </div>

      {/* Next customer suggestion */}
      {nextCustomer && (
        <div style={{ width: '100%', maxWidth: 320, marginTop: 16 }}>
          <p className="text-xs text-muted" style={{ marginBottom: 6, textAlign: 'center' }}>Next up</p>
          <div
            onClick={() => navigate(`/visit/${nextCustomer.id}`)}
            style={{
              padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
              background: 'var(--blue-light)', border: '1.5px solid #bfdbfe',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue-dark)' }}>
                {nextCustomer.business_name || nextCustomer.full_name}
              </p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {nextCustomer.area || ''}
                {nextCustomer.wants_next ? ` · 📋 ${nextCustomer.wants_next}` : ''}
              </p>
            </div>
            <span style={{ color: 'var(--blue)', fontWeight: 700, fontSize: 13, flexShrink: 0, marginLeft: 8 }}>
              Log Visit →
            </span>
          </div>
        </div>
      )}
      {savedVisitId && (
        <button
          onClick={handleUndo}
          disabled={undoing}
          style={{
            marginTop: 16, background: 'none', border: 'none',
            color: 'var(--red)', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', opacity: undoing ? 0.5 : 0.7,
            textDecoration: 'underline',
          }}>
          {undoing ? 'Undoing...' : '↩ Undo this visit'}
        </button>
      )}
    </div>
  )

  // ─── PRODUCT SELECTOR MODAL ───
  if (showProducts) return (
    <div>
      <div className="page-header">
        <button onClick={() => setShowProducts(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <h1>{'Select Products'}</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Running cart summary */}
      {saleItems.length > 0 && (
        <div style={{
          padding: '8px 16px', background: 'var(--green-light)', borderBottom: '1px solid #bbf7d0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 56, zIndex: 30,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>
            🛒 {saleItems.length} item{saleItems.length !== 1 ? 's' : ''} · ${saleItems.reduce((s, i) => s + i.qty * i.unit_price, 0).toFixed(2)}
          </p>
          <p className="text-xs text-muted">
            {saleItems.map(i => i.product_name.split(' ')[0]).join(', ')}
          </p>
        </div>
      )}

      <div className="page" style={{ paddingTop: 12, paddingBottom: 90 }}>
        <ProductSelector products={products} onAdd={addSaleItem} addedItems={saleItems} />
      </div>

      {/* Fixed Done button — always visible */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: '12px 16px calc(12px + var(--safe-bottom))',
        borderTop: '1px solid var(--border)', background: 'var(--surface)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        <button
          className="btn btn-primary btn-full"
          onClick={() => setShowProducts(false)}
          style={{ fontSize: 16, padding: 14 }}
        >
          {saleItems.length > 0
            ? `Done · ${saleItems.length} item${saleItems.length !== 1 ? 's' : ''} · $${saleItems.reduce((s, i) => s + i.qty * i.unit_price, 0).toFixed(2)}`
            : 'Done'}
        </button>
      </div>
    </div>
  )

  // ─── STEP: VISIT ─── (was_visited question, skip if mode=sale)
  if (step === 'visit') return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{customer?.business_name || customer?.full_name}</p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div className="page" style={{ paddingTop: 24 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 6 }}>Did you get inside?</h2>
        <p className="text-sm text-muted" style={{ textAlign: 'center', marginBottom: 28 }}>Were you able to meet with someone?</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            className="card card-tap"
            onClick={() => { setWasVisited(true); setStep('outcome') }}
            style={{ padding: '16px 20px', border: '2px solid var(--border)', textAlign: 'left' }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>✅</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Yes, I got in</p>
            <p className="text-sm text-muted">Spoke with someone at the store</p>
          </button>

          <button
            className="card card-tap"
            onClick={() => { setWasVisited(false); setStep('outcome') }}
            style={{ padding: '16px 20px', border: '2px solid var(--border)', textAlign: 'left' }}
          >
            <div style={{ fontSize: 28, marginBottom: 4 }}>🚪</div>
            <p style={{ fontWeight: 700, fontSize: 16 }}>Couldn't get in</p>
            <p className="text-sm text-muted">Closed, busy, or no one available</p>
          </button>
        </div>
      </div>
    </div>
  )

  // ─── STEP: OUTCOME ─── (what happened during the visit)
  if (step === 'outcome') return (
    <div>
      <div className="page-header">
        <button onClick={() => wasVisited ? setStep('visit') : navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{customer?.business_name || customer?.full_name}</p>
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div className="page" style={{ paddingTop: 24 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 6 }}>What happened?</h2>
        <p className="text-sm text-muted" style={{ textAlign: 'center', marginBottom: 24 }}>
          {wasVisited ? 'How did the visit go?' : 'What should happen next?'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {wasVisited && (
            <button
              className="card card-tap"
              onClick={() => { setOutcome('sold'); setStep('sale') }}
              style={{ padding: '14px 18px', border: '2px solid var(--border)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <span style={{ fontSize: 28 }}>💰</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>{'Made a sale'}</p>
                <p className="text-sm text-muted">{'Log what you sold'}</p>
              </div>
            </button>
          )}

          <button
            className="card card-tap"
            onClick={() => { setOutcome('come_back'); setStep('callback') }}
            style={{ padding: '14px 18px', border: '2px solid var(--border)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <span style={{ fontSize: 28 }}>📅</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{wasVisited ? 'Come back later' : 'Schedule follow-up'}</p>
              <p className="text-sm text-muted">They asked you to return another day</p>
            </div>
          </button>

          {wasVisited && (
            <button
              className="card card-tap"
              onClick={() => { setOutcome('no_sale'); setStep('notes') }}
              style={{ padding: '14px 18px', border: '2px solid var(--border)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}
            >
              <span style={{ fontSize: 28 }}>🤝</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 15 }}>Visited, no sale</p>
                <p className="text-sm text-muted">Met them but didn't sell anything</p>
              </div>
            </button>
          )}

          <button
            className="card card-tap"
            onClick={() => { setOutcome('avoid'); setStep('notes') }}
            style={{ padding: '14px 18px', border: '2px solid var(--border)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}
          >
            <span style={{ fontSize: 28 }}>⛔</span>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>Not interested / Avoid</p>
              <p className="text-sm text-muted">Mark to stop visiting</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )

  // ─── STEP: CALLBACK ─── (pick a date to come back)
  if (step === 'callback') return (
    <div>
      <div className="page-header">
        <button onClick={() => setStep('outcome')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <h1>When to come back?</h1>
        <div style={{ width: 36 }} />
      </div>
      <div className="page" style={{ paddingTop: 20, paddingBottom: 120 }}>
        <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
          Set a follow-up date. This will update their next visit date.
        </p>

        {/* Quick date options */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {(() => {
            const now = new Date()
            const dow = now.getDay()
            const daysToFriday = dow <= 5 ? (5 - dow) : 6
            const daysToNextMon = dow === 0 ? 1 : (8 - dow)
            return [
              { label: 'Tomorrow', days: 1 },
              { label: 'In 2 days', days: 2 },
              ...(daysToFriday > 2 ? [{ label: 'This Friday', days: daysToFriday }] : []),
              { label: 'Next Monday', days: daysToNextMon },
              { label: '2 weeks', days: 14 },
              { label: '1 month', days: 30 },
            ]
          })().map(({ label, days }) => {
            const d = new Date(); d.setDate(d.getDate() + days)
            const val = d.toISOString().split('T')[0]
            return (
              <button key={label} onClick={() => setCallbackDate(val)}
                style={{
                  padding: '8px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  background: callbackDate === val ? 'var(--blue)' : 'var(--gray-light)',
                  color: callbackDate === val ? 'white' : 'var(--text)',
                  border: `1.5px solid ${callbackDate === val ? 'var(--blue)' : 'var(--border)'}`,
                  fontWeight: callbackDate === val ? 600 : 400,
                }}>
                {label}
              </button>
            )
          })}
        </div>

        <div className="form-group">
          <label className="form-label">Or pick a specific date</label>
          <input className="form-input" type="date" value={callbackDate} min={today}
            onChange={e => setCallbackDate(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">What they said (optional)</label>
          <input className="form-input" value={callbackNote} onChange={e => setCallbackNote(e.target.value)}
            placeholder="e.g. Come back Monday morning, ask for Mike" />
        </div>
      </div>

      {/* Fixed bottom buttons — always visible */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        padding: '12px 16px calc(12px + var(--safe-bottom))',
        borderTop: '1px solid var(--border)', background: 'var(--surface)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
      }}>
        <button
          className="btn btn-primary btn-full"
          onClick={() => setStep('notes')}
          disabled={!callbackDate}
        >
          {callbackDate
            ? `Set follow-up → ${new Date(callbackDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
            : 'Pick a date above'}
        </button>
        <button className="btn btn-ghost btn-full" onClick={() => setStep('notes')} style={{ marginTop: 8 }}>
          Skip date, just log
        </button>
      </div>
    </div>
  )

  // ─── STEP: SALE ─── (log products sold)
  if (step === 'sale') return (
    <div>
      <div className="page-header">
        <button onClick={() => mode === 'sale' ? navigate(-1) : setStep('outcome')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ fontSize: 18 }}>{'Log Sale'}</h1>
          <p className="text-xs text-muted">{customer?.full_name}</p>
        </div>
        <div style={{ width: 36 }} />
      </div>
      <div className="page" style={{ paddingTop: 14 }}>

        {/* Wants next reminder */}
        {customer?.wants_next && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <p className="text-xs" style={{ color: 'var(--amber)', fontWeight: 700, marginBottom: 2 }}>📋 They wanted</p>
            <p className="text-sm">{customer.wants_next}</p>
          </div>
        )}

        {/* Added items */}
        {saleItems.map((item, idx) => (
          <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 8 }}>
              <div className="flex gap-8 items-center">
                <div style={{ width: 34, height: 34, borderRadius: 6, overflow: 'hidden', background: 'var(--gray-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                  {item.image_url ? <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📦'}
                </div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</p>
              </div>
              <button onClick={() => removeSaleItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <p className="text-xs text-muted" style={{ marginBottom: 3 }}>{'Qty'}</p>
                <input type="number" min="1" value={item.qty} onChange={e => updateQty(idx, e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }} />
              </div>
              <div style={{ flex: 1.5 }}>
                <div className="flex justify-between">
                  <p className="text-xs text-muted" style={{ marginBottom: 3 }}>Sale Price</p>
                  {item.unit_price !== item.list_price && item.list_price > 0 && (
                    <p className="text-xs" style={{ color: item.unit_price < item.list_price ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>
                      {item.unit_price < item.list_price ? '▼ disc' : '▲ prem'}
                    </p>
                  )}
                </div>
                <input type="number" min="0" step="0.01" value={item.unit_price} onChange={e => updatePrice(idx, e.target.value)}
                  style={{
                    width: '100%', padding: '7px 10px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    border: `1.5px solid ${item.unit_price !== item.list_price && item.list_price > 0 ? (item.unit_price < item.list_price ? 'var(--red)' : 'var(--green)') : 'var(--border)'}`,
                  }} />
                {item.list_price > 0 && <p className="text-xs text-muted" style={{ marginTop: 2 }}>List: ${item.list_price.toFixed(2)}</p>}
              </div>
              <div style={{ flex: 1, textAlign: 'right' }}>
                <p className="text-xs text-muted" style={{ marginBottom: 3 }}>Total</p>
                <p style={{ fontWeight: 700, color: 'var(--green)', fontSize: 15 }}>${(item.qty * item.unit_price).toFixed(2)}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Totals */}
        {saleItems.length > 0 && (
          <div style={{ background: 'var(--green-light)', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
            <div className="flex justify-between text-sm" style={{ marginBottom: 4 }}>
              <span className="text-muted">{'Total Sale'}</span>
              <span style={{ fontWeight: 700 }}>${totalSale.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Profit</span>
              <span style={{ fontWeight: 700, color: 'var(--green)' }}>${totalProfit.toFixed(2)}</span>
            </div>
          </div>
        )}

        <button className="btn btn-ghost btn-full" onClick={() => setShowProducts(true)} style={{ marginBottom: 10 }}>
          + Add Product
        </button>

        <div className="form-group">
          <label className="form-label">Notes (optional)</label>
          <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder={'Any notes about this sale...'} style={{ minHeight: 60 }} />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading || saleItems.length === 0} style={{ marginTop: 4 }}>
          {loading ? 'Saving...' : `Save Sale${saleItems.length > 0 ? ` · $${totalSale.toFixed(2)}` : ''}`}
        </button>
        {saleItems.length === 0 && (
          <button className="btn btn-ghost btn-full" onClick={() => { setOutcome('no_sale'); setStep('notes') }} style={{ marginTop: 8 }}>
            No products to log → just save visit
          </button>
        )}
      </div>
    </div>
  )

  // ─── STEP: NOTES ─── (final notes before saving)
  if (step === 'notes') return (
    <div>
      <div className="page-header">
        <button onClick={() => setStep(outcome === 'come_back' ? 'callback' : 'outcome')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <h1>Any notes?</h1>
        <div style={{ width: 36 }} />
      </div>
      <div className="page" style={{ paddingTop: 20 }}>

        {/* Summary of what we're logging */}
        <div className="card" style={{ marginBottom: 16, background: 'var(--gray-light)' }}>
          <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{customer?.full_name}</p>
          <p className="text-sm text-muted">
            {outcome === 'come_back' ? `📅 Follow-up${callbackDate ? ` · ${new Date(callbackDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}` :
             outcome === 'avoid' ? '⛔ Mark as avoid' :
             outcome === 'no_sale' ? '🤝 Visited, no sale' :
             '📝 Visit logged'}
          </p>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="What happened? Any useful info for next visit..." style={{ minHeight: 90 }} />
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSubmit} disabled={loading} style={{ marginTop: 4 }}>
          {loading ? 'Saving...' : 'Save & Done'}
        </button>
      </div>
    </div>
  )

  return null
}
