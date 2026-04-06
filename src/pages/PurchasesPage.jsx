import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { supabase } from '../lib/supabase'

export default function PurchasesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { products, fetchProducts } = useProducts()
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ product_id:'', product_name:'', qty:1, unit_cost:'', source:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('stock_movements')
      .select('*, products(name, brand)')
      .eq('user_id', user.id)
      .eq('type', 'in')
      .order('created_at', { ascending: false })
      .limit(200)
    setMovements(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleProductChange = e => {
    const pid = e.target.value
    const product = products.find(p => p.id === pid)
    setForm(f => ({
      ...f, product_id: pid,
      product_name: product?.name || '',
      unit_cost: product?.cost ? String(product.cost) : f.unit_cost,
      source: product?.source || f.source,
    }))
  }

  const handleSave = async () => {
    if (!form.product_name.trim() || !form.qty || !form.unit_cost) return
    setSaving(true)
    try {
      const qty = parseInt(form.qty)
      const unitCost = parseFloat(form.unit_cost)
      const totalCost = qty * unitCost

      // Insert into stock_movements
      const { data: mov, error } = await supabase.from('stock_movements').insert([{
        user_id: user.id,
        product_id: form.product_id || null,
        type: 'in',
        qty,
        cost_per_unit: unitCost,
        total_cost: totalCost,
        source: form.source.trim() || null,
        note: form.notes.trim() || null,
      }]).select('*, products(name, brand)').single()
      if (error) throw error

      // Update product stock and avg cost
      if (form.product_id) {
        const product = products.find(p => p.id === form.product_id)
        if (product) {
          const oldQty = product.stock_qty || 0
          const oldCost = product.avg_cost || product.cost || 0
          const newQty = oldQty + qty
          const newAvgCost = newQty > 0
            ? ((oldQty * oldCost) + (qty * unitCost)) / newQty
            : unitCost
          await supabase.from('products').update({
            stock_qty: newQty,
            avg_cost: Math.round(newAvgCost * 100) / 100,
            cost: unitCost,
            source: form.source || product.source,
          }).eq('id', form.product_id)
          if (fetchProducts) fetchProducts()
        }
      }

      setMovements(p => [mov, ...p])
      setForm({ product_id:'', product_name:'', qty:1, unit_cost:'', source:'', notes:'' })
      setShowForm(false)
      showToast('✅ Purchase recorded')
    } catch (err) { alert('Error: ' + err.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (mov) => {
    if (!window.confirm(`Delete this purchase of ${mov.products?.name || mov.note || 'item'}? This will NOT adjust your stock.`)) return
    setDeleting(mov.id)
    try {
      await supabase.from('stock_movements').delete().eq('id', mov.id)
      setMovements(p => p.filter(m => m.id !== mov.id))
      showToast('🗑️ Purchase deleted')
    } catch (e) { showToast('❌ ' + e.message) }
    finally { setDeleting(null) }
  }

  const filtered = movements.filter(m =>
    !search ||
    m.products?.name?.toLowerCase().includes(search.toLowerCase()) ||
    (m.note || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.source || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalSpent = filtered.reduce((s, m) => s + (m.total_cost || 0), 0)

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }}>←</button>
        <h1>Stock Purchases</h1>
        <button onClick={() => setShowForm(true)} style={{ background:'var(--blue)',color:'white',border:'none',borderRadius:10,padding:'7px 14px',fontWeight:700,cursor:'pointer',fontSize:14 }}>+ Add</button>
      </div>

      <div className="page" style={{ paddingTop:12 }}>
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <div className="card" style={{ flex:1, background:'#fef2f2', padding:12 }}>
            <p className="text-xs text-muted">Total Spent</p>
            <p style={{ fontWeight:800, fontSize:20, color:'#dc2626' }}>${totalSpent.toFixed(2)}</p>
          </div>
          <div className="card" style={{ flex:1, padding:12 }}>
            <p className="text-xs text-muted">Records</p>
            <p style={{ fontWeight:800, fontSize:20 }}>{filtered.length}</p>
          </div>
        </div>

        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search product or supplier..." style={{ marginBottom:12 }} />

        {loading && <p className="text-muted text-sm" style={{ textAlign:'center', padding:32 }}>Loading...</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📦</div>
            <p>No stock purchases recorded yet</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop:16 }}>Record Purchase</button>
          </div>
        )}

        {filtered.map(m => {
          const name = m.products?.name || m.note || 'Unknown product'
          const total = m.total_cost || (m.qty * m.cost_per_unit) || 0
          return (
            <div key={m.id} className="card" style={{ marginBottom:8, padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1 }}>
                  <p style={{ fontWeight:700, fontSize:14 }}>{name}</p>
                  <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:3 }}>
                    <span className="text-xs text-muted">{m.qty} × ${(m.cost_per_unit||0).toFixed(2)}</span>
                    {m.source && <span className="text-xs" style={{ color:'var(--blue)' }}>📦 {m.source}</span>}
                    <span className="text-xs text-muted">{new Date(m.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                  </div>
                  {m.note && <p className="text-xs text-muted" style={{ marginTop:3 }}>{m.note}</p>}
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                  <p style={{ fontWeight:800, color:'#dc2626', fontSize:15 }}>-${total.toFixed(2)}</p>
                  <button onClick={() => handleDelete(m)} disabled={deleting === m.id}
                    style={{ padding:'3px 10px', borderRadius:8, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:11, fontWeight:700, cursor:'pointer' }}>
                    {deleting === m.id ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom:16 }}>Record Stock Purchase</h2>

            <div className="form-group">
              <label className="form-label">Product *</label>
              <select className="form-select" value={form.product_id} onChange={handleProductChange}>
                <option value="">— Select from your products —</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}{p.brand ? ` (${p.brand})` : ''}</option>)}
                <option value="__new__">+ Other / New Product</option>
              </select>
              {(form.product_id === '__new__' || !form.product_id) && (
                <input className="form-input" value={form.product_name} onChange={set('product_name')}
                  placeholder="Product name" style={{ marginTop:6 }} />
              )}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">Qty *</label>
                <input className="form-input" type="number" min="1" value={form.qty} onChange={set('qty')} />
              </div>
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">Cost/unit *</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.unit_cost} onChange={set('unit_cost')} placeholder="0.00" />
              </div>
            </div>

            {form.qty && form.unit_cost && (
              <div style={{ background:'#fef2f2', borderRadius:8, padding:'8px 12px', marginBottom:12 }}>
                <span className="text-sm" style={{ color:'#dc2626', fontWeight:700 }}>
                  Total: ${(parseFloat(form.qty)||0) * (parseFloat(form.unit_cost)||0) > 0 ? ((parseFloat(form.qty)||0) * (parseFloat(form.unit_cost)||0)).toFixed(2) : '0.00'}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Source / Supplier</label>
              <input className="form-input" value={form.source} onChange={set('source')} placeholder="e.g. Jinny Beauty, BSG..." />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" value={form.notes} onChange={set('notes')} placeholder="Any notes..." style={{ minHeight:50 }} />
            </div>

            <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving || !form.unit_cost || !form.qty}>
              {saving ? 'Saving...' : 'Save Purchase'}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
