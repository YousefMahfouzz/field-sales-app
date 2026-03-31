import { useState } from 'react'
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

  const set = f => e => {
    setSaved(false)
    setForm(p => ({ ...p, [f]: e.target.value }))
  }

  // Auto-generate username from display name as user types
  const handleNameChange = e => {
    // Display name: exactly as typed — capitals allowed
    const name = e.target.value
    setSaved(false)
    // Only auto-update username if it hasn't been manually customized yet
    const currentAutoUsername = form.display_name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
    const usernameWasAuto = form.username === currentAutoUsername || form.username === ''
    if (usernameWasAuto) {
      const autoUsername = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
      setForm(p => ({ ...p, display_name: name, username: autoUsername }))
    } else {
      setForm(p => ({ ...p, display_name: name }))
    }
  }

  const handleUsernameChange = e => {
    // Username: always force lowercase, no spaces, no special chars
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
    setSaved(false)
    setForm(p => ({ ...p, username: val }))
  }

  const handleSave = async e => {
    e.preventDefault()
    if (!form.display_name.trim()) { setError('Name is required'); return }
    if (!form.username.trim()) { setError('Username is required'); return }
    if (!/^[a-z0-9]+$/.test(form.username)) { setError('Username can only contain lowercase letters and numbers'); return }
    setLoading(true); setError('')
    try {
      await updateProfile({ display_name: form.display_name.trim(), username: form.username.trim() })
      setSaved(true)
    } catch (err) {
      setError(err.message.includes('unique') ? 'That username is already taken — try another' : err.message)
    } finally { setLoading(false) }
  }

  const priceListUrl = form.username
    ? `${window.location.origin}/u/${form.username}/pricelist`
    : null

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer' }}>←</button>
        <h1>Settings</h1>
        <div style={{ width: 36 }} />
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {/* Profile card */}
        <div className="card" style={{ marginBottom: 20, background: 'var(--blue-light)', border: '1px solid #bfdbfe' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, var(--blue), #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: 'white'
            }}>
              {(profile?.display_name || user?.email || '?')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 15 }}>{profile?.display_name || 'No name set'}</p>
              <p className="text-xs text-muted">{user?.email}</p>
              {profile?.username && <p className="text-xs" style={{ color: 'var(--blue)' }}>@{profile.username}</p>}
            </div>
          </div>
        </div>

        <p className="section-header">Your Profile</p>

        {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        {saved && <div style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>✅ Saved!</div>}

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Display Name</label>
            <input
              className="form-input"
              value={form.display_name}
              onChange={handleNameChange}
              placeholder="Your full name"
            />
            <p className="text-xs text-muted" style={{ marginTop: 4 }}>This is what customers see on your price list</p>
          </div>

          <div className="form-group">
            <label className="form-label">Username</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{ padding: '10px 12px', background: 'var(--gray-light)', borderRadius: '8px 0 0 8px', border: '1px solid var(--border)', borderRight: 'none', fontSize: 14, color: 'var(--text-muted)' }}>@</span>
              <input
                className="form-input"
                value={form.username}
                onChange={handleUsernameChange}
                placeholder="yourname"
                style={{ borderRadius: '0 8px 8px 0' }}
              />
            </div>
            <p className="text-xs text-muted" style={{ marginTop: 4 }}>Lowercase letters and numbers only</p>
          </div>

          {/* Price list URL preview */}
          {priceListUrl && (
            <div style={{ background: '#f8fafc', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
              <p className="text-xs text-muted" style={{ marginBottom: 4 }}>Your price list URL:</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', wordBreak: 'break-all' }}>{priceListUrl}</p>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(priceListUrl); alert('Copied!') }}
                style={{ fontSize: 12, marginTop: 8, background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', color: 'var(--blue)' }}
              >
                📋 Copy link
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <p className="section-header">Account</p>
          <p className="text-xs text-muted" style={{ marginBottom: 12 }}>{user?.email}</p>

          <button
            className="btn btn-ghost btn-full"
            onClick={() => navigate('/backup')}
            style={{ marginBottom: 10 }}
          >
            💾 Backup & Restore Data
          </button>

          <button
            className="btn btn-ghost btn-full"
            onClick={signOut}
            style={{ color: 'var(--red)', borderColor: 'var(--red)' }}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
