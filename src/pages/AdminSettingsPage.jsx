import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { compressImage } from '../lib/imageUtils'

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const part = () => Array.from({length:4}, () => chars[Math.floor(Math.random()*chars.length)]).join('')
  return `${part()}-${part()}`
}

export default function AdminSettingsPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const isAdmin = profile?.is_admin === true
  const [codes, setCodes] = useState([])
  const [loadingCodes, setLoadingCodes] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [codeNote, setCodeNote] = useState('')
  const [toast, setToast] = useState('')
  const [logo, setLogo] = useState(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [logoPreview, setLogoPreview] = useState(null)
  const fileRef = useRef()

  const showToast = msg => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    if (profile && !isAdmin) navigate('/')
  }, [profile, isAdmin, navigate])

  const loadData = useCallback(async () => {
    const [codesRes, logoRes] = await Promise.all([
      supabase.from('invite_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('app_settings').select('value').eq('key', 'logo_url').single()
    ])
    setCodes(codesRes.data || [])
    if (logoRes.data?.value) setLogoPreview(logoRes.data.value)
    setLoadingCodes(false)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const code = generateCode()
      const { error } = await supabase.from('invite_codes').insert([{
        code, note: codeNote.trim() || null, is_active: true,
        created_by: (await supabase.auth.getUser()).data.user?.id
      }])
      if (error) throw error
      setCodeNote('')
      showToast(`✅ Code generated: ${code}`)
      await loadData()
    } catch(e) { showToast('❌ ' + e.message) }
    finally { setGenerating(false) }
  }

  const handleDeactivate = async (id) => {
    await supabase.from('invite_codes').update({ is_active: false }).eq('id', id)
    showToast('🚫 Code deactivated')
    await loadData()
  }

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code)
    showToast(`📋 Copied: ${code}`)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      // Compress then upload to Supabase storage
      const compressed = await compressImage(file, 800, 0.9)
      const ext = file.name.split('.').pop()
      const path = `logos/kanz-logo-${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('product-images').upload(path, compressed, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(path)
      // Save to app_settings
      await supabase.from('app_settings').upsert({ key: 'logo_url', value: publicUrl, updated_at: new Date().toISOString() })
      setLogoPreview(publicUrl)
      showToast('✅ Logo updated!')
    } catch(e) { showToast('❌ ' + e.message) }
    finally { setUploadingLogo(false) }
  }

  const handleRemoveLogo = async () => {
    await supabase.from('app_settings').delete().eq('key', 'logo_url')
    setLogoPreview(null)
    showToast('🗑️ Logo removed')
  }

  if (!isAdmin) return null

  return (
    <div>
      <div className="page-header">
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer' }}>←</button>
        <h1>Admin Settings</h1>
        <div style={{ width:36 }} />
      </div>

      <div className="page" style={{ paddingTop:16 }}>

        {/* Logo upload */}
        <div className="card" style={{ marginBottom:20, padding:'18px 18px' }}>
          <p style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>🖼️ Homepage Logo</p>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Upload your company logo — shown in the top-left corner of the website. Any shape or size, free-form (no cropping).</p>

          {logoPreview && (
            <div style={{ marginBottom:16, background:'#0a0a0a', borderRadius:12, padding:16, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <img src={logoPreview} alt="Logo" style={{ maxHeight:60, maxWidth:200, objectFit:'contain' }} />
              <button onClick={handleRemoveLogo} style={{ padding:'6px 14px', borderRadius:20, border:'1px solid var(--border)', background:'white', color:'var(--red)', fontSize:12, fontWeight:700, cursor:'pointer', flexShrink:0 }}>Remove</button>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display:'none' }} />
          <button onClick={() => fileRef.current.click()} disabled={uploadingLogo}
            className="btn btn-primary btn-full" style={{ fontSize:14 }}>
            {uploadingLogo ? '⏳ Uploading...' : logoPreview ? '🔄 Replace Logo' : '📤 Upload Logo'}
          </button>
          <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8, textAlign:'center' }}>PNG, JPG, SVG — displayed as-is at full width, no cropping</p>
        </div>

        {/* Invite codes */}
        <div className="card" style={{ marginBottom:20, padding:'18px 18px' }}>
          <p style={{ fontWeight:800, fontSize:16, marginBottom:4 }}>🔑 Invite Codes</p>
          <p style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>Generate single-use codes. Give a code to a store owner so they can create an account. Each code works once.</p>

          <div style={{ display:'flex', gap:10, marginBottom:12 }}>
            <input value={codeNote} onChange={e => setCodeNote(e.target.value)} placeholder="Note (e.g. John's Beauty Supply)"
              style={{ flex:1, padding:'10px 14px', border:'1.5px solid var(--border)', borderRadius:10, fontSize:14 }} />
            <button onClick={handleGenerate} disabled={generating} className="btn btn-primary" style={{ flexShrink:0 }}>
              {generating ? '...' : '+ Generate'}
            </button>
          </div>

          {loadingCodes && <p className="text-muted text-sm" style={{ textAlign:'center', padding:16 }}>Loading...</p>}

          {codes.map(c => (
            <div key={c.id} style={{ padding:'12px 14px', borderRadius:10, marginBottom:8, background: c.used_by ? '#f9fafb' : c.is_active ? '#f0fdf4' : '#fef2f2', border:`1px solid ${c.used_by ? '#e5e7eb' : c.is_active ? '#bbf7d0' : '#fecaca'}`, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontFamily:'monospace', fontWeight:800, fontSize:16, letterSpacing:'1px', color: c.used_by ? '#9ca3af' : c.is_active ? '#16a34a' : '#dc2626' }}>{c.code}</span>
                  <span style={{ fontSize:11, padding:'2px 8px', borderRadius:10, fontWeight:700, background: c.used_by ? '#e5e7eb' : c.is_active ? '#dcfce7' : '#fee2e2', color: c.used_by ? '#6b7280' : c.is_active ? '#15803d' : '#b91c1c' }}>
                    {c.used_by ? '✓ Used' : c.is_active ? '● Active' : '✕ Disabled'}
                  </span>
                </div>
                {c.note && <p style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>{c.note}</p>}
                <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{new Date(c.created_at).toLocaleDateString()}{c.used_at ? ` · Used ${new Date(c.used_at).toLocaleDateString()}` : ''}</p>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {!c.used_by && c.is_active && <>
                  <button onClick={() => handleCopy(c.code)} style={{ padding:'6px 12px', borderRadius:16, border:'1px solid var(--border)', background:'white', fontSize:12, fontWeight:700, cursor:'pointer' }}>📋</button>
                  <button onClick={() => handleDeactivate(c.id)} style={{ padding:'6px 12px', borderRadius:16, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontSize:12, fontWeight:700, cursor:'pointer' }}>✕</button>
                </>}
              </div>
            </div>
          ))}

          {!loadingCodes && codes.length === 0 && (
            <p className="text-muted text-sm" style={{ textAlign:'center', padding:16 }}>No codes generated yet</p>
          )}
        </div>

      </div>

      {toast && (
        <div style={{ position:'fixed', bottom:90, left:'50%', transform:'translateX(-50%)', background:'#1f2937', color:'white', padding:'10px 20px', borderRadius:24, fontSize:14, zIndex:1000, whiteSpace:'nowrap' }}>
          {toast}
        </div>
      )}
    </div>
  )
}
