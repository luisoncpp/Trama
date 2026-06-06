import { logSnapshotComparison } from '../snapshot-compare-logger'

export class PaneSnapshotTracker {
  private map: Map<string, string>
  private ownsMap: boolean

  constructor(existingMap?: Map<string, string>) {
    this.map = existingMap ?? new Map()
    this.ownsMap = !existingMap
  }

  get(path: string): string | null {
    return this.map.get(path) ?? null
  }

  set(path: string, content: string): void {
    this.map.set(path, content)
  }

  async checkExternalChangeMatchesSavedSnapshot(
    path: string,
    externalContent: string,
  ): Promise<boolean> {
    const savedContent = this.get(path)
    const matches = savedContent !== null && savedContent === externalContent
    logSnapshotComparison(path, savedContent, externalContent, matches)
    return matches
  }

  destroy(): void {
    if (this.ownsMap) this.map.clear()
  }
}
