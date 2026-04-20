import { supabase } from './supabase'

/**
 * Generate and open a printable order sheet for a list of products.
 *
 * @param {Array} products - Array of product objects (with sell_price, name, etc.)
 * @param {Object} profile - User profile (for display name)
 * @param {Object} options - { listName: string, listNiche: string }
 */
export function printOrderSheet(products, profile, options = {}) {
  const { listName, listNiche } = options
  const activeProducts = products.filter(p => p.is_active !== false)

  // Group by category
  const grouped = {}
  activeProducts.forEach(p => {
    const cat = p.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  })

  // Fetch logo
  supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
    .then(({ data }) => {
      const logoUrl = data?.value || ''
      const printWindow = window.open('', '_blank', 'width=900,height=1100')
      if (!printWindow) return

      const titleText = listName ? `Order Sheet – ${listName}` : 'Order Sheet'
      const subtitleText = listName
        ? `${listNiche || 'Custom List'} · ${profile?.display_name || ''}`
        : `Wholesale Distribution · ${profile?.display_name || ''}`

      const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${titleText} – Kanz Supply</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1a1a1a; padding: 20px 24px; font-size: 11px; line-height: 1.3; }

  .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 2.5px solid #b8860b; }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-left img { width: 44px; height: 44px; object-fit: contain; border-radius: 8px; }
  .company { font-size: 20px; font-weight: 900; color: #b8860b; }
  .company-sub { font-size: 9px; color: #888; }
  .header-right { text-align: right; }
  .header-right h1 { font-size: 16px; font-weight: 900; color: #1a1a1a; text-transform: uppercase; letter-spacing: 1px; }
  .header-right .list-name { font-size: 11px; color: #b8860b; font-weight: 700; margin-top: 2px; }
  .header-right p { font-size: 9px; color: #888; }

  .store-info { display: flex; gap: 12px; margin-bottom: 14px; }
  .store-field { flex: 1; }
  .store-field label { font-size: 8px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 3px; }
  .store-field .line { border-bottom: 1px solid #ccc; height: 18px; }

  .cat-header { background: #f5f0e0; padding: 4px 8px; font-size: 11px; font-weight: 800; color: #92400e; margin: 10px 0 4px; border-radius: 4px; border-left: 3px solid #b8860b; }

  table { width: 100%; border-collapse: collapse; }
  th { background: #fafafa; padding: 4px 6px; font-size: 8px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; border-bottom: 1.5px solid #e0e0e0; }
  th.center { text-align: center; }
  th.right { text-align: right; }
  td { padding: 4px 6px; font-size: 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
  td.center { text-align: center; }
  td.right { text-align: right; }
  tr:hover { background: #fafaf5; }

  .prod-img { width: 28px; height: 28px; border-radius: 4px; object-fit: cover; border: 1px solid #e0e0e0; }
  .prod-img-placeholder { width: 28px; height: 28px; border-radius: 4px; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 14px; border: 1px solid #e0e0e0; }
  .prod-name { font-weight: 700; font-size: 11px; }
  .prod-brand { font-size: 9px; color: #888; }
  .prod-unit { font-size: 9px; color: #666; }
  .price { font-weight: 800; font-size: 12px; color: #1a1a1a; }
  .per-piece { font-size: 8px; color: #b8860b; font-weight: 600; }
  .qty-box { width: 36px; height: 22px; border: 1.5px solid #ccc; border-radius: 4px; text-align: center; }
  .check-box { width: 16px; height: 16px; border: 1.5px solid #ccc; border-radius: 3px; }
  .sold-out { color: #aaa; text-decoration: line-through; }

  .footer { margin-top: 14px; padding-top: 10px; border-top: 1px solid #e0e0e0; display: flex; justify-content: space-between; }
  .footer-field { flex: 1; }
  .footer-field label { font-size: 8px; font-weight: 700; color: #888; text-transform: uppercase; display: block; margin-bottom: 3px; }
  .footer-line { border-bottom: 1px solid #ccc; height: 22px; }
  .footer-note { text-align: center; margin-top: 10px; font-size: 8px; color: #aaa; }

  @media print {
    body { padding: 12px 16px; }
    @page { margin: 0.3in; size: letter; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>

<div class="no-print" style="margin-bottom:12px;display:flex;gap:8px">
  <button onclick="window.print()" style="padding:8px 20px;border-radius:8px;border:none;background:#b8860b;color:white;font-weight:700;font-size:13px;cursor:pointer">🖨️ Print</button>
  <button onclick="window.close()" style="padding:8px 20px;border-radius:8px;border:1px solid #ddd;background:white;color:#888;font-weight:600;font-size:13px;cursor:pointer">Close</button>
</div>

<div class="header">
  <div class="header-left">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" />` : ''}
    <div>
      <div class="company">Kanz Supply</div>
      <div class="company-sub">${subtitleText}</div>
    </div>
  </div>
  <div class="header-right">
    <h1>Order Sheet</h1>
    ${listName ? `<div class="list-name">${listName}</div>` : ''}
    <p>${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
  </div>
</div>

<div class="store-info">
  <div class="store-field">
    <label>Store / Business Name</label>
    <div class="line"></div>
  </div>
  <div class="store-field" style="max-width:140px">
    <label>Contact Phone</label>
    <div class="line"></div>
  </div>
  <div class="store-field" style="max-width:100px">
    <label>Date</label>
    <div class="line"></div>
  </div>
</div>

${Object.entries(grouped).map(([cat, items]) => `
  <div class="cat-header">${cat} (${items.length})</div>
  <table>
    <thead>
      <tr>
        <th style="width:4%">✓</th>
        <th style="width:6%"></th>
        <th style="width:32%">Product</th>
        <th class="right" style="width:14%">Price</th>
        <th class="center" style="width:14%">Per Piece</th>
        <th class="center" style="width:10%">In Stock</th>
        <th class="center" style="width:10%">Qty</th>
        <th class="right" style="width:10%">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(p => {
        const isSoldOut = p.stock_qty !== null && p.stock_qty !== undefined && p.stock_qty <= 0
        const pieceCount = p.pieces_per_unit || null
        const pieceName = p.piece_name || 'piece'
        const perPiece = pieceCount && pieceCount > 1 ? (p.sell_price / pieceCount).toFixed(2) : null
        return `
        <tr${isSoldOut ? ' class="sold-out"' : ''}>
          <td class="center"><div class="check-box"></div></td>
          <td>${p.image_url
            ? `<img class="prod-img" src="${p.image_url}" alt="" />`
            : `<div class="prod-img-placeholder">📦</div>`
          }</td>
          <td>
            <div class="prod-name">${p.name}${isSoldOut ? ' <span style="color:#dc2626;font-size:8px">(SOLD OUT)</span>' : ''}</div>
            ${p.brand ? `<div class="prod-brand">${p.brand}</div>` : ''}
            ${pieceCount ? `<div class="prod-unit">${pieceCount} ${pieceName}s per ${p.unit || 'unit'}</div>` : ''}
          </td>
          <td class="right"><span class="price">$${(p.sell_price || 0).toFixed(2)}</span><br/><span class="prod-unit">per ${p.unit || 'unit'}</span></td>
          <td class="center">${perPiece ? `<span class="per-piece">$${perPiece}/${pieceName}</span>` : '–'}</td>
          <td class="center" style="font-weight:600;color:${isSoldOut ? '#ccc' : p.stock_qty <= 5 ? '#d97706' : '#16a34a'}">${isSoldOut ? '–' : (p.stock_qty ?? '–')}</td>
          <td class="center"><div class="qty-box"></div></td>
          <td class="right"></td>
        </tr>`
      }).join('')}
    </tbody>
  </table>
`).join('')}

<div class="footer">
  <div class="footer-field">
    <label>Notes / Special Requests</label>
    <div class="footer-line"></div>
    <div class="footer-line" style="margin-top:6px"></div>
  </div>
  <div class="footer-field" style="max-width:160px;margin-left:20px">
    <label>Signature</label>
    <div class="footer-line"></div>
  </div>
</div>

<div class="footer-note">
  Check ✓ items you want · Write qty needed · Return this sheet to your Kanz Supply rep
</div>

</body>
</html>`

      printWindow.document.write(html)
      printWindow.document.close()
    })
}
