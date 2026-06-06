const EDITOR_POLL_INTERVAL_MS = 100
const EDITOR_POLL_TIMEOUT_MS = 20_000

export const SCENARIO_SETTLE_MS = 600

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function waitForCondition(predicate: () => boolean, timeoutMs = EDITOR_POLL_TIMEOUT_MS): Promise<void> {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (predicate()) {
      return
    }

    await sleep(EDITOR_POLL_INTERVAL_MS)
  }

  throw new Error('HELP_SCREENSHOT_TIMEOUT waiting for UI condition')
}

export async function waitForSelector(selector: string, timeoutMs = EDITOR_POLL_TIMEOUT_MS): Promise<void> {
  await waitForCondition(() => Boolean(document.querySelector(selector)), timeoutMs)
}
