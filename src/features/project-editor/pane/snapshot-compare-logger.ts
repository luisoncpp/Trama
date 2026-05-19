export function logSnapshotComparison(
  path: string,
  saved: string | null,
  external: string,
  matches: boolean,
): void {
  if (saved === null) {
    console.log(`[SnapshotCompare] ${path} — no saved snapshot exists`)
    return
  }

  console.log(`[SnapshotCompare] ${path} | saved: ${saved.length} chars | external: ${external.length} chars | match: ${matches}`)

  if (!matches) {
    let firstDiff = 0
    const maxLen = Math.max(saved.length, external.length)
    while (firstDiff < maxLen && saved[firstDiff] === external[firstDiff]) {
      firstDiff++
    }

    const windowSize = 30
    const savedSnippet = saved.slice(Math.max(0, firstDiff - windowSize), firstDiff + windowSize)
    const externalSnippet = external.slice(Math.max(0, firstDiff - windowSize), firstDiff + windowSize)

    console.log(`[SnapshotCompare] ${path} — first difference at index ${firstDiff}`)
    console.log(`[SnapshotCompare] saved:     "...${savedSnippet}..."`)
    console.log(`[SnapshotCompare] external:  "...${externalSnippet}..."`)
  }
}
