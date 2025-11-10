const triggerDownload = (url, filename) => {
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export const triggerDownloadFromBlob = (blob, filename) => {
  if (!blob) return
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  // Allow the browser to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 30)
}

export const triggerDownloadFromDataUrl = (dataUrl, filename) => {
  if (!dataUrl) return
  triggerDownload(dataUrl, filename)
}

export const downloadCanvasAsPNG = async (canvas, filename, { preferBlob = false } = {}) => {
  if (!canvas) return
  const supportsBlob = preferBlob && typeof canvas.toBlob === 'function'

  if (supportsBlob) {
    try {
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob(blobResult => {
          if (blobResult) {
            resolve(blobResult)
          } else {
            reject(new Error('Canvas export failed'))
          }
        }, 'image/png')
      })
      triggerDownloadFromBlob(blob, filename)
      return
    } catch {
      // fall through to data URL fallback
    }
  }

  try {
    const url = canvas.toDataURL('image/png')
    triggerDownloadFromDataUrl(url, filename)
  } catch (_) {
    // Last resort: create a blob from data URL if possible
    if (typeof fetch === 'function') {
      try {
        const response = await fetch(canvas.toDataURL('image/png'))
        const blob = await response.blob()
        triggerDownloadFromBlob(blob, filename)
      } catch {}
    }
  }
}
