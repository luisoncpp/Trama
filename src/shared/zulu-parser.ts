export interface ZuluPage {
  title: string
  content: string
}

function extractText(tagInner: string): string {
  const cdataMatch = /<!\[CDATA\[([\s\S]*?)\]\]>/i.exec(tagInner)
  if (cdataMatch) return cdataMatch[1].trim()
  return tagInner.trim()
}

export function parseZuluContent(xml: string): ZuluPage[] {
  const pages: ZuluPage[] = []

  const indexRegex = /<index>([\s\S]*?)<\/index>/i
  const indexMatch = indexRegex.exec(xml)
  if (indexMatch) {
    const inner = indexMatch[1]
    const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(inner)
    const contentMatch = /<content>([\s\S]*?)<\/content>/i.exec(inner)
    if (nameMatch) {
      const title = extractText(nameMatch[1])
      const content = contentMatch ? extractText(contentMatch[1]) : ''
      if (title) pages.push({ title, content })
    }
  }

  const pageRegex = /<page>([\s\S]*?)<\/page>/gi
  let pageMatch: RegExpExecArray | null
  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    const inner = pageMatch[1]
    const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(inner)
    const contentMatch = /<content>([\s\S]*?)<\/content>/i.exec(inner)
    if (nameMatch) {
      const title = extractText(nameMatch[1])
      const content = contentMatch ? extractText(contentMatch[1]) : ''
      if (title) pages.push({ title, content })
    }
  }

  return pages
}
