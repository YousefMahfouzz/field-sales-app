import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, profile, signOut, updateProfile } = useAuth()
  const [form, setForm] = useState({
    display_name: profile?.display_name || '',
    username: profile?.username || '',
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [wideMode, setWideMode] = useState(() => localStorage.getItem('wideMode') === 'true')

  // Apply wide mode to root element
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    if (wideMode) {
      root.style.maxWidth = '100%'
      localStorage.setItem('wideMode', 'true')
    } else {
      root.style.maxWidth = ''
      localStorage.setItem('wideMode', 'false')
    }
  }, [wideMode])

  // Apply on mount from saved preference
  useEffect(() => {
    const saved = localStorage.getItem('wideMode') === 'true'
    const root = document.getElementById('root')
    if (root && saved) root.style.maxWidth = '100%'
  }, [])

  const handleNameChange = e => {
    const name = e.target.value
    setSaved(false)
    const currentAutoUsername = form.display_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
    const usernameWasAuto = form.username === currentAutoUsername || form.username === ''
    if (usernameWasAuto) {
      setForm(p => ({ ...p, display_name: name, username: name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) }))
    } else {
      setForm(p => ({ ...p, display_name: name }))
    }
  }

  const handleUsernameChange = e => {
    setSaved(false)
    setForm(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) }))
  }

  const handleSave = async e => {
    e.preventDefault()
    if (!form.display_name.trim()) { setError('Name is required'); return }
    if (!form.username.trim()) { setError('Username is required'); return }
    if (!/^[a-z0-9]+$/.test(form.username)) { setError('Username: lowercase letters and numbers only'); return }
    setLoading(true); setError('')
    try {
      await updateProfile({ display_name: form.display_name.trim(), username: form.username.trim() })
      setSaved(true)
    } catch (err) {
      setError(err.message.includes('unique') ? 'That username is already taken' : err.message)
    } finally { setLoading(false) }
  }

  const priceListUrl = form.username
    ? `${window.location.origin}/u/${form.username}/pricelist`
    : null

  const Toggle = ({ value, onChange, label, sub }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0', borderBottom:'1px solid var(--border)' }}>
      <div>
        <p style={{ fontWeight:600, fontSize:15 }}>{label}</p>
        {sub && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{sub}</p>}
      </div>
      <button onClick={() => onChange(!value)} style={{
        width:50, height:28, borderRadius:14, border:'none', cursor:'pointer',
        background: value ? 'var(--blue)' : '#d1d5db',
        position:'relative', transition:'background 0.2s', flexShrink:0,
      }}>
        <span style={{
          position:'absolute', top:3, left: value ? 24 : 3,
          width:22, height:22, borderRadius:'50%', background:'white',
          transition:'left 0.2s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
          display:'block',
        }} />
      </button>
    </div>
  )

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1>{'Settings'}</h1>
        <div style={{ width:36 }} />
      </div>

      <div className="page" style={{ paddingTop:16 }}>

        {/* Profile card */}
        <div className="card" style={{ marginBottom:20, background:'var(--blue-light)', border:'1px solid #bfdbfe' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', flexShrink:0, background:'linear-gradient(135deg, var(--blue), #7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:700, color:'white' }}>
              {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight:700, fontSize:15 }}>{profile?.display_name || 'No name set'}</p>
              <p className="text-xs text-muted">{user?.email}</p>
              {profile?.username && <p className="text-xs" style={{ color:'var(--blue)' }}>@{profile.username}</p>}
            </div>
          </div>
        </div>

        <p className="section-header">{'Your Profile'}</p>
        {error && <div style={{ background:'var(--red-light)', color:'var(--red)', padding:'12px 16px', borderRadius:8, marginBottom:16, fontSize:14 }}>{error}</div>}
        {saved && <div style={{ background:'var(--green-light)', color:'var(--green)', padding:'12px 16px', borderRadius:8, marginBottom:16, fontSize:14 }}>✅ Saved!</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input className="form-input" value={form.display_name} onChange={handleNameChange} placeholder={'Your full name'} />
            <p className="text-xs text-muted" style={{ marginTop:4 }}>{'Shown on your price list'}</p>
          </div>
          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ display:'flex', alignItems:'center' }}>
              <span style={{ padding:'10px 12px', background:'var(--gray-light)', borderRadius:'8px 0 0 8px', border:'1px solid var(--border)', borderRight:'none', fontSize:14, color:'var(--text-muted)' }}>@</span>
              <input className="form-input" value={form.username} onChange={handleUsernameChange} placeholder="yourname" style={{ borderRadius:'0 8px 8px 0' }} />
            </div>
            <p className="text-xs text-muted" style={{ marginTop:4 }}>{'Lowercase letters and numbers only'}</p>
          </div>
          {priceListUrl && (
            <div style={{ background:'#f8fafc', border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px', marginBottom:16 }}>
              <p className="text-xs text-muted" style={{ marginBottom:4 }}>Your price list:</p>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--blue)', wordBreak:'break-all' }}>{priceListUrl}</p>
              <button type="button" onClick={() => { navigator.clipboard.writeText(priceListUrl); alert('Copied!') }}
                style={{ fontSize:12, marginTop:8, background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer', color:'var(--blue)' }}>
                📋 Copy link
              </button>
            </div>
          )}
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? ('Saving...') : ('Save Changes' )}
          </button>
        </form>

        {/* Display */}
        <p className="section-header" style={{ marginTop:24 }}>{'Display'}</p>
        <Toggle
          value={darkMode}
          onChange={toggleDark}
          label={'🌙 Dark Mode'}
          sub={'Switch between light and dark theme'}
        />
        <Toggle
          value={wideMode}
          onChange={setWideMode}
          label={'iPad / Wide Screen Mode'}
          sub={'Expands app to full width — great for tablets'}
        />
        {/* Account */}
        <div style={{ marginTop:24, paddingTop:8 }}>
          <p className="section-header">{'Account'}</p>
          <p className="text-xs text-muted" style={{ marginBottom:12 }}>{user?.email}</p>

          {profile?.is_admin && (<>
            <p style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:8 }}>{'Admin Tools'}</p>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin/settings')} style={{ marginBottom:8, color:'#7c3aed', borderColor:'#7c3aed' }}>
              ⚙️ Invite Codes & Logo
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin/homepage')} style={{ marginBottom:8, color:'#6366f1', borderColor:'#6366f1' }}>
              🌐 Manage Homepage
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin/price-lists')} style={{ marginBottom:8, color:'#2563eb', borderColor:'#2563eb' }}>
              🏷️ Manage Price Lists
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => navigate('/admin/inventory')} style={{ marginBottom:10, color:'#dc2626', borderColor:'#dc2626' }}>
              👑 View User Inventories
            </button>
          </>)}

          <button className="btn btn-ghost btn-full" onClick={() => navigate('/backup')} style={{ marginBottom:10 }}>
            💾 Backup & Restore Data
          </button>
          <button className="btn btn-ghost btn-full" onClick={signOut} style={{ color:'var(--red)', borderColor:'var(--red)' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
