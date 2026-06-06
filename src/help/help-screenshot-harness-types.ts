import type { HelpScreenshotScenarioId } from './help-screenshot-scenarios'
import type { ProjectEditorActions } from '../features/project-editor/project-editor-types'

export const HELP_SCREENSHOT_HARNESS_READY_EVENT = 'trama:help-screenshot-harness-ready'

export type OpenProjectFn = (projectRoot: string) => Promise<void>

/** Optional crop rectangle returned by a scenario for region-based capture. */
export interface CaptureRegion {
  x: number
  y: number
  width: number
  height: number
}

export interface HelpScreenshotHarnessDeps {
  projectRoot: string
  openProject: OpenProjectFn
  actions: ProjectEditorActions
}

export interface HelpScreenshotHarness {
  runScenario: (scenarioId: HelpScreenshotScenarioId) => Promise<CaptureRegion | undefined>
}
