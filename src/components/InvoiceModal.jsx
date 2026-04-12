import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Printable invoice for a sale visit.
 * Opens in a new window with print-optimized CSS.
 * 
 * Props:
 *   visit     – visit object with sale_items joined
 *   customer  – customer object
 *   profile   – seller profile (display_name, username)
 *   onClose   – callback to close the invoice modal
 */
export default function InvoiceModal({ visit, customer, profile, onClose }) {
  const [logoUrl, setLogoUrl] = useState(null)

  useEffect(() => {
    // Fetch company logo from app_settings
    supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
      .then(({ data }) => { if (data?.value) setLogoUrl(data.value) })
  }, [])

  const items = visit.sale_items || []
  const subtotal = items.reduce((s, i) => s + (i.qty * i.unit_price), 0)
  const totalCost = items.reduce((s, i) => s + (i.qty * (i.unit_cost || 0)), 0)
  const totalUnits = items.reduce((s, i) => s + i.qty, 0)

  // Invoice number: KS-[year][month]-[last 4 of visit id]
  const visitDate = new Date(visit.created_at)
  const yr = visitDate.getFullYear()
  const mo = String(visitDate.getMonth() + 1).padStart(2, '0')
  const idSuffix = (visit.id || '').slice(-6).toUpperCase()
  const invoiceNum = `KS-${yr}${mo}-${idSuffix}`

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=1000')
    if (!printWindow) return

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice ${invoiceNum}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; font-size: 14px; line-height: 1.5; }
  
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #2563eb; }
  .logo-section { display: flex; align-items: center; gap: 16px; }
  .logo-section img { width: 60px; height: 60px; object-fit: contain; border-radius: 8px; }
  .company-name { font-size: 24px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
  .company-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  
  .invoice-title { text-align: right; }
  .invoice-title h1 { font-size: 28px; font-weight: 900; color: #1a1a1a; letter-spacing: -1px; }
  .invoice-num { font-size: 13px; color: #2563eb; font-weight: 700; margin-top: 4px; }
  .invoice-date { font-size: 12px; color: #64748b; margin-top: 2px; }
  
  .parties { display: flex; gap: 40px; margin-bottom: 28px; }
  .party { flex: 1; }
  .party-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .party-name { font-size: 16px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; }
  .party-detail { font-size: 12px; color: #64748b; line-height: 1.6; }
  
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f1f5f9; padding: 10px 14px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; text-align: left; border-bottom: 2px solid #e2e8f0; }
  thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  tbody td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  tbody td:last-child, tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; font-variant-numeric: tabular-nums; }
  tbody tr:hover { background: #fafbfc; }
  .item-name { font-weight: 600; }
  
  .totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
  .totals-box { width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 13px; color: #64748b; }
  .total-row.grand { padding: 12px 0; margin-top: 8px; border-top: 2px solid #1a1a1a; font-size: 18px; font-weight: 800; color: #1a1a1a; }
  .total-value { font-variant-numeric: tabular-nums; font-weight: 600; }
  
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 28px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
  .meta-item label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
  .meta-item span { font-size: 13px; font-weight: 600; color: #1a1a1a; }
  
  .notes { padding: 16px; background: #fffbeb; border-radius: 8px; border: 1px solid #fde68a; margin-bottom: 28px; }
  .notes-label { font-size: 10px; font-weight: 700; color: #92400e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
  .notes-text { font-size: 12px; color: #78350f; line-height: 1.6; }
  
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
  .footer-col { flex: 1; }
  .footer-label { font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
  .sig-line { border-bottom: 1px solid #cbd5e1; width: 200px; height: 40px; }
  .footer-note { font-size: 11px; color: #94a3b8; text-align: center; margin-top: 32px; }
  
  @media print {
    body { padding: 20px; }
    @page { margin: 0.5in; size: letter; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div class="no-print" style="margin-bottom:20px;display:flex;gap:10px">
  <button onclick="window.print()" style="padding:10px 24px;border-radius:8px;border:none;background:#2563eb;color:white;font-weight:700;font-size:14px;cursor:pointer">🖨️ Print / Save as PDF</button>
  <button onclick="window.close()" style="padding:10px 24px;border-radius:8px;border:1px solid #d4d8e0;background:white;color:#64748b;font-weight:600;font-size:14px;cursor:pointer">Close</button>
</div>

<div class="header">
  <div class="logo-section">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
    <div>
      <div class="company-name">Kanz Supply</div>
      <div class="company-sub">Wholesale Distribution</div>
      <div class="company-sub">orders@kanzsupply.com</div>
    </div>
  </div>
  <div class="invoice-title">
    <h1>INVOICE</h1>
    <div class="invoice-num">${invoiceNum}</div>
    <div class="invoice-date">${visitDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
</div>

<div class="parties">
  <div class="party">
    <div class="party-label">Sold By</div>
    <div class="party-name">${profile?.display_name || 'Kanz Supply'}</div>
    <div class="party-detail">
      Kanz Supply LLC<br/>
      Louisiana, USA<br/>
      orders@kanzsupply.com
    </div>
  </div>
  <div class="party">
    <div class="party-label">Sold To</div>
    <div class="party-name">${customer?.business_name || customer?.full_name || 'Customer'}</div>
    <div class="party-detail">
      ${customer?.full_name && customer?.business_name ? customer.full_name + '<br/>' : ''}
      ${customer?.address || ''}${customer?.address ? '<br/>' : ''}
      ${customer?.area || ''}${customer?.area ? '<br/>' : ''}
      ${customer?.phone ? 'Tel: ' + customer.phone : ''}
    </div>
  </div>
</div>

<div class="meta-grid">
  <div class="meta-item">
    <label>Invoice #</label>
    <span>${invoiceNum}</span>
  </div>
  <div class="meta-item">
    <label>Date</label>
    <span>${visitDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
  </div>
  <div class="meta-item">
    <label>Payment Terms</label>
    <span>${customer?.payment_status === 'paid' ? 'Paid' : 'Due on Receipt'}</span>
  </div>
  <div class="meta-item">
    <label>Sales Rep</label>
    <span>${profile?.display_name || '–'}</span>
  </div>
  <div class="meta-item">
    <label>Total Items</label>
    <span>${totalUnits} unit${totalUnits !== 1 ? 's' : ''}</span>
  </div>
  <div class="meta-item">
    <label>Visit ID</label>
    <span style="font-size:10px;color:#94a3b8">${visit.id?.slice(0, 8) || '–'}</span>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:10%">#</th>
      <th style="width:40%">Product</th>
      <th style="width:15%">Qty</th>
      <th style="width:15%">Unit Price</th>
      <th style="width:20%">Amount</th>
    </tr>
  </thead>
  <tbody>
    ${items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="item-name">${item.product_name}</td>
      <td style="text-align:right">${item.qty}</td>
      <td style="text-align:right">$${(item.unit_price || 0).toFixed(2)}</td>
      <td style="text-align:right;font-weight:600">$${(item.qty * item.unit_price).toFixed(2)}</td>
    </tr>
    `).join('')}
  </tbody>
</table>

<div class="totals">
  <div class="totals-box">
    <div class="total-row">
      <span>Subtotal</span>
      <span class="total-value">$${subtotal.toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>Tax</span>
      <span class="total-value">$0.00</span>
    </div>
    <div class="total-row grand">
      <span>Total Due</span>
      <span>$${subtotal.toFixed(2)}</span>
    </div>
  </div>
</div>

${visit.notes ? `
<div class="notes">
  <div class="notes-label">Notes</div>
  <div class="notes-text">${visit.notes.replace(/\n/g, '<br/>')}</div>
</div>
` : ''}

<div class="footer">
  <div class="footer-col">
    <div class="footer-label">Authorized Signature</div>
    <div class="sig-line"></div>
  </div>
  <div class="footer-col" style="text-align:right">
    <div class="footer-label">Customer Signature</div>
    <div class="sig-line" style="margin-left:auto"></div>
  </div>
</div>

<div class="footer-note">
  Thank you for your business! &mdash; Kanz Supply LLC
</div>

</body>
</html>`

    printWindow.document.write(html)
    printWindow.document.close()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800 }}>Invoice {invoiceNum}</h2>
            <p className="text-xs text-muted">{visitDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Quick preview */}
        <div style={{ background: 'var(--gray-light)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>SOLD TO</p>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{customer?.business_name || customer?.full_name}</p>
              {customer?.address && <p className="text-xs text-muted">{customer.address}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL</p>
              <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--green)' }}>${subtotal.toFixed(2)}</p>
            </div>
          </div>

          {/* Line items */}
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: i === 0 ? '1px solid var(--border)' : 'none', fontSize: 13 }}>
              <span>{item.qty}× {item.product_name}</span>
              <span style={{ fontWeight: 600 }}>${(item.qty * item.unit_price).toFixed(2)}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <button onClick={handlePrint} className="btn btn-primary btn-full" style={{ marginBottom: 8, fontSize: 16, padding: 14 }}>
          🖨️ Print / Save as PDF
        </button>
        <button onClick={onClose} className="btn btn-ghost btn-full">
          Close
        </button>
      </div>
    </div>
  )
}
