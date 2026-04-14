import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabase'
import { reverseGeocodeArea } from '../lib/geo'
import { showToast } from '../components/Toast'

function Toggle({ label, sub, value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--border)', cursor:'pointer' }}>
      <div>
        <p style={{ fontWeight:600, fontSize:14 }}>{label}</p>
        {sub && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{sub}</p>}
      </div>
      <div style={{ width:44, height:26, borderRadius:13, background: value ? 'var(--blue)' : '#d1d5db', position:'relative', flexShrink:0, transition:'background 0.2s' }}>
        <div style={{ position:'absolute', top:3, left: value ? 21 : 3, width:20, height:20, borderRadius:'50%', background:'white', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s' }} />
      </div>
    </div>
  )
}

// Smart area detection from address
function detectArea(address) {
  if (!address) return ''
  const addr = address.toLowerCase()
  const areas = [
    { match: ['east new orleans', 'new orleans east', 'chef menteur', 'read blvd', 'bullard', 'lake forest'], area: 'East New Orleans' },
    { match: ['metairie', 'veterans memorial', 'causeway blvd', 'severn ave'], area: 'Metairie' },
    { match: ['kenner', 'williams blvd'], area: 'Kenner' },
    { match: ['harvey', 'lapalco', 'manhattan blvd'], area: 'Westbank' },
    { match: ['gretna', 'belle chasse', 'terrytown', 'marrero', 'westwego'], area: 'Westbank' },
    { match: ['chalmette', 'arabi', 'meraux', 'violet'], area: 'Chalmette' },
    { match: ['slidell', 'pearl river'], area: 'Northshore' },
    { match: ['covington', 'mandeville', 'madisonville', 'abita'], area: 'Northshore' },
    { match: ['hammond', 'ponchatoula', 'amite'], area: 'Northshore' },
    { match: ['laplace', 'reserve', 'gramercy', 'gonzales'], area: 'River Parishes' },
    { match: ['baton rouge'], area: 'Baton Rouge' },
    { match: ['baker', 'zachary', 'denham springs'], area: 'Baton Rouge' },
    { match: ['shreveport', 'bossier'], area: 'Shreveport' },
    { match: ['monroe', 'west monroe'], area: 'Monroe' },
    { match: ['lafayette', 'broussard', 'scott'], area: 'Lafayette' },
    { match: ['lake charles', 'sulphur'], area: 'Lake Charles' },
    { match: ['houma', 'thibodaux'], area: 'Houma' },
    { match: ['mid-city', 'mid city', 'tulane', 'carrollton'], area: 'Mid-City' },
    { match: ['uptown', 'magazine st', 'prytania'], area: 'Uptown' },
    { match: ['french quarter', 'bourbon', 'royal st', 'decatur'], area: 'French Quarter' },
    { match: ['gentilly', 'elysian fields'], area: 'Gentilly' },
    { match: ['algiers'], area: 'Algiers' },
    { match: ['new orleans', 'nola'], area: 'New Orleans' },
    { match: ['biloxi', 'gulfport', 'ocean springs', 'pascagoula', 'moss point'], area: 'MS Gulf Coast' },
    { match: ['hattiesburg'], area: 'Hattiesburg MS' },
    { match: ['jackson, ms', 'jackson,ms'], area: 'Jackson MS' },
    { match: ['mobile, al', 'mobile,al', 'prichard', 'saraland'], area: 'Mobile AL' },
    { match: ['cleveland', 'east cleveland'], area: 'Cleveland' },
    { match: ['akron'], area: 'Akron' },
    { match: ['euclid'], area: 'Euclid' },
    { match: ['parma'], area: 'Parma' },
    { match: ['lorain'], area: 'Lorain' },
    { match: ['canton'], area: 'Canton' },
    { match: ['maple heights'], area: 'Maple Heights' },
    { match: ['warrensville'], area: 'Warrensville' },
  ]
  for (const { match, area } of areas) {
    if (match.some(m => addr.includes(m))) return area
  }
  return ''
}

function FixAreasButton({ userId }) {
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState('')

  const handleFix = async () => {
    setRunning(true)
    setProgress('Loading customers...')
    try {
      // Get all customers with no area or empty area
      const { data: customers } = await supabase
        .from('customers')
        .select('id,business_name,address,lat,lng,area')
        .eq('user_id', userId)
        .is('deleted_at', null)
      
      const noArea = (customers || []).filter(c => !c.area || !c.area.trim())
      if (noArea.length === 0) {
        showToast('All customers already have areas!', 'success')
        setRunning(false)
        setProgress('')
        return
      }

      setProgress(`Found ${noArea.length} without area, fixing...`)
      let fixed = 0

      for (const c of noArea) {
        // Try smart detection from address first
        let area = detectArea(c.address)

        // If no match and has GPS, reverse geocode
        if (!area && c.lat && c.lng) {
          const geocoded = await reverseGeocodeArea(c.lat, c.lng)
          area = detectArea(geocoded) || geocoded || ''
        }

        if (area) {
          await supabase.from('customers').update({ area }).eq('id', c.id)
          fixed++
          setProgress(`Fixed ${fixed}/${noArea.length}: ${c.business_name || 'customer'} → ${area}`)
        } else {
          setProgress(`Skipped ${c.business_name || 'customer'} (no GPS/address)`)
        }

        // Small delay to not hammer the geocoder
        await new Promise(r => setTimeout(r, 300))
      }

      showToast(`✅ Fixed ${fixed} of ${noArea.length} customers`)
      setProgress(`Done – ${fixed} updated`)
    } catch (e) {
      showToast('Error: ' + e.message, 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{ marginBottom: 10 }}>
      <button
        className="btn btn-ghost btn-full"
        onClick={handleFix}
        disabled={running}
        style={{ color: '#d97706', borderColor: '#d97706' }}
      >
        {running ? '⏳ Fixing areas...' : '📍 Fix Missing Areas'}
      </button>
      {progress && (
        <p className="text-xs text-muted" style={{ marginTop: 6, textAlign: 'center' }}>{progress}</p>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { user, profile, signOut, updateProfile, isOwner, isDriver, effectiveUserId } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ display_name: '', username: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [wideMode, setWideMode] = useState(() => localStorage.getItem('wideMode') === 'true')

  useEffect(() => {
    if (profile) setForm({ display_name: profile.display_name || '', username: profile.username || '' })
  }, [profile])

  useEffect(() => {
    if (wideMode) {
      document.getElementById('root').style.maxWidth = '100%'
      localStorage.setItem('wideMode', 'true')
    } else {
      document.getElementById('root').style.maxWidth = ''
      localStorage.setItem('wideMode', 'false')
    }
  }, [wideMode])

  // Re-sync form if profile loads after mount
  useEffect(() => {
    const saved = localStorage.getItem('wideMode') === 'true'
    setWideMode(saved)
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.display_name.trim()) { setError('Display name is required'); return }
    setLoading(true); setError('')
    try {
      await updateProfile({ display_name: form.display_name.trim(), username: form.username.trim().toLowerCase() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {/* Profile card */}
        <div className="card" style={{ marginBottom:20, background:'var(--blue-light)', border:'1px solid #bfdbfe' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg,var(--blue),#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'white' }}>
              {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight:700, fontSize:15 }}>{profile?.display_name || 'No name set'}</p>
              <p className="text-xs text-muted">{user?.email}</p>
              {profile?.username && <p className="text-xs" style={{ color:'var(--blue)' }}>@{profile.username}</p>}
            </div>
          </div>
        </div>

        {/* Profile form */}
        <p className="section-header">Your Profile</p>
        {error && <div style={{ background:'var(--red-light)', color:'var(--red)', padding:'12px 16px', borderRadius:8, marginBottom:16, fontSize:14 }}>{error}</div>}
        {saved && <div style={{ background:'var(--green-light)', color:'var(--green)', padding:'12px 16px', borderRadius:8, marginBottom:16, fontSize:14 }}>✅ Saved!</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" value={form.display_name} onChange={e => setForm(f => ({ ...f, display_name: e.target.value }))} placeholder="Your full name" />
            <p className="text-xs text-muted" style={{ marginTop:4 }}>Shown on your price list</p>
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase() }))} placeholder="yourname" />
            <p className="text-xs text-muted" style={{ marginTop:4 }}>Lowercase letters and numbers only</p>
            {profile?.username && (
              <div style={{ marginTop:8, padding:'10px 14px', background:'var(--gray-light)', borderRadius:8 }}>
                <p className="text-xs text-muted">Your price list link:</p>
                <p className="text-xs" style={{ color:'var(--blue)', marginTop:2, wordBreak:'break-all' }}>
                  {window.location.origin}/u/{profile.username}/pricelist
                </p>
                <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}/pricelist`)}
                  style={{ fontSize:12, marginTop:8, background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer', color:'var(--blue)' }}>
                  📋 Copy link
                </button>
              </div>
            )}
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {/* Display */}
        <p className="section-header" style={{ marginTop:24 }}>Display</p>
        <Toggle
          value={wideMode}
          onChange={setWideMode}
          label="iPad / Wide Screen Mode"
          sub="Expands app to full width — great for tablets"
        />

        {/* Team management – for owners */}
        {isOwner && (
          <div style={{ marginTop: 24, paddingTop: 8 }}>
            <p className="section-header">Team</p>
            <button
              className="btn btn-ghost btn-full"
              onClick={() => navigate('/team')}
              style={{ marginBottom: 10, color: '#7c3aed', borderColor: '#7c3aed', fontWeight: 700 }}
            >
              🚗 Manage Drivers & Codes
            </button>
          </div>
        )}

        {/* Driver info badge */}
        {isDriver && (
          <div className="card" style={{ marginTop: 24, background: '#f0f9ff', border: '1px solid #bae6fd', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🚗</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#0369a1' }}>Driver Account</p>
                <p className="text-xs" style={{ color: '#0c4a6e' }}>
                  You're working under a distributor's team.
                  {profile?.can_see_profit ? ' Cost & profit visibility is enabled.' : ' Cost & profit are hidden from your view.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Account */}
        <div style={{ marginTop:24, paddingTop:8 }}>
          <p className="section-header">Account</p>
          <p className="text-xs text-muted" style={{ marginBottom:12 }}>{user?.email}</p>

          {profile?.is_admin && (<>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>Admin Tools</p>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin/settings')} style={{ marginBottom:8, color:'#7c3aed', borderColor:'#7c3aed' }}>
              Invite Codes & Logo
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin/homepage')} style={{ marginBottom:8, color:'#6366f1', borderColor:'#6366f1' }}>
              Manage Homepage
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin/price-lists')} style={{ marginBottom:8, color:'#2563eb', borderColor:'#2563eb' }}>
              Manage Price Lists
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin/inventory')} style={{ marginBottom:10, color:'#dc2626', borderColor:'#dc2626' }}>
              View User Inventories
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/copy-sales')} style={{ marginBottom:10, color:'#059669', borderColor:'#059669' }}>
              📋 Copy Sales Between Accounts
            </button>
          </>)}

          <button className="btn btn-ghost btn-full" onClick={() => navigate('/backup')} style={{ marginBottom:10 }}>
            Backup & Restore
          </button>

          {/* Fix missing areas tool */}
          <FixAreasButton userId={effectiveUserId} />

          <button className="btn btn-ghost btn-full" onClick={signOut} style={{ color:'var(--red)', borderColor:'var(--red)' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
