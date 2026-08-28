// @Architecture(descriptionShort="Private implementation detail for parent module")
export function folderKeyFromDocumentPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  const slash = normalized.lastIndexOf('/')
  return slash === -1 ? '' : normalized.slice(0, slash)
}

export function orderIdentity(
  meta: { id?: unknown } | null | undefined,
  filePath: string,
): string {
  if (meta && typeof meta.id === 'string' && meta.id.trim()) {
    return meta.id
  }
  return filePath
}

export function orderIdentityFromCache(
  cache: Record<string, { id?: unknown } | undefined>,
  filePath: string,
): string {
  return orderIdentity(cache[filePath], filePath)
}
