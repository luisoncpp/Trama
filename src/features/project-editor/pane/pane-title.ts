export function toPaneTitle(path: string | null): string {
  if (!path) return 'No file selected'
  const normalized = path.replace(/\\/g, '/')
  const segments = normalized.split('/')
  return segments[segments.length - 1] ?? normalized
}
