import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'

describe('TypeScript compilation for test files', () => {
  it('compiles all .test.ts files without errors', () => {
    const result = spawnSync(
      process.execPath,
      ['node_modules/typescript/bin/tsc', '--project', 'tsconfig.tests.json', '--pretty', 'false'],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    )

    const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim()

    expect(
      result.status,
      output || 'TypeScript exited with a non-zero status without diagnostic output.',
    ).toBe(0)
  })
})