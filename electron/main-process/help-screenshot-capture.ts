import { access } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { app, BrowserWindow, type Rectangle } from 'electron'

const execFileAsync = promisify(execFile)
const HARNESS_READY_TIMEOUT_MS = 30_000
const CAPTURE_SETTLE_MS = 400
const CAPTURE_TIMEOUT_MS = 180_000

export interface HelpScreenshotCaptureOptions {
  outputDir: string
  projectRoot: string
}

interface HelpScreenshotScenarioRow {
  id: string
  fileName: string
  requiresGitRepository: boolean
  optional: boolean
}

const HELP_SCREENSHOT_SCENARIOS: HelpScreenshotScenarioRow[] = [
  { id: 'workspace-overview-dark', fileName: 'workspace-overview-dark.png', requiresGitRepository: false, optional: false },
  { id: 'workspace-overview-light', fileName: 'workspace-overview-light.png', requiresGitRepository: false, optional: false },
  { id: 'split-panes-dark', fileName: 'split-panes-dark.png', requiresGitRepository: false, optional: false },
  { id: 'focus-mode-dark', fileName: 'focus-mode-dark.png', requiresGitRepository: false, optional: false },
  { id: 'map-document-dark', fileName: 'map-document-dark.png', requiresGitRepository: false, optional: true },
  { id: 'git-snapshots-dark', fileName: 'git-snapshots-dark.png', requiresGitRepository: true, optional: true },
  { id: 'edit-tags-context-menu-dark', fileName: 'edit-tags-context-menu-dark.png', requiresGitRepository: false, optional: true },
  { id: 'edit-tags-modal-dark', fileName: 'edit-tags-modal-dark.png', requiresGitRepository: false, optional: true },
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await access(targetPath)
    return true
  } catch {
    return false
  }
}

async function ensureGitRepository(projectRoot: string): Promise<boolean> {
  const gitDir = path.join(projectRoot, '.git')
  if (await pathExists(gitDir)) {
    return true
  }

  try {
    await execFileAsync('git', ['-C', projectRoot, 'init'], { windowsHide: true })
    await execFileAsync('git', ['-C', projectRoot, 'add', '-A'], { windowsHide: true })
    await execFileAsync(
      'git',
      ['-C', projectRoot, 'commit', '-m', 'Trama help screenshot fixture', '--allow-empty'],
      { windowsHide: true },
    )
    return true
  } catch {
    return false
  }
}

async function waitForHarness(win: BrowserWindow): Promise<void> {
  const ready = await win.webContents.executeJavaScript(
    `new Promise((resolve) => {
      if (window.__tramaHelpScreenshotHarness) {
        resolve(true)
        return
      }

      const timeout = window.setTimeout(() => resolve(false), ${HARNESS_READY_TIMEOUT_MS})
      window.addEventListener(${JSON.stringify('trama:help-screenshot-harness-ready')}, () => {
        window.clearTimeout(timeout)
        resolve(Boolean(window.__tramaHelpScreenshotHarness))
      }, { once: true })
    })`,
    true,
  )

  if (!ready) {
    throw new Error('HELP_SCREENSHOT_HARNESS_UNAVAILABLE')
  }
}

async function injectCaptureConfig(win: BrowserWindow, projectRoot: string): Promise<void> {
  const escapedRoot = JSON.stringify(projectRoot)
  await win.webContents.executeJavaScript(
    `window.__TRAMA_HELP_SCREENSHOTS_PROJECT_ROOT__ = ${escapedRoot};`,
    true,
  )
}

async function runScenario(win: BrowserWindow, scenarioId: string): Promise<Rectangle | undefined> {
  const region = await win.webContents.executeJavaScript(
    `window.__tramaHelpScreenshotHarness.runScenario(${JSON.stringify(scenarioId)})`,
    true,
  ) as { x: number; y: number; width: number; height: number } | undefined

  if (region) {
    return { x: region.x, y: region.y, width: region.width, height: region.height }
  }

  await sleep(CAPTURE_SETTLE_MS)
  return undefined
}

export function setupHelpScreenshotCaptureHooks(win: BrowserWindow): void {
  win.webContents.on('did-fail-load', (_event, code, description) => {
    console.error('HELP_SCREENSHOT_CAPTURE_FAIL', `LOAD_FAIL ${code}: ${description}`)
    app.exit(1)
  })

  setTimeout(() => {
    console.error('HELP_SCREENSHOT_CAPTURE_FAIL', 'CAPTURE_TIMEOUT')
    app.exit(1)
  }, CAPTURE_TIMEOUT_MS)
}

export async function runHelpScreenshotCapture(
  win: BrowserWindow,
  options: HelpScreenshotCaptureOptions,
): Promise<void> {
  const { mkdir, writeFile } = await import('node:fs/promises')

  await mkdir(options.outputDir, { recursive: true })
  win.setContentSize(1280, 800)
  await injectCaptureConfig(win, options.projectRoot)
  await waitForHarness(win)

  const gitReady = await ensureGitRepository(options.projectRoot)
  const captured: string[] = []
  const skipped: string[] = []

  for (const scenario of HELP_SCREENSHOT_SCENARIOS) {
    if (scenario.requiresGitRepository && !gitReady) {
      skipped.push(scenario.id)
      console.log('HELP_SCREENSHOT_SKIP', scenario.id, 'GIT_UNAVAILABLE')
      continue
    }

    try {
      const captureRegion = await runScenario(win, scenario.id)
      const image = captureRegion
        ? await win.webContents.capturePage(captureRegion)
        : await win.webContents.capturePage()
      const destination = path.join(options.outputDir, scenario.fileName)
      await writeFile(destination, image.toPNG())
      captured.push(scenario.fileName)
      console.log('HELP_SCREENSHOT_CAPTURED', scenario.fileName)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (scenario.optional) {
        skipped.push(scenario.id)
        console.log('HELP_SCREENSHOT_SKIP', scenario.id, message)
        continue
      }

      console.error('HELP_SCREENSHOT_CAPTURE_FAIL', scenario.id, message)
      app.exit(1)
      return
    }
  }

  console.log('HELP_SCREENSHOT_CAPTURE_PASS', JSON.stringify({ captured, skipped }))

  if (!win.isDestroyed()) {
    win.destroy()
  }

  app.exit(0)
  setTimeout(() => {
    process.exit(0)
  }, 0)
}
