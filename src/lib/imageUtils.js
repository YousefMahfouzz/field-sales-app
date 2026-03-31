/**
 * Compress an image file to WebP, max 1200px wide, 85% quality.
 * Returns a new File object that's typically 60-80% smaller.
 */
export async function compressImage(file, maxWidth = 1200, quality = 0.85) {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxWidth / img.naturalWidth)
      const w = Math.round(img.naturalWidth * scale)
      const h = Math.round(img.naturalHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          // Keep original name but change ext to webp
          const name = file.name.replace(/\.[^.]+$/, '') + '.webp'
          resolve(new File([blob], name, { type: 'image/webp' }))
        },
        'image/webp',
        quality
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
