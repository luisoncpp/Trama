import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { ExternalFileEvent } from '../../src/shared/ipc.js'

type WatchEventKind = 'add' | 'change' | 'unlink'

type WatcherCallback = (event: ExternalFileEvent) => void

export class WatcherService {
  private watcher: FSWatcher | null = null
  private internalWrites = new Map<string, number>()

  constructor(private readonly onEvent: WatcherCallback) {}

  async start(projectRoot: string): Promise<void> {
    await this.stop()

    this.watcher = chokidar.watch(projectRoot, {
      ignored: [
        /(^|[\\/])\.git([\\/]|$)/,
        /(^|[\\/])node_modules([\\/]|$)/,
        /(^|[\\/])dist([\\/]|$)/,
        /(^|[\\/])dist-electron([\\/]|$)/,
        /(^|[\\/])Assets([\\/]|$)/,
        /(^|[\\/])\.trama\.index\.json$/,
      ],
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 150,
        pollInterval: 100,
      },
    })

    const handle = (event: WatchEventKind, absolutePath: string) => {
      if (!absolutePath.toLowerCase().endsWith('.md')) {
        return
      }

      const relative = path.relative(projectRoot, absolutePath).split(path.sep).join('/')
      const source = this.consumeSource(relative)

      this.onEvent({
        path: relative,
        event,
        source,
        timestamp: new Date().toISOString(),
      })
    }

    this.watcher.on('add', (filePath) => handle('add', filePath))
    this.watcher.on('change', (filePath) => handle('change', filePath))
    this.watcher.on('unlink', (filePath) => handle('unlink', filePath))
  }

  markInternalWrite(relativePath: string): void {
    const normalized = relativePath.replace(/\\/g, '/')
    this.internalWrites.set(normalized, Date.now())
  }

  async stop(): Promise<void> {
    this.internalWrites.clear()

    if (this.watcher) {
      await this.watcher.close()
      this.watcher = null
    }
  }

  private consumeSource(relativePath: string): 'internal' | 'external' {
    const now = Date.now()

    for (const [key, timestamp] of this.internalWrites.entries()) {
      if (now - timestamp > 4_000) {
        this.internalWrites.delete(key)
      }
    }

    const timestamp = this.internalWrites.get(relativePath)
    if (timestamp != null) {
      this.internalWrites.delete(relativePath)
      return 'internal'
    }

    return 'external'
  }
}
