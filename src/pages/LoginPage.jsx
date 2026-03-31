import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [form, setForm] = useState({ email: '', password: '', displayName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  // Preview what username will look like
  const previewUsername = form.displayName
    ? form.displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)
    : ''

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signup') {
        if (!form.displayName.trim()) { setError('Please enter your name'); setLoading(false); return }
        await signUp(form.email, form.password, form.displayName.trim())
        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
      } else {
        const { error } = await signIn(form.email, form.password)
        if (error) throw error
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px',
      background: 'linear-gradient(135deg, #eff6ff 0%, #fff 60%)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🗺️</div>
        <h1 style={{ fontSize: 26, marginBottom: 4 }}>Field Sales</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Manage your customer visits</p>
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', background: 'var(--gray-light)', borderRadius: 12, padding: 4, marginBottom: 24, width: '100%', maxWidth: 360 }}>
        {['signin', 'signup'].map(m => (
          <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }} style={{
            flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600,
            background: mode === m ? 'white' : 'transparent',
            color: mode === m ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            transition: 'all 0.15s'
          }}>
            {m === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360 }}>
        {error && <div style={{ background: 'var(--red-light)', color: 'var(--red)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
        {success && <div style={{ background: 'var(--green-light)', color: 'var(--green)', padding: '12px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{success}</div>}

        {/* Display name — only on signup */}
        {mode === 'signup' && (
          <div className="form-group">
            <label className="form-label">Your Name *</label>
            <input
              className="form-input"
              value={form.displayName}
              onChange={set('displayName')}
              placeholder="e.g. Yousef Mahfouz"
              autoComplete="name"
              required
            />
            {previewUsername && (
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5 }}>
                Your price list will be at: <strong style={{ color: 'var(--blue)' }}>/{previewUsername}/pricelist</strong>
              </p>
            )}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email" className="form-input" value={form.email}
            onChange={set('email')} placeholder="you@example.com"
            required autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password" className="form-input" value={form.password}
            onChange={set('password')} placeholder="••••••••"
            required autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-full" disabled={loading} style={{ marginTop: 4 }}>
          {loading ? '...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
