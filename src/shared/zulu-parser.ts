export interface ZuluPage {
  title: string
  content: string
}

function extractText(tagInner: string): string {
  const cdataMatch = /<!\[CDATA\[([\s\S]*?)\]\]>/i.exec(tagInner)
  if (cdataMatch) return cdataMatch[1].trim()
  return tagInner.trim()
}

function parsePageFromXml(inner: string): ZuluPage | null {
  const nameMatch = /<name>([\s\S]*?)<\/name>/i.exec(inner)
  const contentMatch = /<content>([\s\S]*?)<\/content>/i.exec(inner)
  if (!nameMatch) return null
  const title = extractText(nameMatch[1])
  const content = contentMatch ? extractText(contentMatch[1]) : ''
  if (!title) return null
  return { title, content }
}

export function parseZuluContent(xml: string): ZuluPage[] {
  const pages: ZuluPage[] = []

  const indexRegex = /<index>([\s\S]*?)<\/index>/i
  const indexMatch = indexRegex.exec(xml)
  if (indexMatch) {
    const page = parsePageFromXml(indexMatch[1])
    if (page) pages.push(page)
  }

  const pageRegex = /<page>([\s\S]*?)<\/page>/gi
  let pageMatch: RegExpExecArray | null
  while ((pageMatch = pageRegex.exec(xml)) !== null) {
    const page = parsePageFromXml(pageMatch[1])
    if (page) pages.push(page)
  }

  return pages
}
