import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { supabase } from '../lib/supabase'

export default function PurchasesPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { products } = useProducts()
  const [purchases, setPurchases] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ product_id:'', product_name:'', qty:1, unit_cost:'', source:'', notes:'', invoice_ref:'' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('purchases')
      .select('*').eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(100)
    setPurchases(data || [])
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
    if (!form.product_name.trim()) return
    if (!form.qty || !form.unit_cost) return
    setSaving(true)
    try {
      const payload = {
        user_id: user.id,
        product_id: form.product_id || null,
        product_name: form.product_name.trim(),
        qty: parseInt(form.qty),
        unit_cost: parseFloat(form.unit_cost),
        source: form.source.trim() || null,
        notes: form.notes.trim() || null,
        invoice_ref: form.invoice_ref.trim() || null,
      }
      const { data, error } = await supabase.from('purchases').insert([payload]).select().single()
      if (error) throw error

      // Update product stock and cost
      if (form.product_id) {
        const product = products.find(p => p.id === form.product_id)
        if (product) {
          const newQty = (product.stock_qty || 0) + parseInt(form.qty)
          await supabase.from('products').update({
            stock_qty: newQty,
            cost: parseFloat(form.unit_cost), // update cost to latest purchase price
            source: form.source || product.source,
          }).eq('id', form.product_id)
        }
      }

      setPurchases(p => [data, ...p])
      setForm({ product_id:'', product_name:'', qty:1, unit_cost:'', source:'', notes:'', invoice_ref:'' })
      setShowForm(false)
    } catch (err) { alert('Error: ' + err.message) }
    finally { setSaving(false) }
  }

  const filtered = purchases.filter(p =>
    !search || p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.source?.toLowerCase().includes(search.toLowerCase())
  )

  const totalSpent = filtered.reduce((s, p) => s + (p.total_cost || p.qty * p.unit_cost || 0), 0)

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }}>←</button>
        <h1>Purchases</h1>
        <button onClick={() => setShowForm(true)} style={{ background:'var(--blue)',color:'white',border:'none',borderRadius:10,padding:'7px 14px',fontWeight:700,cursor:'pointer',fontSize:14 }}>+ Add</button>
      </div>

      <div className="page" style={{ paddingTop:12 }}>
        {/* Summary */}
        <div style={{ display:'flex',gap:10,marginBottom:14 }}>
          <div className="card" style={{ flex:1,background:'var(--blue-light)',padding:12 }}>
            <p className="text-xs text-muted">Total spent</p>
            <p style={{ fontWeight:800,fontSize:20,color:'var(--blue)' }}>${totalSpent.toFixed(2)}</p>
          </div>
          <div className="card" style={{ flex:1,padding:12 }}>
            <p className="text-xs text-muted">Records</p>
            <p style={{ fontWeight:800,fontSize:20 }}>{filtered.length}</p>
          </div>
        </div>

        <input className="form-input" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Search product or supplier..." style={{ marginBottom:12 }} />

        {loading && <p className="text-muted text-sm" style={{ textAlign:'center',padding:32 }}>Loading...</p>}

        {!loading && filtered.length === 0 && (
          <div style={{ textAlign:'center',padding:40,color:'#94a3b8' }}>
            <div style={{ fontSize:40,marginBottom:10 }}>📦</div>
            <p>No purchases recorded yet</p>
            <button className="btn btn-primary" onClick={() => setShowForm(true)} style={{ marginTop:16 }}>Record Purchase</button>
          </div>
        )}

        {filtered.map(p => {
          const total = p.total_cost || (p.qty * p.unit_cost)
          return (
            <div key={p.id} className="card" style={{ marginBottom:8,padding:'12px 14px' }}>
              <div className="flex justify-between items-center" style={{ marginBottom:4 }}>
                <p style={{ fontWeight:700,fontSize:14 }}>{p.product_name}</p>
                <p style={{ fontWeight:800,color:'var(--red)',fontSize:15 }}>-${total.toFixed(2)}</p>
              </div>
              <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
                <span className="text-xs text-muted">{p.qty} × ${p.unit_cost?.toFixed(2)}</span>
                {p.source && <span className="text-xs" style={{ color:'var(--blue)' }}>📦 {p.source}</span>}
                {p.invoice_ref && <span className="text-xs text-muted">#{p.invoice_ref}</span>}
                <span className="text-xs text-muted">{new Date(p.created_at).toLocaleDateString()}</span>
              </div>
              {p.notes && <p className="text-xs text-muted" style={{ marginTop:4 }}>{p.notes}</p>}
            </div>
          )
        })}
      </div>

      {/* Add purchase modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom:16 }}>Record Purchase</h2>

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

            <div style={{ display:'flex',gap:10 }}>
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">Quantity *</label>
                <input className="form-input" type="number" min="1" value={form.qty} onChange={set('qty')} />
              </div>
              <div className="form-group" style={{ flex:1 }}>
                <label className="form-label">Cost per unit *</label>
                <input className="form-input" type="number" min="0" step="0.01" value={form.unit_cost} onChange={set('unit_cost')} placeholder="0.00" />
              </div>
            </div>

            {form.qty && form.unit_cost && (
              <div style={{ background:'var(--red-light)',borderRadius:8,padding:'8px 12px',marginBottom:12 }}>
                <span className="text-sm" style={{ color:'var(--red)',fontWeight:700 }}>
                  Total: ${(parseFloat(form.qty) * parseFloat(form.unit_cost)).toFixed(2)}
                </span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Source / Supplier</label>
              <input className="form-input" value={form.source} onChange={set('source')} placeholder="e.g. Jinny Beauty, Beauty Systems Group" />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice / Ref #</label>
              <input className="form-input" value={form.invoice_ref} onChange={set('invoice_ref')} placeholder="Optional" />
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
    </div>
  )
}
