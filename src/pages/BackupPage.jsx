import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const TABLES = ['customers', 'products', 'visits', 'sale_items', 'purchases', 'orders', 'profiles']

const TABLE_ICONS = {
  customers: '👥', products: '📦', visits: '📋',
  sale_items: '💰', purchases: '🛒', orders: '📬', profiles: '👤',
}

export default function BackupPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exportProgress, setExportProgress] = useState([])
  const [importProgress, setImportProgress] = useState([])
  const [importFile, setImportFile] = useState(null)
  const [importPreview, setImportPreview] = useState(null)
  const [importError, setImportError] = useState('')
  const [step, setStep] = useState('idle') // idle | exporting | exported | importing | imported | error

  const log = (setter, msg, type = 'info') =>
    setter(prev => [...prev, { msg, type, t: Date.now() }])

  // ── EXPORT ──
  const handleExport = async () => {
    setExporting(true)
    setExportProgress([])
    setStep('exporting')

    const backup = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      user_id: user.id,
      data: {},
    }

    try {
      for (const table of TABLES) {
        log(setExportProgress, `📥 Fetching ${table}...`)
        const col = table === 'profiles' ? 'id' : 'user_id'
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq(col, user.id)
          .limit(10000)

        if (error) {
          log(setExportProgress, `⚠️ ${table}: ${error.message}`, 'warn')
          backup.data[table] = []
        } else {
          backup.data[table] = data || []
          log(setExportProgress, `✅ ${table}: ${(data||[]).length} records`, 'success')
        }
      }

      // Build summary
      const totalRecords = Object.values(backup.data).reduce((s, a) => s + a.length, 0)
      backup.summary = {
        total_records: totalRecords,
        tables: Object.fromEntries(Object.entries(backup.data).map(([k, v]) => [k, v.length])),
      }

      // Download as JSON
      const json = JSON.stringify(backup, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().split('T')[0]
      a.href = url
      a.download = `field-sales-backup-${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      log(setExportProgress, `\n🎉 Done! ${totalRecords} total records exported.`, 'success')
      setStep('exported')
    } catch (err) {
      log(setExportProgress, `❌ Export failed: ${err.message}`, 'error')
      setStep('error')
    } finally {
      setExporting(false)
    }
  }

  // ── FILE SELECTION ──
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportError('')
    setImportPreview(null)
    setImportFile(file)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const backup = JSON.parse(ev.target.result)
        if (!backup.version || !backup.data) {
          setImportError('Invalid backup file — make sure you select a file exported from this app.')
          return
        }
        setImportPreview({
          exported_at: backup.exported_at,
          summary: backup.summary || {},
          data: backup.data,
        })
      } catch {
        setImportError('Could not read file. Make sure it\'s a valid JSON backup.')
      }
    }
    reader.readAsText(file)
  }

  // ── IMPORT ──
  const handleImport = async () => {
    if (!importPreview) return
    setImporting(true)
    setImportProgress([])
    setStep('importing')

    try {
      const { data: importedData } = importPreview

      // Import in dependency order: profiles, products, customers, visits, sale_items, purchases, orders
      const ORDER = ['profiles', 'products', 'customers', 'visits', 'sale_items', 'purchases', 'orders']

      for (const table of ORDER) {
        const rows = importedData[table]
        if (!rows || rows.length === 0) {
          log(setImportProgress, `⏭ ${table}: empty, skipped`)
          continue
        }

        log(setImportProgress, `⏳ Importing ${rows.length} ${table}...`)

        // Upsert in batches of 100
        let imported = 0
        for (let i = 0; i < rows.length; i += 100) {
          const batch = rows.slice(i, i + 100)
          const { error } = await supabase
            .from(table)
            .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })

          if (error) {
            log(setImportProgress, `⚠️ ${table} batch ${i/100+1}: ${error.message}`, 'warn')
          } else {
            imported += batch.length
          }
        }
        log(setImportProgress, `✅ ${table}: ${imported}/${rows.length} imported`, 'success')
      }

      log(setImportProgress, '\n🎉 Import complete! Reload the app to see your data.', 'success')
      setStep('imported')
    } catch (err) {
      log(setImportProgress, `❌ Import failed: ${err.message}`, 'error')
      setStep('error')
    } finally {
      setImporting(false)
    }
  }

  const reset = () => {
    setStep('idle')
    setExportProgress([])
    setImportProgress([])
    setImportFile(null)
    setImportPreview(null)
    setImportError('')
  }

  const LogPanel = ({ entries }) => (
    <div style={{
      background: '#0f172a', borderRadius: 10, padding: 14,
      maxHeight: 260, overflowY: 'auto', fontSize: 13,
      lineHeight: 1.8, fontFamily: 'monospace',
    }}>
      {entries.length === 0
        ? <p style={{ color: '#64748b' }}>Starting...</p>
        : entries.map((e, i) => (
          <div key={i} style={{
            color: e.type === 'error' ? '#f87171'
              : e.type === 'success' ? '#4ade80'
              : e.type === 'warn' ? '#fbbf24'
              : '#94a3b8',
            whiteSpace: 'pre-wrap',
          }}>{e.msg}</div>
        ))
      }
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1>Backup & Restore</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {/* ── EXPORT SECTION ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize: 22,
            }}>💾</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16 }}>Export Backup</p>
              <p className="text-xs text-muted">Download all your data as a JSON file</p>
            </div>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 14 }}>
            <p className="text-xs text-muted" style={{ marginBottom: 4 }}>What gets exported:</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {TABLES.map(t => (
                <span key={t} style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 20,
                  background: 'white', border: '1px solid #e2e8f0', fontWeight: 500,
                }}>
                  {TABLE_ICONS[t]} {t}
                </span>
              ))}
            </div>
          </div>

          {(step === 'exporting' || step === 'exported') && (
            <div style={{ marginBottom: 12 }}>
              <LogPanel entries={exportProgress} />
            </div>
          )}

          {step === 'exported' ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleExport} style={{
                flex: 1, padding: '11px', borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'white',
                cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}>↻ Export Again</button>
              <button onClick={reset} style={{
                flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                background: '#6366f1', color: 'white',
                cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}>Done</button>
            </div>
          ) : (
            <button
              onClick={handleExport}
              disabled={exporting}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #6366f1, #4f46e5)',
                color: 'white', fontWeight: 700, fontSize: 15,
                cursor: exporting ? 'not-allowed' : 'pointer',
              }}
            >
              {exporting ? '⏳ Exporting...' : '💾 Export My Data'}
            </button>
          )}
        </div>

        {/* ── IMPORT SECTION ── */}
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, #16a34a, #15803d)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize: 22,
            }}>📂</div>
            <div>
              <p style={{ fontWeight: 800, fontSize: 16 }}>Import / Restore</p>
              <p className="text-xs text-muted">Restore data from a backup file</p>
            </div>
          </div>

          {/* Warning */}
          <div style={{
            background: '#fff7ed', border: '1px solid #fed7aa',
            borderRadius: 10, padding: '10px 14px', marginBottom: 14,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 18 }}>⚠️</span>
            <p style={{ fontSize: 13, color: '#9a3412', lineHeight: 1.5 }}>
              Import uses <strong>upsert</strong> — existing records with the same ID will be overwritten. New records will be added. Nothing is deleted.
            </p>
          </div>

          {/* File picker */}
          <label style={{
            display: 'block', border: '2px dashed var(--border)', borderRadius: 10,
            padding: '20px', textAlign: 'center', cursor: 'pointer',
            marginBottom: 14, background: '#fafafa',
          }}>
            <input type="file" accept=".json" onChange={handleFileSelect} style={{ display: 'none' }} />
            {importFile ? (
              <div>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📄</div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{importFile.name}</p>
                <p className="text-xs text-muted">Tap to choose a different file</p>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 6 }}>📁</div>
                <p style={{ fontWeight: 600, fontSize: 14 }}>Tap to select backup file</p>
                <p className="text-xs text-muted">.json files only</p>
              </div>
            )}
          </label>

          {importError && (
            <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontSize: 13 }}>
              {importError}
            </div>
          )}

          {/* Preview */}
          {importPreview && !importing && step !== 'importing' && step !== 'imported' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: '#15803d', marginBottom: 8 }}>✅ Valid backup file</p>
              <p className="text-xs text-muted" style={{ marginBottom: 6 }}>
                Exported: {importPreview.exported_at ? new Date(importPreview.exported_at).toLocaleString() : 'unknown'}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.entries(importPreview.summary.tables || {}).map(([t, count]) => (
                  count > 0 && (
                    <span key={t} style={{
                      fontSize: 11, padding: '3px 8px', borderRadius: 20,
                      background: 'white', border: '1px solid #bbf7d0', fontWeight: 600,
                    }}>
                      {TABLE_ICONS[t] || '📋'} {t}: {count}
                    </span>
                  )
                ))}
              </div>
            </div>
          )}

          {(step === 'importing' || step === 'imported') && (
            <div style={{ marginBottom: 12 }}>
              <LogPanel entries={importProgress} />
            </div>
          )}

          {step === 'imported' ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => window.location.href = '/'} style={{
                flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                background: '#16a34a', color: 'white',
                cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}>🏠 Go to Dashboard</button>
              <button onClick={reset} style={{
                flex: 1, padding: '11px', borderRadius: 10,
                border: '1.5px solid var(--border)', background: 'white',
                cursor: 'pointer', fontWeight: 600, fontSize: 14,
              }}>Import Another</button>
            </div>
          ) : (
            <button
              onClick={handleImport}
              disabled={!importPreview || importing}
              style={{
                width: '100%', padding: '13px', borderRadius: 10, border: 'none',
                background: !importPreview || importing ? '#94a3b8' : 'linear-gradient(135deg, #16a34a, #15803d)',
                color: 'white', fontWeight: 700, fontSize: 15,
                cursor: !importPreview || importing ? 'not-allowed' : 'pointer',
              }}
            >
              {importing ? '⏳ Importing...' : '📂 Import & Restore'}
            </button>
          )}
        </div>

        {/* Tips */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px' }}>
          <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>💡 Backup tips</p>
          {[
            'Export before making major changes or switching phones',
            'Store backups in Google Drive or iCloud for safekeeping',
            'Each export is a complete snapshot — keep the last few',
            'Import is safe — it overwrites by ID, never deletes',
          ].map((tip, i) => (
            <p key={i} className="text-sm text-muted" style={{ marginBottom: 4 }}>• {tip}</p>
          ))}
        </div>

      </div>
    </div>
  )
}
