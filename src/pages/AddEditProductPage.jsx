import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useProducts } from '../hooks/useProducts'
import { compressImage } from '../lib/imageUtils'
import ImageEditor from '../components/ImageEditor'

export const CATEGORIES = [
  'Wigs','Hair Extensions & Weaves','Braiding Hair','Hair Care & Treatments',
  'Styling Tools','Cosmetics & Makeup','Skin Care','Nail Care','Fragrance & Oils',
  'Accessories','Air Fresheners','Incense & Candles','Lighters & Torch Lighters',
  'Male Enhancement','Phone Chargers & Cables','Phone Cases & Accessories',
  'Food & Snacks','Health & Wellness','Other',
]

function guessCategory(name) {
  const n = (name||'').toLowerCase()
  if (/wig|lace front|closure|frontal/.test(n)) return 'Wigs'
  if (/bundle|weave|extension|weft|track/.test(n)) return 'Hair Extensions & Weaves'
  if (/braid|loc|twist|crochet|kinky|marley|senegal/.test(n)) return 'Braiding Hair'
  if (/shampoo|conditioner|treatment|mask|serum|leave.in/.test(n)) return 'Hair Care & Treatments'
  if (/flat iron|curling|dryer|clippers|comb|brush|heat/.test(n)) return 'Styling Tools'
  if (/lipstick|foundation|mascara|lash|makeup|concealer|blush/.test(n)) return 'Cosmetics & Makeup'
  if (/lotion|cream|body wash|face|skin|sunscreen|toner/.test(n)) return 'Skin Care'
  if (/nail|polish|gel|acrylic|press.on/.test(n)) return 'Nail Care'
  if (/perfume|cologne|fragrance|body oil|mist/.test(n)) return 'Fragrance & Oils'
  if (/clip|pin|band|headband|bonnet|cap|wrap|net/.test(n)) return 'Accessories'
  if (/freshener|febreze|glade/.test(n)) return 'Air Fresheners'
  if (/incense|candle|oud|bakhoor/.test(n)) return 'Incense & Candles'
  if (/lighter|torch|butane|zippo|bic|flame/.test(n)) return 'Lighters & Torch Lighters'
  if (/honey|royal|bull|enhancement|stamina/.test(n)) return 'Male Enhancement'
  if (/charger|usb|cable|lightning|type.c|power bank/.test(n)) return 'Phone Chargers & Cables'
  if (/case|cover|screen protector/.test(n)) return 'Phone Cases & Accessories'
  return 'Other'
}

const EMPTY = {
  name:'', brand:'', description:'', cost:'', sell_price:'',
  price_min:'', price_max:'', sell_range:'',
  stock_qty:0, unit:'unit', category:'', source:'',
}

export default function AddEditProductPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { products, addProduct, updateProduct, uploadProductImage, uploadAdditionalImage } = useProducts()
  const isEdit = Boolean(id)
  const [form, setForm] = useState({ ...EMPTY })
  const [loading, setLoading] = useState(false)
  const [imageData, setImageData] = useState({
    primaryFile: null, primaryPreview: null,
    extraFiles: [], existingImages: []
  })
  const [error, setError] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    if (isEdit) {
      const p = products.find(p => p.id === id)
      if (p) {
        setForm({
          ...EMPTY, ...p,
          cost: p.cost ?? '', sell_price: p.sell_price ?? '',
          price_min: p.price_min ?? '', price_max: p.price_max ?? '',
          sell_range: p.sell_range ?? '', source: p.source ?? '', brand: p.brand ?? '',
          category: p.category || ''
        })
        setImageData({
          primaryFile: null, primaryPreview: p.image_url || null,
          extraFiles: [], existingImages: p.images || []
        })
      }
    }
  }, [id, products, isEdit])

  // Auto-guess category
  useEffect(() => {
    if (!isEdit && form.name && !form.category) {
      const g = guessCategory(form.name)
      if (g !== 'Other') setForm(f => ({ ...f, category: g }))
    }
  }, [form.name, isEdit])

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))


  const generateAI = async () => {
    if (!form.name) { setError('Enter product name first'); return }
    setAiLoading(true); setError('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'claude-sonnet-4-20250514', max_tokens:150,
          messages:[{ role:'user', content:`Write a compelling 1-2 sentence product description for "${form.name}"${form.brand ? ` by ${form.brand}` : ''}${form.category ? ` (${form.category})` : ''}. No quotes, no markdown.` }]
        })
      })
      const d = await res.json()
      const text = d.content?.[0]?.text?.trim()
      if (text) setForm(f => ({ ...f, description: text }))
    } catch { setError('AI failed — type manually') }
    finally { setAiLoading(false) }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Product name is required'); return }
    if (!form.sell_price) { setError('Sell price is required'); return }
    setLoading(true); setError('')
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand || null,
        source: form.source || null,
        description: form.description,
        category: form.category || guessCategory(form.name),
        cost: parseFloat(form.cost) || 0,
        sell_price: parseFloat(form.sell_price),
        price_min: form.price_min ? parseFloat(form.price_min) : null,
        price_max: form.price_max ? parseFloat(form.price_max) : null,
        sell_range: form.sell_range || null,
        stock_qty: parseInt(form.stock_qty) || 0,
        unit: form.unit || 'unit',
      }
      let saved = isEdit ? await updateProduct(id, payload) : await addProduct(payload)
      
      // If adding a new product with initial stock, log it as a stock purchase
      if (!isEdit && saved?.id && (parseInt(form.stock_qty) || 0) > 0) {
        const qty = parseInt(form.stock_qty)
        const unitCost = parseFloat(form.cost) || 0
        await supabase.from('stock_movements').insert([{
          user_id: user?.id,
          product_id: saved.id,
          type: 'in',
          qty,
          cost_per_unit: unitCost,
          total_cost: qty * unitCost,
          source: form.source || null,
          note: `Initial stock — ${form.name.trim()}`,
        }])
        // Also set avg_cost
        if (unitCost > 0) {
          await supabase.from('products').update({ avg_cost: unitCost }).eq('id', saved.id)
        }
      }
      if (saved?.id) {
        const { primaryFile, extraFiles, existingImages: keepImages } = imageData
        // Upload new primary image if changed
        if (primaryFile) await uploadProductImage(saved.id, primaryFile)
        else if (!imageData.primaryPreview && isEdit) {
          // Primary image was removed
          await updateProduct(saved.id, { image_url: null })
        }
        // Upload new extra images
        let allExtraUrls = [...keepImages]
        if (extraFiles.length > 0) {
          const newUrls = await Promise.all(extraFiles.map((file, i) => uploadAdditionalImage(saved.id, file, Date.now() + i)))
          allExtraUrls = [...allExtraUrls, ...newUrls]
        }
        // Always save the final images array
        await updateProduct(saved.id, { images: allExtraUrls })
      }
      navigate('/products')
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const cost = parseFloat(form.cost) || 0
  const sellPrice = parseFloat(form.sell_price) || 0
  const profit = sellPrice - cost
  const margin = sellPrice > 0 ? ((profit / sellPrice) * 100).toFixed(0) : 0

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none',border:'none',fontSize:22,cursor:'pointer' }}>←</button>
        <h1>{isEdit ? 'Edit Product' : 'Add Product'}</h1>
        <div style={{ width:36 }} />
      </div>

      <form onSubmit={handleSubmit} className="page" style={{ paddingTop:16 }}>
        {error && <div style={{ background:'var(--red-light)',color:'var(--red)',padding:'12px 16px',borderRadius:8,marginBottom:14,fontSize:14 }}>{error}</div>}

        {/* Images */}
        <div style={{ marginBottom:18 }}>
          <p className="section-header" style={{ marginBottom:10 }}>📸 Photos</p>
          <ImageEditor
            primaryPreview={imageData.primaryPreview}
            existingExtras={imageData.existingImages}
            onChange={data => setImageData(prev => ({ ...prev, ...data }))}
          />
        </div>

        <p className="section-header">Product Info</p>
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input className="form-input" value={form.name} onChange={set('name')} placeholder="e.g. Black Bull Honey, Car Air Freshener" required />
          <p className="text-xs text-muted" style={{ marginTop:4 }}>Same product can be added multiple times with different prices</p>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <div className="form-group" style={{ flex:1 }}>
            <label className="form-label">Brand</label>
            <input className="form-input" value={form.brand||''} onChange={set('brand')} placeholder="e.g. ORS, Blunt" />
          </div>
          <div className="form-group" style={{ flex:1 }}>
            <label className="form-label">Source / Supplier</label>
            <input className="form-input" value={form.source||''} onChange={set('source')} placeholder="e.g. Jinny Beauty" />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Category</label>
          <select className="form-select" value={form.category} onChange={set('category')}>
            <option value="">— Select —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <p className="section-header">💰 Pricing</p>
        <div style={{ display:'flex',gap:10 }}>
          <div className="form-group" style={{ flex:1 }}>
            <label className="form-label">Cost (what you paid)</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.cost} onChange={set('cost')} placeholder="0.00" />
          </div>
          <div className="form-group" style={{ flex:1 }}>
            <label className="form-label">Sell Price *</label>
            <input className="form-input" type="number" min="0" step="0.01" value={form.sell_price} onChange={set('sell_price')} placeholder="0.00" required />
          </div>
        </div>

        {/* Profit calc */}
        {cost > 0 && sellPrice > 0 && (
          <div style={{ background:'var(--green-light)',borderRadius:10,padding:'10px 14px',marginBottom:14,display:'flex',gap:20 }}>
            <div><p className="text-xs text-muted">Profit per unit</p><p style={{ fontWeight:700,color:'var(--green)',fontSize:16 }}>${profit.toFixed(2)}</p></div>
            <div><p className="text-xs text-muted">Margin</p><p style={{ fontWeight:700,color:'var(--green)',fontSize:16 }}>{margin}%</p></div>
          </div>
        )}

        {/* Sell range — shown on price list */}
        <div className="form-group">
          <label className="form-label">Price range to show customers <span className="text-muted" style={{ fontWeight:400 }}>(optional)</span></label>
          <div style={{ display:'flex',gap:8,alignItems:'center' }}>
            <input className="form-input" type="number" min="0" step="0.01" value={form.price_min||''} onChange={set('price_min')} placeholder="From $" style={{ flex:1 }} />
            <span className="text-muted">–</span>
            <input className="form-input" type="number" min="0" step="0.01" value={form.price_max||''} onChange={set('price_max')} placeholder="To $" style={{ flex:1 }} />
          </div>
          <p className="text-xs text-muted" style={{ marginTop:4 }}>Shown as a range on the price list (e.g. "$4 – $6"). Leave blank to show exact price.</p>
        </div>

        <p className="section-header">Description</p>
        <div className="form-group">
          <textarea className="form-textarea" value={form.description} onChange={set('description')}
            placeholder="Describe this product..." style={{ minHeight:70 }} />
          <button type="button" onClick={generateAI} disabled={aiLoading}
            style={{ marginTop:6,fontSize:12,padding:'5px 12px',borderRadius:8,border:'1px solid var(--border)',background:'white',cursor:'pointer' }}>
            {aiLoading ? '⏳ Generating...' : '✨ Generate with AI'}
          </button>
        </div>

        <p className="section-header">Inventory</p>
        <div style={{ display:'flex',gap:10 }}>
          <div className="form-group" style={{ flex:1 }}>
            <label className="form-label">Stock Qty</label>
            <input className="form-input" type="number" min="0" value={form.stock_qty} onChange={set('stock_qty')} />
          </div>
          <div className="form-group" style={{ flex:1 }}>
            <label className="form-label">Unit</label>
            <select className="form-select" value={form.unit} onChange={set('unit')}>
              {['unit','pack','box','bottle','bag','piece','dozen','case'].map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop:8 }}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Product'}
        </button>
      </form>
    </div>
  )
}
