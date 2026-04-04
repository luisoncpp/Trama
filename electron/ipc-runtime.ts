import type { BrowserWindow } from 'electron'
import { externalFileEventSchema, IPC_CHANNELS } from '../src/shared/ipc.js'
import { IndexService } from './services/index-service.js'
import { WatcherService } from './services/watcher-service.js'

let activeProjectRoot: string | null = null
let activeIndexService: IndexService | null = null
let getMainWindowRef: (() => BrowserWindow | null) | null = null

const watcherService = new WatcherService((event) => {
  const validated = externalFileEventSchema.safeParse(event)
  if (!validated.success || validated.data.source !== 'external') {
    return
  }

  const win = getMainWindowRef?.()
  if (!win || win.isDestroyed()) {
    return
  }

  win.webContents.send(IPC_CHANNELS.externalFileEvent, validated.data)
})

export function configureMainWindowResolver(getMainWindow: () => BrowserWindow | null): void {
  getMainWindowRef = getMainWindow
}

export function setActiveProject(projectRoot: string, indexService: IndexService): void {
  activeProjectRoot = projectRoot
  activeIndexService = indexService
}

export function getActiveProjectRoot(): string {
  if (!activeProjectRoot) {
    throw new Error('No active project. Open a project first.')
  }

  return activeProjectRoot
}

export function getActiveIndexService(): IndexService | null {
  return activeIndexService
}

export async function startWatcher(projectRoot: string): Promise<void> {
  await watcherService.start(projectRoot)
}

export function markInternalWrite(relativePath: string): void {
  watcherService.markInternalWrite(relativePath)
}

export async function shutdownIpcServices(): Promise<void> {
  await watcherService.stop()
}
