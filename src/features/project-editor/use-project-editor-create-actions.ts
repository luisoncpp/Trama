import { useCallback } from 'preact/hooks'
import { PROJECT_EDITOR_STRINGS } from './project-editor-strings'
import { normalizeName } from '../../shared/sidebar-utils'
import type { ProjectEditorActions } from './project-editor-types'
import type { SidebarCreateInput } from './project-editor-types'
import type { UseProjectEditorStateResult } from './use-project-editor-state'
import { SIDEBAR_SECTION_CONFIG } from './components/sidebar/sidebar-section-roots'

interface UseProjectEditorCreateActionsParams {
  values: UseProjectEditorStateResult['values']
  setters: UseProjectEditorStateResult['setters']
  openProject: (projectRoot: string, preferredFilePath?: string) => Promise<void>
}

function ensureMarkdownExtension(value: string): string {
  return value.toLowerCase().endsWith('.md') ? value : `${value}.md`
}

function buildCandidatePath(
  sectionRoot: string,
  directory: string,
  baseName: string,
  attempt: number,
  asMarkdown: boolean,
): string {
  const suffix = attempt === 0 ? '' : `-${attempt + 1}`
  const prefix = directory ? `${sectionRoot}${directory}/` : sectionRoot
  const raw = `${prefix}${baseName}${suffix}`
  return asMarkdown ? ensureMarkdownExtension(raw) : raw
}

function isPathExistsError(message: string): boolean {
  return message.toLowerCase().includes('already exists')
}

function isInvalidCreateInput(input: SidebarCreateInput): boolean {
  const normalizedName = normalizeName(input.name)
  return normalizedName.length === 0 || normalizedName.includes('/')
}

function isContentSection(value: UseProjectEditorStateResult['values']['sidebarActiveSection']): value is keyof typeof SIDEBAR_SECTION_CONFIG {
  return Object.hasOwn(SIDEBAR_SECTION_CONFIG, value)
}

function getSectionRoot(activeSection: UseProjectEditorStateResult['values']['sidebarActiveSection']): string | null {
  if (!isContentSection(activeSection)) {
    return null
  }

  return SIDEBAR_SECTION_CONFIG[activeSection].root
}

function useCreateArticleAction({
  values,
  setters,
  openProject,
}: UseProjectEditorCreateActionsParams): ProjectEditorActions['createArticle'] {
  return useCallback(async (input: SidebarCreateInput): Promise<void> => {
    if (!values.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    const sectionRoot = getSectionRoot(values.sidebarActiveSection)
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
      const createPath = buildCandidatePath(sectionRoot, directory, name, attempt, true)
      const response = await window.tramaApi.createDocument({ path: createPath, initialContent: '' })
      if (response.ok) {
        setters.setStatusMessage(`Created article: ${response.data.path}`)
        await openProject(values.rootPath, response.data.path)
        return
      }

      if (!isPathExistsError(response.error.message)) {
        setters.setStatusMessage(`Could not create article: ${response.error.message}`)
        return
      }
    }

    setters.setStatusMessage('Could not create article: too many name collisions.')
  }, [openProject, setters, values.rootPath, values.sidebarActiveSection])
}

function useCreateCategoryAction({
  values,
  setters,
  openProject,
}: UseProjectEditorCreateActionsParams): ProjectEditorActions['createCategory'] {
  return useCallback(async (input: SidebarCreateInput): Promise<void> => {
    if (!values.rootPath) {
      setters.setStatusMessage(PROJECT_EDITOR_STRINGS.initialStatus)
      return
    }

    const sectionRoot = getSectionRoot(values.sidebarActiveSection)
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
      const createPath = buildCandidatePath(sectionRoot, directory, name, attempt, false)
      const response = await window.tramaApi.createFolder({ path: createPath })
      if (response.ok) {
        setters.setStatusMessage(`Created category: ${response.data.path}`)
        await openProject(values.rootPath)
        return
      }

      if (!isPathExistsError(response.error.message)) {
        setters.setStatusMessage(`Could not create category: ${response.error.message}`)
        return
      }
    }

    setters.setStatusMessage('Could not create category: too many name collisions.')
  }, [openProject, setters, values.rootPath, values.sidebarActiveSection])
}

export function useProjectEditorCreateActions({
  values,
  setters,
  openProject,
}: UseProjectEditorCreateActionsParams): {
  createArticle: ProjectEditorActions['createArticle']
  createCategory: ProjectEditorActions['createCategory']
} {
  const createArticle = useCreateArticleAction({ values, setters, openProject })
  const createCategory = useCreateCategoryAction({ values, setters, openProject })

  return {
    createArticle,
    createCategory,
  }
}
