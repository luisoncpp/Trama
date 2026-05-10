function convertImageDataUrlToPngDataUrl(dataUrl: string): Promise<string> {
  if (dataUrl.startsWith('data:image/png;')) {
    return Promise.resolve(dataUrl)
  }

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = image.naturalWidth || image.width
        canvas.height = image.naturalHeight || image.height
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Canvas 2D context is unavailable'))
          return
        }

        context.drawImage(image, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (error) {
        reject(error)
      }
    }
    image.onerror = () => reject(new Error('Unable to convert embedded image to PNG'))
    image.src = dataUrl
  })
}

export async function ensureMarkdownEmbeddedImagesArePng(markdown: string): Promise<string> {
  const matches = Array.from(markdown.matchAll(/!\[([^\]]*)\]\((data:image\/[^)\s]+)\)/gi))
  if (matches.length === 0) {
    return markdown
  }

  let output = ''
  let cursor = 0

  for (const match of matches) {
    const fullMatch = match[0] ?? ''
    const alt = match[1] ?? ''
    const source = match[2] ?? ''
    const index = match.index ?? 0

    output += markdown.slice(cursor, index)
    output += `![${alt}](${await convertImageDataUrlToPngDataUrl(source)})`
    cursor = index + fullMatch.length
  }

  output += markdown.slice(cursor)
  return output
}
