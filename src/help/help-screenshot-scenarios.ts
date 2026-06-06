export const HELP_SCREENSHOT_SCENARIO_IDS = [
  'workspace-overview-dark',
  'workspace-overview-light',
  'split-panes-dark',
  'focus-mode-dark',
  'map-document-dark',
  'git-snapshots-dark',
  'edit-tags-context-menu-dark',
  'edit-tags-modal-dark',
] as const

export type HelpScreenshotScenarioId = (typeof HELP_SCREENSHOT_SCENARIO_IDS)[number]

export interface HelpScreenshotScenarioDefinition {
  id: HelpScreenshotScenarioId
  fileName: string
  requiresGitRepository: boolean
}

export const HELP_SCREENSHOT_SCENARIOS: HelpScreenshotScenarioDefinition[] = [
  { id: 'workspace-overview-dark', fileName: 'workspace-overview-dark.png', requiresGitRepository: false },
  { id: 'workspace-overview-light', fileName: 'workspace-overview-light.png', requiresGitRepository: false },
  { id: 'split-panes-dark', fileName: 'split-panes-dark.png', requiresGitRepository: false },
  { id: 'focus-mode-dark', fileName: 'focus-mode-dark.png', requiresGitRepository: false },
  { id: 'map-document-dark', fileName: 'map-document-dark.png', requiresGitRepository: false },
  { id: 'git-snapshots-dark', fileName: 'git-snapshots-dark.png', requiresGitRepository: true },
  { id: 'edit-tags-context-menu-dark', fileName: 'edit-tags-context-menu-dark.png', requiresGitRepository: false },
  { id: 'edit-tags-modal-dark', fileName: 'edit-tags-modal-dark.png', requiresGitRepository: false },
]
