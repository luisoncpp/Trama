// @vitest-environment node

import { describe, expect, it } from 'vitest'
import { spawn } from 'node:child_process'
import path from 'node:path'
import electronPath from 'electron'

function runElectronSmoke(rootDir: string): Promise<{ code: number | null; output: string }> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env }
    delete env.ELECTRON_RUN_AS_NODE

    const child = spawn(electronPath as unknown as string, ['dist-electron/electron/main.js'], {
      cwd: rootDir,
      env: { ...env, TRAMA_SMOKE_TEST: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let output = ''
    const timeout = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error(`Smoke test timed out after 25s. Output: ${output}`))
    }, 25_000)

    child.stdout.on('data', (chunk) => {
      output += String(chunk)
    })

    child.stderr.on('data', (chunk) => {
      output += String(chunk)
    })

    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      resolve({ code, output })
    })
  })
}

describe('Electron smoke test', () => {
  it('boots app and completes renderer-main IPC handshake', async () => {
    const rootDir = path.resolve(__dirname, '..')
    const result = await runElectronSmoke(rootDir)

    expect(result.code, result.output).toBe(0)
    expect(result.output).toContain('SMOKE_TEST_PASS')
  }, 30_000)
})
