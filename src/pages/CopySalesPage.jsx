import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'

const JOE_USER_ID = 'b4412cb7-1e8b-411a-874d-98418bee1738'
const YOUSEF_USER_ID = '52cf4ea5-3a12-4500-bb12-0aefc8176d57'
const STORAGE_KEY = '_sales_copy_data'

export default function CopySalesPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const [exportData, setExportData] = useState(null)
  const [importReady, setImportReady] = useState(false)
  const [importStats, setImportStats] = useState(null)

  // Check if there's pending export data in localStorage
  const pendingData = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) return JSON.parse(raw)
    } catch {}
    return null
  })()

  // ── STEP 1: Export (run as Yousef) ──
  const handleExport = async () => {
    setLoading(true)
    setStatus('Fetching visits...')
    try {
      // Fetch ALL visits with sale_items for current user
      const { data: visits, error: vErr } = await supabase
        .from('visits')
        .select('*, sale_items(*)')
        .eq('user_id', user.id)
        .eq('had_sale', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1000)

      if (vErr) throw vErr

      const salesVisits = (visits || []).filter(v => v.sale_items && v.sale_items.length > 0)
      const totalItems = salesVisits.reduce((s, v) => s + v.sale_items.length, 0)
      const totalRevenue = salesVisits.reduce((s, v) => s + (v.sale_amount || 0), 0)

      setStatus(`Found ${salesVisits.length} sales with ${totalItems} line items ($${totalRevenue.toFixed(2)} total)`)

      const data = {
        source_user_id: user.id,
        source_name: profile?.display_name || user.email,
        exported_at: new Date().toISOString(),
        visits: salesVisits.map(v => ({
          // Visit fields (strip id – we'll generate new ones)
          customer_id: v.customer_id,
          was_visited: v.was_visited,
          had_sale: v.had_sale,
          outcome: v.outcome,
          notes: v.notes,
          sale_amount: v.sale_amount,
          cost: v.cost,
          callback_date: v.callback_date,
          visit_lat: v.visit_lat,
          visit_lng: v.visit_lng,
          created_at: v.created_at,
          // Sale items
          sale_items: v.sale_items.map(si => ({
            product_id: si.product_id,
            product_name: si.product_name,
            qty: si.qty,
            unit_price: si.unit_price,
            unit_cost: si.unit_cost,
            total_price: si.total_price,
            total_cost: si.total_cost,
            total_profit: si.total_profit,
            created_at: si.created_at,
          })),
        })),
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      setExportData(data)
      showToast(`✅ Exported ${salesVisits.length} sales – now log in as Joe to import`)
    } catch (err) {
      setStatus('❌ Error: ' + err.message)
      showToast('Export failed: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  // ── STEP 2: Import (run as Joe) ──
  const handleImport = async () => {
    const data = pendingData
    if (!data || !data.visits) { showToast('No export data found', 'error'); return }

    setLoading(true)
    setStatus('Checking for duplicates...')

    let imported = 0
    let itemsImported = 0
    let skipped = 0
    let duplicates = 0
    const errors = []

    try {
      // Pre-fetch all of Joe's existing visits to detect duplicates
      // Match on: customer_id + created_at + sale_amount
      const { data: existingVisits } = await supabase
        .from('visits')
        .select('customer_id, created_at, sale_amount')
        .eq('user_id', user.id)
        .eq('had_sale', true)
        .is('deleted_at', null)
        .limit(5000)

      // Build a lookup set for fast duplicate checking
      const existingKeys = new Set(
        (existingVisits || []).map(v =>
          `${v.customer_id}|${v.created_at}|${v.sale_amount}`
        )
      )

      for (const v of data.visits) {
        try {
          // Check for duplicate
          const key = `${v.customer_id}|${v.created_at}|${v.sale_amount}`
          if (existingKeys.has(key)) {
            duplicates++
            continue
          }

          setStatus(`Importing sale ${imported + skipped + duplicates + 1}/${data.visits.length}...`)

          // Insert visit under current user (Joe)
          const { data: newVisit, error: visitErr } = await supabase
            .from('visits')
            .insert([{
              user_id: user.id,
              customer_id: v.customer_id,
              was_visited: v.was_visited,
              had_sale: v.had_sale,
              outcome: v.outcome,
              notes: v.notes ? `[Copied from ${data.source_name}] ${v.notes}` : `[Copied from ${data.source_name}]`,
              sale_amount: v.sale_amount,
              cost: v.cost,
              callback_date: v.callback_date,
              visit_lat: v.visit_lat,
              visit_lng: v.visit_lng,
              created_at: v.created_at,
            }])
            .select('id')
            .single()

          if (visitErr) {
            skipped++
            errors.push(`Visit ${v.created_at}: ${visitErr.message}`)
            continue
          }

          // Add to lookup so we don't duplicate within the same import run
          existingKeys.add(key)

          // Insert sale items under the new visit
          // Note: total_price, total_cost, total_profit are generated columns – don't insert them
          if (v.sale_items && v.sale_items.length > 0 && newVisit?.id) {
            const items = v.sale_items.map(si => ({
              visit_id: newVisit.id,
              user_id: user.id,
              product_id: si.product_id,
              product_name: si.product_name,
              qty: si.qty,
              unit_price: si.unit_price,
              unit_cost: si.unit_cost,
              created_at: si.created_at,
            }))

            const { error: siErr } = await supabase
              .from('sale_items')
              .insert(items)

            if (siErr) {
              errors.push(`Items for visit ${newVisit.id}: ${siErr.message}`)
            } else {
              itemsImported += items.length
            }
          }

          imported++
        } catch (e) {
          skipped++
          errors.push(e.message)
        }
      }

      setImportStats({ imported, itemsImported, skipped, duplicates, errors })
      setStatus(`✅ Done! ${imported} sales imported, ${itemsImported} items. ${duplicates > 0 ? `${duplicates} duplicates skipped. ` : ''}${skipped > 0 ? `${skipped} failed.` : ''}`)

      // Clean up localStorage
      localStorage.removeItem(STORAGE_KEY)
      showToast(`✅ Imported ${imported} sales to ${profile?.display_name || 'this account'}`)
    } catch (err) {
      setStatus('❌ Error: ' + err.message)
      showToast('Import failed: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const clearPending = () => {
    localStorage.removeItem(STORAGE_KEY)
    setExportData(null)
    setImportReady(false)
    showToast('Cleared pending export data')
  }

  // ── REPAIR: Delete broken copied visits (had_sale=true but 0 sale_items) ──
  const [repairing, setRepairing] = useState(false)
  const [repairResult, setRepairResult] = useState(null)

  const handleRepair = async () => {
    if (!window.confirm('This will delete ALL copied visits (from previous imports) and their sale items, so you can re-import fresh. Continue?')) return
    setRepairing(true)
    setStatus('Finding all copied visits...')
    try {
      // Fetch ALL visits with "[Copied from" in notes
      const { data: copiedVisits } = await supabase
        .from('visits')
        .select('id, notes, sale_amount, created_at, sale_items(id)')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .like('notes', '%[Copied from%')
        .limit(2000)

      if (!copiedVisits || copiedVisits.length === 0) {
        setStatus('No copied visits found.')
        setRepairResult({ deleted: 0 })
        setRepairing(false)
        return
      }

      setStatus(`Found ${copiedVisits.length} copied visits – deleting...`)

      let deleted = 0
      for (const v of copiedVisits) {
        // Delete sale_items first (if any)
        if (v.sale_items && v.sale_items.length > 0) {
          await supabase.from('sale_items').delete().eq('visit_id', v.id)
        }
        // Delete the visit itself (hard delete)
        await supabase.from('visits').delete().eq('id', v.id)
        deleted++
        if (deleted % 5 === 0) setStatus(`Deleting ${deleted}/${copiedVisits.length}...`)
      }

      setRepairResult({ deleted })
      setStatus(`✅ Deleted ${deleted} copied visits. Now re-export from Yousef and import again.`)
      showToast(`🔧 Cleaned up ${deleted} copied visits`)

      // Clear localStorage
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      setStatus('❌ Repair failed: ' + err.message)
      showToast('Repair failed: ' + err.message, 'error')
    } finally {
      setRepairing(false)
    }
  }

  const isYousef = user?.id === YOUSEF_USER_ID
  const isJoe = user?.id === JOE_USER_ID

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <h1>Copy Sales</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="page" style={{ paddingTop: 16 }}>
        {/* Current user info */}
        <div className="card" style={{ marginBottom: 16, background: 'var(--blue-light)', border: '1px solid #bfdbfe' }}>
          <p style={{ fontWeight: 700, fontSize: 14 }}>Logged in as: {profile?.display_name || '–'}</p>
          <p className="text-xs text-muted">{user?.email} · {user?.id?.slice(0, 8)}</p>
        </div>

        {/* Instructions */}
        <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>📋 How this works</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            1. Log in as <strong>Yousef</strong> → tap "Export Sales"
            <br/>2. Sign out
            <br/>3. Log in as <strong>Joe</strong> → tap "Import Sales"
            <br/><br/>Sales are copied (not moved) – Yousef keeps all his data.
          </p>
        </div>

        {/* Step 1: Export (Yousef) */}
        {isYousef && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 16px', border: '2px solid var(--blue)' }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: 'var(--blue)' }}>Step 1: Export Sales</p>
            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
              This reads all your sales with items and saves them locally for import.
            </p>
            <button
              className="btn btn-primary btn-full"
              onClick={handleExport}
              disabled={loading}
              style={{ marginBottom: 8 }}
            >
              {loading ? '⏳ Exporting...' : '📤 Export My Sales'}
            </button>
            {exportData && (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '10px 14px', marginTop: 8 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: '#16a34a' }}>✅ Export ready!</p>
                <p className="text-xs text-muted">{exportData.visits.length} sales saved locally. Now sign out and log in as Joe.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Import (Joe) */}
        {isJoe && pendingData && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 16px', border: '2px solid #16a34a' }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#16a34a' }}>Step 2: Import Sales</p>
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>📦 Pending import from {pendingData.source_name}</p>
              <p className="text-xs" style={{ color: '#92400e' }}>
                {pendingData.visits.length} sales · Exported {new Date(pendingData.exported_at).toLocaleString()}
              </p>
            </div>
            <button
              className="btn btn-primary btn-full"
              onClick={handleImport}
              disabled={loading}
              style={{ marginBottom: 8, background: 'linear-gradient(135deg,#16a34a,#15803d)' }}
            >
              {loading ? '⏳ Importing...' : `📥 Import ${pendingData.visits.length} Sales to Joe's Account`}
            </button>
          </div>
        )}

        {/* No pending data and logged in as Joe */}
        {isJoe && !pendingData && !importStats && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-muted)' }}>No export data found</p>
            <p className="text-xs text-muted">Log in as Yousef first and export the sales.</p>
          </div>
        )}

        {/* Repair tool – for Joe to fix broken imports */}
        {isJoe && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 16px', border: '2px solid #d97706' }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#d97706' }}>🔧 Repair Failed Import</p>
            <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
              If a previous import created visits but failed on sale items, this will delete those broken visits so you can re-import cleanly.
            </p>
            <button
              className="btn btn-ghost btn-full"
              onClick={handleRepair}
              disabled={repairing}
              style={{ color: '#d97706', borderColor: '#d97706' }}
            >
              {repairing ? '⏳ Repairing...' : '🔧 Find & Delete Broken Visits'}
            </button>
            {repairResult && (
              <div style={{ marginTop: 8, padding: '10px 14px', background: repairResult.deleted > 0 ? '#f0fdf4' : 'var(--gray-light)', borderRadius: 10, border: repairResult.deleted > 0 ? '1px solid #86efac' : '1px solid var(--border)' }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: repairResult.deleted > 0 ? '#16a34a' : 'var(--text-muted)' }}>
                  {repairResult.deleted > 0 ? `✅ Deleted ${repairResult.deleted} broken visits – re-export from Yousef and import again` : 'No broken visits found'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Not the right account */}
        {!isYousef && !isJoe && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 16px' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: '#d97706' }}>⚠️ Wrong account</p>
            <p className="text-xs text-muted">Log in as Yousef (to export) or Joe (to import).</p>
          </div>
        )}

        {/* Import results */}
        {importStats && (
          <div className="card" style={{ marginBottom: 16, padding: '14px 16px', border: '2px solid #16a34a' }}>
            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 8, color: '#16a34a' }}>✅ Import Complete</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: 20, color: '#16a34a' }}>{importStats.imported}</p>
                <p className="text-xs text-muted">Imported</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: 20, color: 'var(--blue)' }}>{importStats.itemsImported}</p>
                <p className="text-xs text-muted">Items</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: 20, color: importStats.duplicates > 0 ? '#7c3aed' : 'var(--text-muted)' }}>{importStats.duplicates}</p>
                <p className="text-xs text-muted">Duplicates</p>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: 20, color: importStats.skipped > 0 ? '#d97706' : 'var(--text-muted)' }}>{importStats.skipped}</p>
                <p className="text-xs text-muted">Failed</p>
              </div>
            </div>
            {importStats.errors.length > 0 && (
              <div style={{ marginTop: 10, maxHeight: 120, overflowY: 'auto' }}>
                <p className="text-xs text-muted" style={{ marginBottom: 4 }}>Errors:</p>
                {importStats.errors.slice(0, 10).map((e, i) => (
                  <p key={i} className="text-xs" style={{ color: '#dc2626' }}>{e}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Status */}
        {status && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>{status}</p>
        )}

        {/* Clear pending data button */}
        {pendingData && (
          <button onClick={clearPending} className="btn btn-ghost btn-full" style={{ marginTop: 8, color: '#d97706', borderColor: '#d97706' }}>
            🗑️ Clear Pending Export Data
          </button>
        )}
      </div>
    </div>
  )
}
