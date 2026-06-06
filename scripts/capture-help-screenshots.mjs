import { access } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import electronPath from 'electron'

const rootDir = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const outputDir = path.join(rootDir, 'help', 'en', 'assets')
const projectRoot = path.join(rootDir, 'example-fantasy')
const mainEntry = path.join(rootDir, 'dist-electron', 'electron', 'main.js')

async function assertBuildArtifactsExist() {
  await access(mainEntry)
  await access(path.join(rootDir, 'dist', 'index.html'))
}

function runCapture() {
  return new Promise((resolve, reject) => {
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE

    const child = spawn(electronPath, [mainEntry], {
      cwd: rootDir,
      env: {
        ...env,
        TRAMA_CAPTURE_HELP_SCREENSHOTS: '1',
        TRAMA_HELP_SCREENSHOTS_OUT: outputDir,
        TRAMA_HELP_SCREENSHOTS_PROJECT: projectRoot,
      },
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve(undefined)
        return
      }

      reject(new Error(`Help screenshot capture exited with code ${code ?? 'null'}`))
    })
  })
}

try {
  await assertBuildArtifactsExist()
  await runCapture()
  console.log(`Help screenshots written to ${outputDir}`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error('HELP_SCREENSHOT_CAPTURE_SCRIPT_FAIL', message)
  console.error('Run `npm run build` before `npm run help:screenshots`.')
  process.exit(1)
}
