import { useCallback } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import { normalizeName } from '../../shared/sidebar-utils'
import type { ProjectEditorActions } from './project-editor-types'
import type { SidebarCreateInput } from './project-editor-types'
import type { ProjectEditorProjectState, ProjectEditorSidebarState } from './project-editor-types'
import { buildProjectCandidatePath, type SidebarSectionRoot } from './components/sidebar/sidebar-path-scoping'
import { SIDEBAR_SECTION_CONFIG } from './components/sidebar/sidebar-section-roots'

interface UseProjectEditorCreateActionsParams {
  projectState: ProjectEditorProjectState
  sidebarState: ProjectEditorSidebarState
  setters: {
    setStatusMessage: (value: string) => void
  }
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
}

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

function useCreateArticleAction({
  projectState,
  sidebarState,
  setters,
  openProject,
}: UseProjectEditorCreateActionsParams): ProjectEditorActions['createArticle'] {
  return useCallback(/* createArticleAction */ async (input: SidebarCreateInput): Promise<void> => {
    if (!projectState.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    const sectionRoot = getSectionRoot(sidebarState.sidebarActiveSection)
    if (!sectionRoot) {
      setters.setStatusMessage('Switch to a content section before creating files.')
      return
    }

    if (isInvalidCreateInput(input)) {
      setters.setStatusMessage('Provide an article name without path separators.')
      return
    }

    const directory = normalizeName(input.directory)
    const name = normalizeName(input.name)

    const maxAttempts = 20
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const createPath = buildProjectCandidatePath({ sectionRoot, directory, name, attempt, asMarkdown: true })
      const response = await window.tramaApi.createDocument({ path: createPath, initialContent: '' })
      if (response.ok) {
        setters.setStatusMessage(`Created article: ${response.data.path}`)
        await openProject(projectState.rootPath, response.data.path)
        return
      }

      if (!isPathExistsError(response.error.message)) {
        setters.setStatusMessage(`Could not create article: ${response.error.message}`)
        return
      }
    }

    setters.setStatusMessage('Could not create article: too many name collisions.')
  }, [openProject, setters, projectState.rootPath, sidebarState.sidebarActiveSection] /*Inputs for createArticleAction*/)
}

function useCreateCategoryAction({
  projectState,
  sidebarState,
  setters,
  openProject,
}: UseProjectEditorCreateActionsParams): ProjectEditorActions['createCategory'] {
  return useCallback(/* createCategoryAction */ async (input: SidebarCreateInput): Promise<void> => {
    if (!projectState.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    const sectionRoot = getSectionRoot(sidebarState.sidebarActiveSection)
    if (!sectionRoot) {
      setters.setStatusMessage('Switch to a content section before creating folders.')
      return
    }

    if (isInvalidCreateInput(input)) {
      setters.setStatusMessage('Provide a category name without path separators.')
      return
    }

    const directory = normalizeName(input.directory)
    const name = normalizeName(input.name)

    const maxAttempts = 20
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const createPath = buildProjectCandidatePath({ sectionRoot, directory, name, attempt, asMarkdown: false })
      const response = await window.tramaApi.createFolder({ path: createPath })
      if (response.ok) {
        setters.setStatusMessage(`Created category: ${response.data.path}`)
        await openProject(projectState.rootPath)
        return
      }

      if (!isPathExistsError(response.error.message)) {
        setters.setStatusMessage(`Could not create category: ${response.error.message}`)
        return
      }
    }

    setters.setStatusMessage('Could not create category: too many name collisions.')
  }, [openProject, setters, projectState.rootPath, sidebarState.sidebarActiveSection] /*Inputs for createCategoryAction*/)
}

export function useProjectEditorCreateActions({
  projectState,
  sidebarState,
  setters,
  openProject,
}: UseProjectEditorCreateActionsParams): {
  createArticle: ProjectEditorActions['createArticle']
  createCategory: ProjectEditorActions['createCategory']
} {
  const createArticle = useCreateArticleAction({ projectState, sidebarState, setters, openProject })
  const createCategory = useCreateCategoryAction({ projectState, sidebarState, setters, openProject })

  return {
    createArticle,
    createCategory,
  }
}
