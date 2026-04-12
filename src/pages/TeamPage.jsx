import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { showToast } from '../components/Toast'
import Icon from '../components/Icon'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// ── Driver Card ───────────────────────────────────────────────
function DriverCard({ driver, onToggleProfit, onToggleActive, onDrillIn }) {
  const [toggling, setToggling] = useState(false)

  const handleToggleProfit = async () => {
    setToggling(true)
    await onToggleProfit(driver.id, !driver.can_see_profit)
    setToggling(false)
  }

  const handleToggleActive = async () => {
    if (!driver.is_active) {
      // Reactivating
      setToggling(true)
      await onToggleActive(driver.id, true)
      setToggling(false)
      return
    }
    if (!window.confirm(`Deactivate ${driver.display_name}? They won't be able to log in.`)) return
    setToggling(true)
    await onToggleActive(driver.id, false)
    setToggling(false)
  }

  return (
    <div className="card" style={{ marginBottom: 10, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
          background: driver.is_active !== false
            ? 'linear-gradient(135deg, var(--blue), #7c3aed)'
            : '#d1d5db',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, fontWeight: 700, color: 'white',
        }}>
          {(driver.display_name || '?')[0].toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }} onClick={() => onDrillIn(driver)}>
          <p style={{ fontWeight: 700, fontSize: 14 }}>
            {driver.display_name || 'Unnamed'}
            {driver.is_active === false && (
              <span style={{ fontSize: 10, color: '#dc2626', fontWeight: 600, marginLeft: 6 }}>INACTIVE</span>
            )}
          </p>
          <p className="text-xs text-muted">@{driver.username || '–'}</p>
          {driver._todayRev !== undefined && (
            <p className="text-xs" style={{ color: 'var(--blue)', marginTop: 2 }}>
              Today: ${driver._todayRev.toFixed(2)} · Week: ${driver._weekRev.toFixed(2)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleToggleProfit}
            disabled={toggling}
            title={driver.can_see_profit ? 'Hide cost & profit from driver' : 'Show cost & profit to driver'}
            style={{
              padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: '1.5px solid',
              background: driver.can_see_profit ? '#f0fdf4' : 'var(--gray-light)',
              borderColor: driver.can_see_profit ? '#86efac' : 'var(--border)',
              color: driver.can_see_profit ? '#16a34a' : 'var(--text-muted)',
            }}>
            {driver.can_see_profit ? '💰 Cost On' : '🔒 Cost Off'}
          </button>
          <button
            onClick={handleToggleActive}
            disabled={toggling}
            style={{
              padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: '1.5px solid',
              background: driver.is_active !== false ? '#fef2f2' : '#f0fdf4',
              borderColor: driver.is_active !== false ? '#fecaca' : '#86efac',
              color: driver.is_active !== false ? '#dc2626' : '#16a34a',
            }}>
            {driver.is_active !== false ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Driver Detail Modal ───────────────────────────────────────
function DriverDetailModal({ driver, onClose }) {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('week')

  const loadSales = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    let since
    if (period === 'today') {
      since = new Date(now.toLocaleDateString('en-CA') + 'T00:00:00').toISOString()
    } else if (period === 'week') {
      since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    } else {
      since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    }

    const { data } = await supabase
      .from('visits')
      .select('id, customer_id, had_sale, sale_amount, cost, outcome, notes, created_at, sale_items(product_name, qty, unit_price, total_price, total_profit)')
      .eq('user_id', driver.id)
      .gte('created_at', since)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(100)
    setSales(data || [])
    setLoading(false)
  }, [driver.id, period])

  useEffect(() => { loadSales() }, [loadSales])

  const totalRev = sales.reduce((s, v) => s + (v.sale_amount || 0), 0)
  const totalProfit = sales.reduce((s, v) => {
    const vProfit = (v.sale_items || []).reduce((ps, si) => ps + (si.total_profit || 0), 0)
    return s + vProfit
  }, 0)
  const saleCount = sales.filter(v => v.had_sale).length

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>{driver.display_name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Period tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
          {[['today', 'Today'], ['week', 'This Week'], ['month', 'This Month']].map(([p, l]) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer', fontWeight: 600,
              background: period === p ? 'var(--blue)' : 'var(--gray-light)',
              color: period === p ? 'white' : 'var(--text)',
              border: `1.5px solid ${period === p ? 'var(--blue)' : 'var(--border)'}`,
            }}>{l}</button>
          ))}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
          <div className="card" style={{ textAlign: 'center', padding: '10px 6px' }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: 'var(--blue)' }}>{sales.length}</p>
            <p className="text-xs text-muted">Visits</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '10px 6px' }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#d97706' }}>${totalRev.toFixed(0)}</p>
            <p className="text-xs text-muted">Revenue</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '10px 6px' }}>
            <p style={{ fontWeight: 800, fontSize: 17, color: '#16a34a' }}>${totalProfit.toFixed(0)}</p>
            <p className="text-xs text-muted">Profit</p>
          </div>
        </div>

        {/* Sales list */}
        <p className="section-header">Sales ({saleCount})</p>
        <div style={{ maxHeight: 340, overflowY: 'auto' }}>
          {loading ? (
            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 20 }}>Loading...</p>
          ) : sales.length === 0 ? (
            <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 20 }}>No activity this period</p>
          ) : sales.map(v => (
            <div key={v.id} className="card" style={{ marginBottom: 6, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontWeight: 600, fontSize: 13 }}>
                  {v.had_sale ? '💰' : '🤝'} {v.had_sale ? `$${(v.sale_amount || 0).toFixed(2)}` : 'No sale'}
                </p>
                <p className="text-xs text-muted">
                  {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              {v.sale_items?.length > 0 && (
                <div style={{ marginTop: 4 }}>
                  {v.sale_items.map((si, idx) => (
                    <p key={idx} className="text-xs text-muted">
                      {si.product_name} × {si.qty} @ ${si.unit_price} = ${(si.total_price || 0).toFixed(2)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main Team Page ────────────────────────────────────────────
export default function TeamPage() {
  const { user, profile, isOwner } = useAuth()
  const navigate = useNavigate()

  const [drivers, setDrivers] = useState([])
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [genLabel, setGenLabel] = useState('')
  const [generating, setGenerating] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState(null)
  const [tab, setTab] = useState('drivers')

  // Load drivers and codes
  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)

    // Fetch driver profiles
    const { data: driverProfiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, role, can_see_profit, is_active, created_at')
      .eq('parent_user_id', user.id)
      .order('created_at', { ascending: false })

    // Fetch revenue stats for each driver
    const driversWithStats = []
    const todayStr = new Date().toLocaleDateString('en-CA')
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    for (const d of (driverProfiles || [])) {
      // Today's sales
      const { data: todaySales } = await supabase
        .from('sale_items').select('total_price')
        .eq('user_id', d.id)
        .gte('created_at', todayStr + 'T00:00:00')
      const todayRev = (todaySales || []).reduce((s, i) => s + (i.total_price || 0), 0)

      // Week sales
      const { data: weekSales } = await supabase
        .from('sale_items').select('total_price')
        .eq('user_id', d.id)
        .gte('created_at', weekAgo)
      const weekRev = (weekSales || []).reduce((s, i) => s + (i.total_price || 0), 0)

      driversWithStats.push({ ...d, _todayRev: todayRev, _weekRev: weekRev })
    }
    setDrivers(driversWithStats)

    // Fetch driver codes
    const { data: codeRows } = await supabase
      .from('driver_codes')
      .select('id, code, label, used_by, used_at, created_at')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false })
    setCodes(codeRows || [])

    setLoading(false)
  }, [user])

  useEffect(() => { loadData() }, [loadData])

  // Generate a new driver code
  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const code = generateCode()
      const { error } = await supabase.from('driver_codes').insert([{
        owner_user_id: user.id,
        code,
        label: genLabel.trim() || null,
      }])
      if (error) throw error
      showToast(`✅ Driver code generated: ${code}`)
      setGenLabel('')
      loadData()
    } catch (err) {
      showToast('❌ ' + err.message, 'error')
    } finally {
      setGenerating(false)
    }
  }

  // Delete an unused code
  const handleDeleteCode = async (codeId) => {
    if (!window.confirm('Delete this code?')) return
    await supabase.from('driver_codes').delete().eq('id', codeId)
    setCodes(prev => prev.filter(c => c.id !== codeId))
    showToast('Code deleted')
  }

  // Toggle profit visibility for a driver
  const handleToggleProfit = async (driverId, newVal) => {
    const { error } = await supabase.from('profiles').update({ can_see_profit: newVal }).eq('id', driverId)
    if (error) { showToast('❌ ' + error.message, 'error'); return }
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, can_see_profit: newVal } : d))
    showToast(newVal ? '💰 Cost & profit visible to driver' : '🔒 Cost & profit hidden from driver')
  }

  // Toggle active status for a driver
  const handleToggleActive = async (driverId, newVal) => {
    const { error } = await supabase.from('profiles').update({ is_active: newVal }).eq('id', driverId)
    if (error) { showToast('❌ ' + error.message, 'error'); return }
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, is_active: newVal } : d))
    showToast(newVal ? '✅ Driver reactivated' : '⛔ Driver deactivated')
  }

  // Not an owner – redirect
  if (!isOwner) {
    return (
      <div>
        <div className="page-header">
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>←</button>
          <h1>Team</h1>
          <div style={{ width: 36 }} />
        </div>
        <div className="page" style={{ textAlign: 'center', paddingTop: 60 }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>🔒</p>
          <p style={{ fontWeight: 700 }}>Only distributors can manage drivers</p>
        </div>
      </div>
    )
  }

  // Total team stats
  const teamTodayRev = drivers.reduce((s, d) => s + (d._todayRev || 0), 0)
  const teamWeekRev = drivers.reduce((s, d) => s + (d._weekRev || 0), 0)
  const activeDrivers = drivers.filter(d => d.is_active !== false)

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20 }}>←</button>
        <h1>Team</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', background: 'var(--gray-light)', borderRadius: 10, padding: 4, margin: '0 16px 14px' }}>
        {[['drivers', `🚗 Drivers (${activeDrivers.length})`], ['codes', `🔑 Codes (${codes.length})`]].map(([t, l]) => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: tab === t ? 'white' : 'transparent',
            color: tab === t ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          }}>{l}</button>
        ))}
      </div>

      <div className="page" style={{ paddingTop: 0 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--blue)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          </div>
        ) : tab === 'drivers' ? (
          <>
            {/* Team summary */}
            {drivers.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <div style={{ background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Today</p>
                  <p style={{ color: 'white', fontWeight: 900, fontSize: 22, marginTop: 4 }}>${teamTodayRev.toFixed(2)}</p>
                </div>
                <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)', borderRadius: 12, padding: '12px 14px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team This Week</p>
                  <p style={{ color: 'white', fontWeight: 900, fontSize: 22, marginTop: 4 }}>${teamWeekRev.toFixed(2)}</p>
                </div>
              </div>
            )}

            {/* Driver list */}
            {drivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: 48, marginBottom: 12 }}>🚗</p>
                <p style={{ fontWeight: 700, marginBottom: 4 }}>No drivers yet</p>
                <p className="text-sm text-muted">Generate a driver code and share it with your team</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setTab('codes')}>
                  🔑 Generate Driver Code
                </button>
              </div>
            ) : (
              drivers.map(d => (
                <DriverCard
                  key={d.id}
                  driver={d}
                  onToggleProfit={handleToggleProfit}
                  onToggleActive={handleToggleActive}
                  onDrillIn={setSelectedDriver}
                />
              ))
            )}
          </>
        ) : (
          <>
            {/* Generate new code */}
            <div className="card" style={{ marginBottom: 16, padding: '16px' }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Generate Driver Code</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  value={genLabel}
                  onChange={e => setGenLabel(e.target.value)}
                  placeholder="Label (optional) – e.g. For Ahmad"
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {generating ? '...' : '+ Generate'}
                </button>
              </div>
              <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                Share the code with your driver – they'll enter it during registration
              </p>
            </div>

            {/* Existing codes */}
            {codes.length === 0 ? (
              <p className="text-sm text-muted" style={{ textAlign: 'center', padding: 20 }}>No codes generated yet</p>
            ) : codes.map(c => (
              <div key={c.id} className="card" style={{ marginBottom: 8, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, letterSpacing: '2px', color: c.used_by ? 'var(--text-muted)' : 'var(--blue)' }}>
                      {c.code}
                    </p>
                    <p className="text-xs text-muted" style={{ marginTop: 2 }}>
                      {c.label ? `${c.label} · ` : ''}
                      {c.used_by
                        ? `Used ${new Date(c.used_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        : `Created ${new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                      }
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {c.used_by ? (
                      <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 700 }}>
                        ✓ Used
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => { navigator.clipboard.writeText(c.code); showToast('📋 Code copied!') }}
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'white', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                          📋 Copy
                        </button>
                        <button
                          onClick={() => handleDeleteCode(c.id)}
                          style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #fecaca', background: '#fef2f2', fontSize: 12, cursor: 'pointer', fontWeight: 600, color: '#dc2626' }}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Driver detail modal */}
      {selectedDriver && (
        <DriverDetailModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
        />
      )}
    </div>
  )
}
