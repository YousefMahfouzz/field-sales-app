import { useState, useRef, useCallback, useEffect } from 'react'

// Crop a File/Blob to a 1:1 square, returning a compressed Blob
async function cropToSquare(file) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const size = Math.min(img.width, img.height)
      const canvas = document.createElement('canvas')
      const TARGET = 800
      canvas.width = TARGET
      canvas.height = TARGET
      const ctx = canvas.getContext('2d')
      ctx.drawImage(
        img,
        (img.width - size) / 2, (img.height - size) / 2,
        size, size,
        0, 0, TARGET, TARGET
      )
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => resolve(blob), 'image/webp', 0.82)
    }
    img.src = url
  })
}

// Single image slot with crop preview
function ImageSlot({ src, onRemove, onReplace, label, primary }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(async (files) => {
    const file = files[0]
    if (!file || !file.type.startsWith('image/')) return
    const cropped = await cropToSquare(file)
    const preview = URL.createObjectURL(cropped)
    onReplace({ file: cropped, preview })
  }, [onReplace])

  const onDrop = useCallback(async (e) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(Array.from(e.dataTransfer.files))
  }, [handleFiles])

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        style={{
          width: primary ? 120 : 80, height: primary ? 120 : 80,
          borderRadius: 12,
          border: dragging ? '2.5px solid var(--blue)' : src ? '2px solid var(--border)' : '2.5px dashed var(--border)',
          background: dragging ? 'var(--blue-light)' : src ? 'transparent' : 'var(--gray-light)',
          cursor: 'pointer', overflow: 'hidden', position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
          boxShadow: primary && src ? '0 2px 12px rgba(0,0,0,0.12)' : 'none',
        }}
      >
        {src
          ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: primary ? 32 : 22 }}>📷</div>
              <div style={{ fontSize: 10, marginTop: 2 }}>{label || 'Add'}</div>
            </div>
          )
        }
        {/* Edit overlay on hover */}
        {src && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: 0, transition: 'opacity 0.15s',
            fontSize: 18,
          }}
            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
            onMouseLeave={e => e.currentTarget.style.opacity = '0'}
          >✏️</div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => handleFiles(Array.from(e.target.files))} />
      {src && (
        <button type="button" onClick={e => { e.stopPropagation(); onRemove() }}
          style={{
            position: 'absolute', top: -6, right: -6, width: 20, height: 20,
            borderRadius: '50%', background: '#dc2626', color: 'white',
            border: '2px solid white', cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2, fontWeight: 900, lineHeight: 1,
          }}>×</button>
      )}
    </div>
  )
}

// Add slot — click to pick multiple or drag
function AddSlot({ onAdd }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(async (files) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    const results = await Promise.all(images.map(async f => {
      const cropped = await cropToSquare(f)
      return { file: cropped, preview: URL.createObjectURL(cropped) }
    }))
    onAdd(results)
  }, [onAdd])

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)) }}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      style={{
        width: 80, height: 80, borderRadius: 12, cursor: 'pointer',
        border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border)'}`,
        background: dragging ? 'var(--blue-light)' : 'var(--gray-light)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', fontSize: 28, transition: 'all 0.15s', flexShrink: 0,
      }}
    >
      <span>+</span>
      <span style={{ fontSize: 9, marginTop: 2 }}>Add photos</span>
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => handleFiles(Array.from(e.target.files))} />
    </div>
  )
}

/**
 * Advanced image editor
 * Props:
 *   primaryPreview    - existing main image URL
 *   existingExtras    - array of extra image URLs already saved
 *   onChange({ primaryFile, primaryPreview, extraFiles, existingImages })
 */
export default function ImageEditor({ primaryPreview, existingExtras = [], onChange }) {
  const [primary, setPrimary] = useState({ src: primaryPreview || null, file: null })
  const [extras, setExtras] = useState(
    existingExtras.map(url => ({ src: url, file: null, existing: true }))
  )

  // Sync when parent loads existing data
  useEffect(() => {
    if (primaryPreview && !primary.src) {
      setPrimary(p => ({ ...p, src: primaryPreview }))
    }
  }, [primaryPreview])

  useEffect(() => {
    if (existingExtras.length && extras.every(e => e.existing)) {
      setExtras(existingExtras.map(url => ({ src: url, file: null, existing: true })))
    }
  }, [existingExtras.join(',')])

  const emit = useCallback((p, ex) => {
    onChange({
      primaryFile: p.file || null,
      primaryPreview: p.src || null,
      extraFiles: ex.filter(e => e.file).map(e => e.file),
      existingImages: ex.filter(e => e.existing && !e.removed).map(e => e.src),
    })
  }, [onChange])

  const updatePrimary = useCallback((data) => {
    const next = { src: data.preview, file: data.file }
    setPrimary(next)
    emit(next, extras)
  }, [extras, emit])

  const removePrimary = useCallback(() => {
    const next = { src: null, file: null }
    setPrimary(next)
    emit(next, extras)
  }, [extras, emit])

  const replaceExtra = useCallback((i, data) => {
    const next = extras.map((e, j) => j === i ? { src: data.preview, file: data.file, existing: false } : e)
    setExtras(next)
    emit(primary, next)
  }, [extras, primary, emit])

  const removeExtra = useCallback((i) => {
    const next = extras.filter((_, j) => j !== i)
    setExtras(next)
    emit(primary, next)
  }, [extras, primary, emit])

  const addExtras = useCallback((items) => {
    const next = [...extras, ...items.map(i => ({ src: i.preview, file: i.file, existing: false }))]
    setExtras(next)
    emit(primary, next)
  }, [extras, primary, emit])

  const total = (primary.src ? 1 : 0) + extras.length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        {/* Primary slot */}
        <ImageSlot
          src={primary.src}
          primary
          label="Main photo"
          onRemove={removePrimary}
          onReplace={updatePrimary}
        />

        {/* Extra slots */}
        {extras.map((e, i) => (
          <ImageSlot
            key={i}
            src={e.src}
            onRemove={() => removeExtra(i)}
            onReplace={(data) => replaceExtra(i, data)}
          />
        ))}

        {/* Add more */}
        <AddSlot onAdd={addExtras} />
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
        All images are auto-cropped to square (1:1). Tap any image to replace it. Drag & drop supported.
        {total > 0 && ` ${total} photo${total !== 1 ? 's' : ''} total.`}
      </p>
    </div>
  )
}
