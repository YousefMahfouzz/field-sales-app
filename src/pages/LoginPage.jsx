import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState('signin')
  const [form, setForm] = useState({ email: '', password: '', displayName: '', inviteCode: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const set = f => e => setForm(p => ({ ...p, [f]: e.target.value }))
  const previewUsername = form.displayName
    ? form.displayName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20) : ''

  const handleSubmit = async e => {
    e.preventDefault()
    setError(''); setSuccess(''); setLoading(true)
    try {
      if (mode === 'signup') {
        if (!form.displayName.trim()) { setError('Please enter your name'); setLoading(false); return }
        if (!form.inviteCode.trim()) { setError('An invite code is required to create an account'); setLoading(false); return }

        // Validate invite code
        const code = form.inviteCode.trim().toUpperCase()
        const { data: codeRow, error: codeErr } = await supabase
          .from('invite_codes')
          .select('id, is_active, used_by')
          .eq('code', code)
          .single()

        if (codeErr || !codeRow) { setError('Invalid invite code. Contact your Kanz Supply representative.'); setLoading(false); return }
        if (!codeRow.is_active || codeRow.used_by) { setError('This invite code has already been used or is no longer active.'); setLoading(false); return }

        // Create account
        await signUp(form.email, form.password, form.displayName.trim())

        // Mark code as used (best effort)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          await supabase.from('invite_codes').update({ used_by: user.id, used_at: new Date().toISOString(), is_active: false }).eq('id', codeRow.id)
        }

        setSuccess('Account created! Check your email to confirm, then sign in.')
        setMode('signin')
      } else {
        const { error: signInError } = await signIn(form.email, form.password)
        if (signInError) throw signInError
        navigate('/')
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const inputStyle = { width:'100%', padding:'14px 16px', borderRadius:12, border:'1.5px solid rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.06)', color:'white', fontSize:15, outline:'none', transition:'border-color 0.2s' }
  const labelStyle = { display:'block', fontSize:12, fontWeight:700, color:'rgba(255,255,255,0.5)', marginBottom:6, letterSpacing:'0.5px', textTransform:'uppercase' }

  return (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'32px 24px', background:'#0a0a0a' }}>
      <div style={{ textAlign:'center', marginBottom:40 }}>
        <div style={{ width:56, height:56, background:'linear-gradient(135deg,#6366f1,#2563eb)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, margin:'0 auto 14px', boxShadow:'0 8px 24px rgba(99,102,241,0.4)' }}>🛒</div>
        <h1 style={{ fontSize:24, fontWeight:900, color:'white', marginBottom:4, letterSpacing:'-0.5px' }}>Kanz Supply</h1>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</p>
      </div>

      <div style={{ width:'100%', maxWidth:380, background:'rgba(255,255,255,0.04)', borderRadius:20, border:'1px solid rgba(255,255,255,0.08)', padding:'28px 28px 24px' }}>
        <div style={{ display:'flex', background:'rgba(255,255,255,0.06)', borderRadius:10, padding:4, marginBottom:24 }}>
          {[['signin','Sign In'],['signup','Sign Up']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{ flex:1, padding:'8px', borderRadius:7, border:'none', cursor:'pointer', fontSize:14, fontWeight:700, background: mode===m ? 'rgba(255,255,255,0.12)' : 'transparent', color: mode===m ? 'white' : 'rgba(255,255,255,0.4)', transition:'all 0.2s' }}>{l}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {mode === 'signup' && (
            <>
              <div>
                <label style={labelStyle}>Your Name</label>
                <input style={inputStyle} type="text" value={form.displayName} onChange={set('displayName')} placeholder="John Smith" required
                  onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} />
                {previewUsername && <p style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:4 }}>Username: @{previewUsername}</p>}
              </div>
              <div>
                <label style={labelStyle}>Invite Code</label>
                <input style={{ ...inputStyle, textTransform:'uppercase', letterSpacing:'2px', fontWeight:700 }}
                  type="text" value={form.inviteCode} onChange={set('inviteCode')} placeholder="XXXX-XXXX" required
                  onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} />
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:4 }}>Get your invite code from your Kanz Supply rep</p>
              </div>
            </>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required
              onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'}
              onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input style={inputStyle} type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required
              onFocus={e => e.target.style.borderColor='rgba(99,102,241,0.6)'}
              onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.12)'} />
          </div>

          {error && <div style={{ background:'rgba(220,38,38,0.15)', border:'1px solid rgba(220,38,38,0.3)', borderRadius:10, padding:'10px 14px', color:'#fca5a5', fontSize:13 }}>{error}</div>}
          {success && <div style={{ background:'rgba(22,163,74,0.15)', border:'1px solid rgba(22,163,74,0.3)', borderRadius:10, padding:'10px 14px', color:'#86efac', fontSize:13 }}>{success}</div>}

          <button type="submit" disabled={loading} style={{ padding:'14px', borderRadius:12, border:'none', cursor: loading ? 'not-allowed' : 'pointer', background: loading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg,#6366f1,#2563eb)', color:'white', fontWeight:800, fontSize:15, marginTop:4, boxShadow: loading ? 'none' : '0 6px 20px rgba(99,102,241,0.35)' }}>
            {loading ? '⏳ Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In →'}
          </button>
        </form>

        <p style={{ textAlign:'center', marginTop:20, fontSize:13, color:'rgba(255,255,255,0.3)' }}>
          {mode === 'signup' ? 'Already have an account? ' : 'Need access? '} 
          <button onClick={() => setMode(mode==='signin'?'signup':'signin')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontSize:13, textDecoration:'underline' }}>
            {mode === 'signup' ? 'Sign in' : 'Contact your rep'}
          </button>
        </p>
      </div>

      <button onClick={() => navigate('/')} style={{ marginTop:20, background:'none', border:'none', color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:13 }}>
        ← Back to homepage
      </button>
    </div>
  )
}
