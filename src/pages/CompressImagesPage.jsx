import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { compressImage } from '../lib/imageUtils'

export default function CompressImagesPage() {
  const { user } = useAuth()
  const [log, setLog] = useState([])
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)

  const addLog = (msg, type = 'info') => setLog(p => [...p, { msg, type, t: Date.now() }])

  const run = async () => {
    if (!user) { addLog('Not logged in', 'error'); return }
    setRunning(true); setDone(false); setLog([])
    addLog('Fetching all products...')

    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, image_url, images')
      .eq('user_id', user.id)
      .eq('is_active', true)

    if (error) { addLog('Failed to fetch: ' + error.message, 'error'); setRunning(false); return }
    addLog(`Found ${products.length} products`)

    let compressed = 0, skipped = 0, failed = 0

    for (const product of products) {
      const urlsToProcess = [
        product.image_url ? { url: product.image_url, type: 'primary' } : null,
        ...(product.images || []).map((url, i) => ({ url, type: `extra_${i}` })),
      ].filter(Boolean)

      if (urlsToProcess.length === 0) { skipped++; continue }

      for (const { url, type } of urlsToProcess) {
        // Skip if already WebP
        if (url.includes('.webp')) { addLog(`⏭ ${product.name} (${type}) already WebP`, 'skip'); skipped++; continue }

        try {
          addLog(`⏳ Compressing ${product.name} (${type})...`)

          // Fetch the image as blob
          const res = await fetch(url)
          if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
          const blob = await res.blob()
          const ext = url.split('.').pop().split('?')[0]
          const origFile = new File([blob], `${product.id}.${ext}`, { type: blob.type })

          // Compress to WebP
          const compressedFile = await compressImage(origFile, 1200, 0.85)
          const origKB = Math.round(origFile.size / 1024)
          const compKB = Math.round(compressedFile.size / 1024)

          // Upload back to same path but .webp
          const path = type === 'primary'
            ? `${user.id}/${product.id}.webp`
            : `${user.id}/${product.id}_extra_${type.split('_')[1]}.webp`

          const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(path, compressedFile, { upsert: true })

          if (uploadError) throw new Error(uploadError.message)

          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(path)

          // Update DB record
          if (type === 'primary') {
            await supabase.from('products').update({ image_url: publicUrl }).eq('id', product.id)
          } else {
            const idx = parseInt(type.split('_')[1])
            const newImages = [...(product.images || [])]
            newImages[idx] = publicUrl
            await supabase.from('products').update({ images: newImages }).eq('id', product.id)
          }

          compressed++
          addLog(`✅ ${product.name} (${type}): ${origKB}KB → ${compKB}KB (${Math.round((1 - compKB/origKB)*100)}% smaller)`, 'success')
        } catch (err) {
          failed++
          addLog(`❌ ${product.name} (${type}): ${err.message}`, 'error')
        }
      }
    }

    addLog(`\nDone! ✅ ${compressed} compressed · ⏭ ${skipped} skipped · ❌ ${failed} failed`, 'summary')
    setRunning(false); setDone(true)
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, marginBottom: 8 }}>🗜️ Compress Existing Images</h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20, fontFamily: 'sans-serif' }}>
        Re-compresses all product images to WebP. Safe to run multiple times — already-WebP images are skipped.
      </p>

      <button
        onClick={run} disabled={running}
        style={{
          padding: '12px 24px', borderRadius: 10, border: 'none', cursor: running ? 'not-allowed' : 'pointer',
          background: running ? '#94a3b8' : '#6366f1', color: 'white', fontWeight: 700, fontSize: 15,
          marginBottom: 20,
        }}
      >
        {running ? '⏳ Running...' : done ? '✅ Run Again' : '▶ Start Compression'}
      </button>

      {log.length > 0 && (
        <div style={{
          background: '#0f172a', color: '#e2e8f0', borderRadius: 12,
          padding: '16px', fontSize: 13, lineHeight: 1.8,
          maxHeight: 500, overflowY: 'auto',
        }}>
          {log.map((entry, i) => (
            <div key={i} style={{
              color: entry.type === 'error' ? '#f87171'
                : entry.type === 'success' ? '#4ade80'
                : entry.type === 'skip' ? '#94a3b8'
                : entry.type === 'summary' ? '#fbbf24'
                : '#e2e8f0'
            }}>
              {entry.msg}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
