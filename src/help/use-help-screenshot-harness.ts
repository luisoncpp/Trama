import { useEffect } from 'preact/hooks'
import type { ProjectEditorActions } from '../features/project-editor/project-editor-types'
import { runHelpScreenshotScenario } from './help-screenshot-harness-logic'
import {
  HELP_SCREENSHOT_HARNESS_READY_EVENT,
  type HelpScreenshotHarness,
  type OpenProjectFn,
} from './help-screenshot-harness-types'
import type { HelpScreenshotScenarioId } from './help-screenshot-scenarios'
import { isHelpScreenshotCaptureMode } from './is-help-screenshot-capture-mode'

function readCaptureProjectRoot(): string {
  const configuredRoot = window.__TRAMA_HELP_SCREENSHOTS_PROJECT_ROOT__
  if (!configuredRoot) {
    throw new Error('HELP_SCREENSHOT_PROJECT_ROOT_MISSING')
  }

  return configuredRoot
}

function createHarness(
  openProject: OpenProjectFn,
  actions: ProjectEditorActions,
): HelpScreenshotHarness {
  const projectRoot = readCaptureProjectRoot()

  return {
    runScenario: async (scenarioId: HelpScreenshotScenarioId) => {
      const region = await runHelpScreenshotScenario({ projectRoot, openProject, actions }, scenarioId)
      return region
    },
  }
}

export function useHelpScreenshotHarness(
  openProject: OpenProjectFn,
  actions: ProjectEditorActions,
): void {
  useEffect(() => {
    if (!isHelpScreenshotCaptureMode()) {
      return
    }

    window.__tramaHelpScreenshotHarness = createHarness(openProject, actions)
    window.dispatchEvent(new Event(HELP_SCREENSHOT_HARNESS_READY_EVENT))

    return () => {
      delete window.__tramaHelpScreenshotHarness
    }
  }, [actions, openProject])
}
