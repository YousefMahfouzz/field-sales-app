import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { useTerritorySchedule } from '../hooks/useTerritorySchedule'
import { SEED_CUSTOMERS, BLOCK_SUMMARY } from '../lib/seedData'
import { EXPANDED_SEED_CUSTOMERS, EXPANDED_BLOCK_SUMMARY } from '../lib/seedDataExpanded'
import { MS_AL_SEED_CUSTOMERS, MS_AL_BLOCK_SUMMARY } from '../lib/seedDataMSAL'
import { CLEVELAND_SEED_CUSTOMERS, CLEVELAND_BLOCK_SUMMARY } from '../lib/seedDataCleveland'
import { GNO_SEED_CUSTOMERS, GNO_BLOCK_SUMMARY } from '../lib/seedDataGNO'

// Sally Beauty excluded globally
const filterSally = arr => arr.filter(c =>
  !c.full_name?.toLowerCase().includes('sally') &&
  !c.business_name?.toLowerCase().includes('sally')
)

const ALL_SEED = [
  ...filterSally(SEED_CUSTOMERS),
  ...filterSally(EXPANDED_SEED_CUSTOMERS),
  ...MS_AL_SEED_CUSTOMERS,
  ...GNO_SEED_CUSTOMERS,
  ...CLEVELAND_SEED_CUSTOMERS,
]

const ALL_BLOCKS = {
  // GNO Area
  'New Orleans (Central)': { gas_stations: 3, beauty_supply: 6, total: 9, black_pct: '58%', state: 'LA', region: 'GNO' },
  'New Orleans East': { ...GNO_BLOCK_SUMMARY['New Orleans East'], state: 'LA', region: 'GNO' },
  'Metairie / Kenner': { ...GNO_BLOCK_SUMMARY['Metairie / Kenner'], state: 'LA', region: 'GNO' },
  'Westbank': { ...GNO_BLOCK_SUMMARY['Westbank'], state: 'LA', region: 'GNO' },
  'Chalmette / Arabi': { ...GNO_BLOCK_SUMMARY['Chalmette / Arabi'], state: 'LA', region: 'GNO' },
  'Northshore (Mandeville/Covington)': { ...GNO_BLOCK_SUMMARY['Northshore (Mandeville/Covington)'], state: 'LA', region: 'GNO' },
  'Slidell': { gas_stations: 2, beauty_supply: 1, total: 3, black_pct: '27%', state: 'LA', region: 'GNO' },
  // SE Louisiana
  'Hammond / Ponchatoula': { ...BLOCK_SUMMARY['Hammond / Ponchatoula'], state: 'LA', region: 'SE Louisiana' },
  'Houma': { ...BLOCK_SUMMARY['Houma'], state: 'LA', region: 'SE Louisiana' },
  'Thibodaux': { ...BLOCK_SUMMARY['Thibodaux'], state: 'LA', region: 'SE Louisiana' },
  'Donaldsonville': { ...EXPANDED_BLOCK_SUMMARY['Donaldsonville'], state: 'LA', region: 'SE Louisiana' },
  'Morgan City': { ...EXPANDED_BLOCK_SUMMARY['Morgan City'], state: 'LA', region: 'SE Louisiana' },
  // Central/North Louisiana
  'Baton Rouge': { ...EXPANDED_BLOCK_SUMMARY['Baton Rouge'], state: 'LA', region: 'Central LA' },
  'Baker': { ...EXPANDED_BLOCK_SUMMARY['Baker'], state: 'LA', region: 'Central LA' },
  'St. Gabriel / Iberville': { ...EXPANDED_BLOCK_SUMMARY['St. Gabriel / Iberville'], state: 'LA', region: 'Central LA' },
  'Opelousas': { ...EXPANDED_BLOCK_SUMMARY['Opelousas'], state: 'LA', region: 'Central LA' },
  'Lafayette': { ...EXPANDED_BLOCK_SUMMARY['Lafayette'], state: 'LA', region: 'Central LA' },
  'Crowley / Rayne': { ...EXPANDED_BLOCK_SUMMARY['Crowley / Rayne'], state: 'LA', region: 'Central LA' },
  'Ville Platte': { ...EXPANDED_BLOCK_SUMMARY['Ville Platte'], state: 'LA', region: 'Central LA' },
  'Alexandria': { ...EXPANDED_BLOCK_SUMMARY['Alexandria'], state: 'LA', region: 'Central LA' },
  'Shreveport': { ...EXPANDED_BLOCK_SUMMARY['Shreveport'], state: 'LA', region: 'N Louisiana' },
  'Monroe': { ...EXPANDED_BLOCK_SUMMARY['Monroe'], state: 'LA', region: 'N Louisiana' },
  'Bastrop': { ...EXPANDED_BLOCK_SUMMARY['Bastrop'], state: 'LA', region: 'N Louisiana' },
  'Bogalusa': { ...EXPANDED_BLOCK_SUMMARY['Bogalusa'], state: 'LA', region: 'N Louisiana' },
  'Lake Charles': { ...EXPANDED_BLOCK_SUMMARY['Lake Charles'], state: 'LA', region: 'SW Louisiana' },
  // Mississippi
  'Jackson MS': { ...MS_AL_BLOCK_SUMMARY['Jackson MS'], state: 'MS', region: 'Mississippi' },
  'Hattiesburg MS': { ...MS_AL_BLOCK_SUMMARY['Hattiesburg MS'], state: 'MS', region: 'Mississippi' },
  'Greenville MS': { ...MS_AL_BLOCK_SUMMARY['Greenville MS'], state: 'MS', region: 'Mississippi' },
  'Cleveland MS': { ...MS_AL_BLOCK_SUMMARY['Cleveland MS'], state: 'MS', region: 'Mississippi' },
  'Yazoo City MS': { ...MS_AL_BLOCK_SUMMARY['Yazoo City MS'], state: 'MS', region: 'Mississippi' },
  'Vicksburg MS': { ...MS_AL_BLOCK_SUMMARY['Vicksburg MS'], state: 'MS', region: 'Mississippi' },
  'Canton MS': { ...MS_AL_BLOCK_SUMMARY['Canton MS'], state: 'MS', region: 'Mississippi' },
  'Moss Point MS': { ...MS_AL_BLOCK_SUMMARY['Moss Point MS'], state: 'MS', region: 'Mississippi' },
  // Alabama
  'Birmingham AL': { ...MS_AL_BLOCK_SUMMARY['Birmingham AL'], state: 'AL', region: 'Alabama' },
  'Montgomery AL': { ...MS_AL_BLOCK_SUMMARY['Montgomery AL'], state: 'AL', region: 'Alabama' },
  'Mobile AL': { ...MS_AL_BLOCK_SUMMARY['Mobile AL'], state: 'AL', region: 'Alabama' },
  'Tuscaloosa AL': { ...MS_AL_BLOCK_SUMMARY['Tuscaloosa AL'], state: 'AL', region: 'Alabama' },
  'Selma AL': { ...MS_AL_BLOCK_SUMMARY['Selma AL'], state: 'AL', region: 'Alabama' },
  'Huntsville AL': { ...MS_AL_BLOCK_SUMMARY['Huntsville AL'], state: 'AL', region: 'Alabama' },
  // Ohio
  ...Object.fromEntries(Object.entries(CLEVELAND_BLOCK_SUMMARY).map(([k, v]) => [k, { ...v }])),
}

const REGION_COLORS = {
  'GNO': '#7c3aed',
  'SE Louisiana': '#0891b2',
  'Central LA': '#16a34a',
  'N Louisiana': '#d97706',
  'SW Louisiana': '#0369a1',
  'Mississippi': '#dc2626',
  'Alabama': '#c2410c',
  'Cleveland Ohio': '#0284c7',
}

const DAY_COLORS = ['#2563eb','#16a34a','#d97706','#7c3aed','#dc2626','#0891b2','#374151']
const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']

export default function TerritoryPage() {
  const navigate = useNavigate()
  const { customers, addCustomer, deleteCustomer } = useCustomers()
  const { schedule, assignDay, DAYS: scheduleDays } = useTerritorySchedule()
  const [importing, setImporting] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [imported, setImported] = useState({})
  const [error, setError] = useState('')
  const [tab, setTab] = useState('blocks') // 'blocks' | 'schedule'
  const [regionFilter, setRegionFilter] = useState('all')
  const [confirmRemove, setConfirmRemove] = useState(null)

  const existingByAddress = useMemo(() =>
    new Set(customers.map(c => c.address?.toLowerCase().trim())),
    [customers]
  )

  const getBlockSeed = block => ALL_SEED.filter(c => c.area === block)
  const getImportedCount = block => getBlockSeed(block).filter(c => existingByAddress.has(c.address?.toLowerCase().trim())).length
  const getNewCount = block => getBlockSeed(block).filter(c => !existingByAddress.has(c.address?.toLowerCase().trim())).length

  const handleImport = async (block, forceReimport = false) => {
    const seed = getBlockSeed(block)
    const toImport = forceReimport ? seed : seed.filter(c => !existingByAddress.has(c.address?.toLowerCase().trim()))
    if (!toImport.length) { setImported(p => ({ ...p, [block]: 0 })); return }
    setImporting(block); setError('')
    let count = 0
    try {
      for (const c of toImport) {
        await addCustomer({ ...c, tags: c.tags || [], visit_frequency_days: c.visit_frequency_days || 14 })
        count++
      }
      setImported(p => ({ ...p, [block]: count }))
    } catch (err) { setError(`Error importing ${block}: ${err.message}`) }
    finally { setImporting(null) }
  }

  const handleRemoveBlock = async (block) => {
    setRemoving(block)
    try {
      const blockCustomers = customers.filter(c => c.area === block)
      for (const c of blockCustomers) await deleteCustomer(c.id)
      setImported(p => { const n = { ...p }; delete n[block]; return n })
    } catch (err) { setError(`Error removing: ${err.message}`) }
    finally { setRemoving(null); setConfirmRemove(null) }
  }

  const regions = ['all', ...new Set(Object.values(ALL_BLOCKS).map(b => b.region))]
  const blockNames = Object.keys(ALL_BLOCKS).filter(b =>
    regionFilter === 'all' || ALL_BLOCKS[b].region === regionFilter
  )

  const totalProspects = Object.keys(ALL_BLOCKS).reduce((s, b) => s + (ALL_BLOCKS[b].total || 0), 0)
  const totalImported = customers.filter(c => c.status === 'do_not_visit').length

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <h1>Territory Blocks</h1>
        <div style={{ width: 36 }} />
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'white' }}>
        {[['blocks', '🗺️ Blocks'], ['schedule', '📅 Schedule']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            flex: 1, padding: '12px 0', background: 'none', border: 'none',
            borderBottom: tab === key ? '3px solid var(--blue)' : '3px solid transparent',
            color: tab === key ? 'var(--blue)' : 'var(--text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer'
          }}>{label}</button>
        ))}
      </div>

      {/* ── BLOCKS TAB ── */}
      {tab === 'blocks' && (
        <div className="page" style={{ paddingTop: 12 }}>
          {/* Stats */}
          <div className="metrics-grid" style={{ marginBottom: 12 }}>
            <div className="metric-card">
              <div className="metric-value" style={{ color: 'var(--blue)', fontSize: 18 }}>{Object.keys(ALL_BLOCKS).length}</div>
              <div className="metric-label">Territory blocks</div>
            </div>
            <div className="metric-card">
              <div className="metric-value" style={{ color: 'var(--green)', fontSize: 18 }}>{totalImported}</div>
              <div className="metric-label">Prospects imported</div>
            </div>
          </div>

          {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '12px 16px', borderRadius: 8, marginBottom: 12, fontSize: 14 }}>{error}</div>}

          {/* Region filter */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', marginBottom: 12 }}>
            {regions.map(r => (
              <button key={r} onClick={() => setRegionFilter(r)} style={{
                flexShrink: 0, padding: '5px 12px', borderRadius: 20, border: '1.5px solid',
                borderColor: regionFilter === r ? 'var(--blue)' : 'var(--border)',
                background: regionFilter === r ? 'var(--blue)' : 'white',
                color: regionFilter === r ? 'white' : 'var(--text)', fontSize: 12, fontWeight: 500, cursor: 'pointer'
              }}>{r === 'all' ? '🗺️ All' : r}</button>
            ))}
          </div>

          {/* Block cards */}
          {blockNames.map(block => {
            const info = ALL_BLOCKS[block]
            const importedCount = getImportedCount(block)
            const newCount = getNewCount(block)
            const isImporting = importing === block
            const isRemoving = removing === block
            const color = REGION_COLORS[info.region] || '#6b7280'
            const dayAssigned = schedule[block]
            const dayIdx = DAYS.indexOf(dayAssigned)
            const dayColor = dayIdx >= 0 ? DAY_COLORS[dayIdx] : null
            const blockCustomerCount = customers.filter(c => c.area === block).length

            return (
              <div key={block} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${color}`, padding: '12px 14px' }}>
                <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-8" style={{ marginBottom: 2 }}>
                      <h3 style={{ fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{block}</h3>
                      <span style={{ fontSize: 11, background: color + '20', color, padding: '1px 7px', borderRadius: 20, flexShrink: 0, fontWeight: 600 }}>
                        {info.state}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      ⛽{info.gas_stations} · 💄{info.beauty_supply} · 🖤 {info.black_pct}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0, marginLeft: 8 }}>
                    {dayAssigned && (
                      <span style={{ fontSize: 11, background: dayColor + '20', color: dayColor, padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>
                        📅 {dayAssigned}
                      </span>
                    )}
                    {importedCount > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--green)' }}>✅ {blockCustomerCount} in DB</span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {/* Import / Re-import */}
                  {newCount > 0 ? (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleImport(block)}
                      disabled={!!importing}
                      style={{ background: color, borderColor: color, fontSize: 12, padding: '6px 12px' }}
                    >
                      {isImporting ? '...' : `+ Import ${newCount}`}
                    </button>
                  ) : importedCount > 0 ? (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => handleImport(block, true)}
                      disabled={!!importing}
                      style={{ fontSize: 12, padding: '6px 12px' }}
                    >
                      {isImporting ? '...' : '🔄 Re-import'}
                    </button>
                  ) : null}

                  {/* Remove block */}
                  {blockCustomerCount > 0 && (
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setConfirmRemove(block)}
                      disabled={!!removing}
                      style={{ fontSize: 12, padding: '6px 12px', color: 'var(--red)', borderColor: 'var(--red)' }}
                    >
                      {isRemoving ? '...' : `🗑️ Remove (${blockCustomerCount})`}
                    </button>
                  )}

                  {/* Day picker */}
                  <select
                    value={dayAssigned || ''}
                    onChange={e => assignDay(block, e.target.value || null)}
                    style={{
                      fontSize: 12, padding: '5px 8px', borderRadius: 8,
                      border: '1px solid var(--border)', background: dayAssigned ? dayColor + '15' : 'var(--gray-light)',
                      color: dayAssigned ? dayColor : 'var(--text-muted)', fontWeight: dayAssigned ? 600 : 400,
                      cursor: 'pointer', maxWidth: 110
                    }}
                  >
                    <option value=''>📅 Assign day</option>
                    {DAYS.map((d, i) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            )
          })}

          {/* Import all in region */}
          <button
            className="btn btn-success btn-full"
            onClick={async () => { for (const b of blockNames) await handleImport(b) }}
            disabled={!!importing}
            style={{ marginTop: 8, fontSize: 16, padding: '14px 20px' }}
          >
            {importing ? `Importing ${importing}...` : `🚀 Import All ${regionFilter === 'all' ? '' : regionFilter + ' '}Blocks`}
          </button>

          <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--gray-light)', borderRadius: 10 }}>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>ℹ️ Import rules</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              All prospects added as "Do Not Visit Yet" · Change to Active when ready · Route planner will then suggest them · Sally Beauty always excluded · Use Re-import to restore a cleared block
            </p>
          </div>
        </div>
      )}

      {/* ── SCHEDULE TAB ── */}
      {tab === 'schedule' && (
        <div className="page" style={{ paddingTop: 12 }}>
          <p className="text-sm text-muted" style={{ marginBottom: 16 }}>
            Assign territories to days of the week. You can do multiple territories on the same day. This is for planning visibility only — it doesn't lock your routes.
          </p>

          {DAYS.map((day, dayIdx) => {
            const dayColor = DAY_COLORS[dayIdx]
            const blocksForDay = Object.entries(schedule).filter(([, d]) => d === day).map(([b]) => b)
            const isToday = DAYS[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] === day

            return (
              <div key={day} className="card" style={{ marginBottom: 10, borderLeft: `4px solid ${dayColor}` }}>
                <div className="flex justify-between items-center" style={{ marginBottom: blocksForDay.length > 0 ? 10 : 0 }}>
                  <div className="flex items-center gap-8">
                    <h3 style={{ fontSize: 15, color: dayColor }}>{day}</h3>
                    {isToday && <span style={{ fontSize: 11, background: dayColor + '20', color: dayColor, padding: '1px 8px', borderRadius: 20, fontWeight: 700 }}>TODAY</span>}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {blocksForDay.length > 0 ? `${blocksForDay.length} territory${blocksForDay.length > 1 ? 's' : ''}` : 'No territories'}
                  </span>
                </div>

                {blocksForDay.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {blocksForDay.map(block => {
                      const info = ALL_BLOCKS[block]
                      const color = REGION_COLORS[info?.region] || '#6b7280'
                      const count = customers.filter(c => c.area === block).length
                      return (
                        <div key={block} style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: color + '15', border: `1px solid ${color}40`,
                          borderRadius: 8, padding: '5px 10px'
                        }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color }}>{block}</span>
                          {count > 0 && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>({count})</span>}
                          <button
                            onClick={() => assignDay(block, null)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}
                          >×</button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {blocksForDay.length > 0 && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      const areaFilter = blocksForDay.join(',')
                      navigate(`/customers?areas=${encodeURIComponent(areaFilter)}`)
                    }}
                    style={{ marginTop: 8, fontSize: 12 }}
                  >
                    👥 View customers · 🧭 Plan route for {day}
                  </button>
                )}
              </div>
            )
          })}

          {/* Unscheduled blocks with customers */}
          {(() => {
            const unscheduled = Object.keys(ALL_BLOCKS).filter(b =>
              !schedule[b] && customers.filter(c => c.area === b).length > 0
            )
            if (!unscheduled.length) return null
            return (
              <div className="card" style={{ marginTop: 8, borderLeft: '4px solid var(--border)' }}>
                <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 8 }}>📌 Imported but unscheduled</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {unscheduled.map(block => {
                    const color = REGION_COLORS[ALL_BLOCKS[block]?.region] || '#6b7280'
                    return (
                      <span key={block} style={{
                        fontSize: 12, background: color + '15', color, border: `1px solid ${color}40`,
                        borderRadius: 8, padding: '3px 10px', fontWeight: 500
                      }}>{block}</span>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Confirm remove modal */}
      {confirmRemove && (
        <div className="modal-overlay" onClick={() => setConfirmRemove(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <h2 style={{ marginBottom: 8 }}>Remove {confirmRemove}?</h2>
            <p className="text-muted" style={{ marginBottom: 20 }}>
              This will delete all {customers.filter(c => c.area === confirmRemove).length} customers in this block from your database. You can re-import them anytime.
            </p>
            <button className="btn btn-danger btn-full" onClick={() => handleRemoveBlock(confirmRemove)}>
              🗑️ Yes, remove all
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => setConfirmRemove(null)} style={{ marginTop: 10 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
