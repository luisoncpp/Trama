import type { WorkspaceLayoutState } from '../../project-editor-types'

export const WORKSPACE_LAYOUT_STORAGE_KEY = 'trama.workspace.layout.v1'

const MIN_SPLIT_RATIO = 0.2
const MAX_SPLIT_RATIO = 0.8
const MIN_ZOOM_LEVEL = 0.5
const MAX_ZOOM_LEVEL = 2.0

function clampSplitRatio(value: number): number {
  return Math.min(MAX_SPLIT_RATIO, Math.max(MIN_SPLIT_RATIO, value))
}

function clampZoomLevel(value: number): number {
  return Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, value))
}

export function createDefaultWorkspaceLayoutState(): WorkspaceLayoutState {
  return {
    mode: 'single',
    ratio: 0.5,
    primaryPath: null,
    secondaryPath: null,
    activePane: 'primary',
    focusModeEnabled: false,
    focusScope: 'paragraph',
    zoomLevel: 1.0,
  }
}

export function normalizeWorkspaceLayoutState(layout: WorkspaceLayoutState): WorkspaceLayoutState {
  return {
    mode: layout.mode,
    ratio: clampSplitRatio(layout.ratio),
    primaryPath: layout.primaryPath,
    secondaryPath: layout.secondaryPath,
    activePane: layout.activePane,
    focusModeEnabled: layout.focusModeEnabled ?? false,
    focusScope: layout.focusScope ?? 'paragraph',
    zoomLevel: clampZoomLevel(layout.zoomLevel ?? 1.0),
  }
}

function isWorkspaceLayoutShape(value: unknown): value is WorkspaceLayoutState {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<WorkspaceLayoutState>
  return (
    (candidate.mode === 'single' || candidate.mode === 'split')
    && typeof candidate.ratio === 'number'
    && (candidate.primaryPath === null || typeof candidate.primaryPath === 'string')
    && (candidate.secondaryPath === null || typeof candidate.secondaryPath === 'string')
    && (candidate.activePane === 'primary' || candidate.activePane === 'secondary')
    && (candidate.focusModeEnabled === undefined || typeof candidate.focusModeEnabled === 'boolean')
    && (
      candidate.focusScope === undefined
      || candidate.focusScope === 'line'
      || candidate.focusScope === 'sentence'
      || candidate.focusScope === 'paragraph'
    )
    && (candidate.zoomLevel === undefined || typeof candidate.zoomLevel === 'number')
  )
}

export function restoreWorkspaceLayoutState(storageValue: string | null): WorkspaceLayoutState {
  if (!storageValue) {
    return createDefaultWorkspaceLayoutState()
  }

  try {
    const parsed: unknown = JSON.parse(storageValue)
    if (!isWorkspaceLayoutShape(parsed)) {
      return createDefaultWorkspaceLayoutState()
    }

    return {
      ...normalizeWorkspaceLayoutState(parsed),
      // Startup policy: focus mode should always begin disabled.
      focusModeEnabled: false,
    }
  } catch {
    return createDefaultWorkspaceLayoutState()
  }
}

function pickSecondaryPath(markdownFiles: string[], primaryPath: string | null): string | null {
  if (!markdownFiles.length) {
    return null
  }

  const candidate = markdownFiles.find((value) => value !== primaryPath)
  return candidate ?? null
}

function applyPreferredPathToActivePane(
  preferredPath: string,
  activePane: WorkspaceLayoutState['activePane'],
  currentPrimaryPath: string | null,
  currentSecondaryPath: string | null,
): { primaryPath: string | null; secondaryPath: string | null } {
  if (activePane === 'secondary') {
    return {
      primaryPath: currentPrimaryPath,
      secondaryPath: preferredPath,
    }
  }

  return {
    primaryPath: preferredPath,
    secondaryPath: currentSecondaryPath,
  }
}

export function reconcileWorkspaceLayout(
  layout: WorkspaceLayoutState,
  markdownFiles: string[],
  preferredFilePath?: string,
): WorkspaceLayoutState {
  const normalized = normalizeWorkspaceLayoutState(layout)
  const includesPath = (value: string | null): value is string => Boolean(value && markdownFiles.includes(value))
  const preferred = preferredFilePath && markdownFiles.includes(preferredFilePath) ? preferredFilePath : null

  let primaryPath = includesPath(normalized.primaryPath) ? normalized.primaryPath : null
  let secondaryPath = includesPath(normalized.secondaryPath) ? normalized.secondaryPath : null

  if (preferred) {
    const withPreferred = applyPreferredPathToActivePane(
      preferred,
      normalized.activePane,
      primaryPath,
      secondaryPath,
    )
    primaryPath = withPreferred.primaryPath
    secondaryPath = withPreferred.secondaryPath
  }

  if (!primaryPath) {
    primaryPath = preferred ?? markdownFiles[0] ?? null
  }

  if (secondaryPath === primaryPath) {
    secondaryPath = null
  }

  if (normalized.mode === 'split' && !secondaryPath) {
    secondaryPath = pickSecondaryPath(markdownFiles, primaryPath)
  }

  const mode = normalized.mode === 'split' && secondaryPath ? 'split' : 'single'
  const activePane = mode === 'split' && normalized.activePane === 'secondary' ? 'secondary' : 'primary'

  return {
    ...normalized,
    mode,
    primaryPath,
    secondaryPath,
    activePane,
  }
}
