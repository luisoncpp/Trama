import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { normalizeName } from '../../../../shared/sidebar-utils'
import type { SidebarCreateInput, ProjectEditorProjectState, ProjectEditorSidebarState } from '../../project-editor-types'
import { buildProjectCandidatePath, type SidebarSectionRoot } from '../../components/sidebar/sidebar-path-scoping'
import { SIDEBAR_SECTION_CONFIG } from '../../components/sidebar/sidebar-section-roots'

function isPathExistsError(message: string): boolean {
  return message.toLowerCase().includes('already exists')
}

function isInvalidCreateInput(input: SidebarCreateInput): boolean {
  const normalizedName = normalizeName(input.name)
  return normalizedName.length === 0 || normalizedName.includes('/')
}

function isContentSection(value: ProjectEditorSidebarState['sidebarActiveSection']): value is keyof typeof SIDEBAR_SECTION_CONFIG {
  return Object.hasOwn(SIDEBAR_SECTION_CONFIG, value)
}

function getSectionRoot(activeSection: ProjectEditorSidebarState['sidebarActiveSection']): SidebarSectionRoot | null {
  if (!isContentSection(activeSection)) {
    return null
  }
  return SIDEBAR_SECTION_CONFIG[activeSection].root
}

export async function createArticle(
  input: SidebarCreateInput,
  deps: {
    projectState: ProjectEditorProjectState
    sidebarState: ProjectEditorSidebarState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  const sectionRoot = getSectionRoot(deps.sidebarState.sidebarActiveSection)
  if (!sectionRoot) {
    deps.setStatusMessage('Switch to a content section before creating files.')
    return
  }

  if (isInvalidCreateInput(input)) {
    deps.setStatusMessage('Provide an article name without path separators.')
    return
  }

  const directory = normalizeName(input.directory)
  const name = normalizeName(input.name)

  const maxAttempts = 20
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const createPath = buildProjectCandidatePath({ sectionRoot, directory, name, attempt, asMarkdown: true })
    const response = await window.tramaApi.createDocument({ path: createPath, initialContent: '' })
    if (response.ok) {
      deps.setStatusMessage(`Created article: ${response.data.path}`)
      await deps.openProject(deps.projectState.rootPath, response.data.path)
      return
    }

    if (!isPathExistsError(response.error.message)) {
      deps.setStatusMessage(`Could not create article: ${response.error.message}`)
      return
    }
  }

  deps.setStatusMessage('Could not create article: too many name collisions.')
}

export async function createCategory(
  input: SidebarCreateInput,
  deps: {
    projectState: ProjectEditorProjectState
    sidebarState: ProjectEditorSidebarState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
  },
): Promise<void> {
  if (!deps.projectState.rootPath) {
    deps.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
    return
  }

  const sectionRoot = getSectionRoot(deps.sidebarState.sidebarActiveSection)
  if (!sectionRoot) {
    deps.setStatusMessage('Switch to a content section before creating folders.')
    return
  }

  if (isInvalidCreateInput(input)) {
    deps.setStatusMessage('Provide a category name without path separators.')
    return
  }

  const directory = normalizeName(input.directory)
  const name = normalizeName(input.name)

  const maxAttempts = 20
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const createPath = buildProjectCandidatePath({ sectionRoot, directory, name, attempt, asMarkdown: false })
    const response = await window.tramaApi.createFolder({ path: createPath })
    if (response.ok) {
      deps.setStatusMessage(`Created category: ${response.data.path}`)
      await deps.openProject(deps.projectState.rootPath)
      return
    }

    if (!isPathExistsError(response.error.message)) {
      deps.setStatusMessage(`Could not create category: ${response.error.message}`)
      return
    }
  }

  deps.setStatusMessage('Could not create category: too many name collisions.')
}
