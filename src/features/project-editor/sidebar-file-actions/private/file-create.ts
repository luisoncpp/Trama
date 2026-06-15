import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { normalizeName } from '../../../../shared/sidebar-utils'
import type { SidebarCreateInput, ProjectEditorProjectState, ProjectEditorSidebarState } from '../../project-editor-types'
import type { OpenProjectOptions } from '../../open-project-types'
import { buildProjectCandidatePath, type SidebarSectionRoot } from '../../components/sidebar/sidebar-path-scoping'
import { SIDEBAR_SECTION_CONFIG } from '../../components/sidebar/sidebar-section-roots'

function isPathExistsError(message: string): boolean {
  return message.toLowerCase().includes('already exists')
}

function isInvalidCreateInput(input: SidebarCreateInput): boolean {
  const normalizedName = normalizeName(input.name)
  return normalizedName.length === 0 || normalizedName.includes('/')
}

function hasSelectedImage(input: SidebarCreateInput): boolean {
  return input.sourceImagePath.trim().length > 0
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

async function createFileWithRetries(
  input: SidebarCreateInput,
  deps: {
    projectState: ProjectEditorProjectState
    sidebarState: ProjectEditorSidebarState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  },
  options: {
    label: 'article' | 'map' | 'relationships chart'
    createPath: (sectionRoot: SidebarSectionRoot, directory: string, name: string, attempt: number) => string
    submit: (path: string, name: string) => Promise<{ ok: true; data: { path: string } } | { ok: false; error: { message: string } }>
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
    deps.setStatusMessage(`Provide a ${options.label} name without path separators.`)
    return
  }

  const directory = normalizeName(input.directory)
  const name = normalizeName(input.name)

  const maxAttempts = 20
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const createPath = options.createPath(sectionRoot, directory, name, attempt)
    const response = await options.submit(createPath, input.name.trim())
    if (response.ok) {
      deps.setStatusMessage(`Created ${options.label}: ${response.data.path}`)
      await deps.openProject(deps.projectState.rootPath, {
        preferredFilePath: response.data.path,
        incrementalUpdate: { createdFiles: [response.data.path] },
      })
      return
    }

    if (!isPathExistsError(response.error.message)) {
      deps.setStatusMessage(`Could not create ${options.label}: ${response.error.message}`)
      return
    }
  }

  deps.setStatusMessage(`Could not create ${options.label}: too many name collisions.`)
}

export async function createArticle(
  input: SidebarCreateInput,
  deps: {
    projectState: ProjectEditorProjectState
    sidebarState: ProjectEditorSidebarState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  },
  templatePath?: string | null,
): Promise<void> {
  if (templatePath) {
    await createFileWithRetries(input, deps, {
      label: 'article',
      createPath: (sectionRoot, directory, name, attempt) => buildProjectCandidatePath({ sectionRoot, directory, name, attempt, asMarkdown: true }),
      submit: (path) => window.tramaApi.createFromTemplate({ templatePath, destinationPath: path }),
    })
    return
  }

  await createFileWithRetries(input, deps, {
    label: 'article',
    createPath: (sectionRoot, directory, name, attempt) => buildProjectCandidatePath({ sectionRoot, directory, name, attempt, asMarkdown: true }),
    submit: (path) => window.tramaApi.createDocument({ path, initialContent: '' }),
  })
}

export async function createMap(
  input: SidebarCreateInput,
  deps: {
    projectState: ProjectEditorProjectState
    sidebarState: ProjectEditorSidebarState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  },
): Promise<void> {
  if (!hasSelectedImage(input)) {
    deps.setStatusMessage('Select an image file for the new map.')
    return
  }

  await createFileWithRetries(input, deps, {
    label: 'map',
    createPath: (sectionRoot, directory, name, attempt) => buildProjectCandidatePath({ sectionRoot, directory, name, attempt, asMarkdown: true }),
    submit: (path, name) => window.tramaApi.createMapDocument({
      path,
      name,
      sourceImagePath: input.sourceImagePath.trim(),
    }),
  })
}

export async function createRelationships(
  input: SidebarCreateInput,
  deps: {
    projectState: ProjectEditorProjectState
    sidebarState: ProjectEditorSidebarState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
  },
): Promise<void> {
  await createFileWithRetries(input, deps, {
    label: 'relationships chart',
    createPath: (sectionRoot, directory, name, attempt) => buildProjectCandidatePath({ sectionRoot, directory, name, attempt, asMarkdown: true }),
    submit: (path, name) => window.tramaApi.createRelationshipsDocument({ path, name }),
  })
}

export async function createCategory(
  input: SidebarCreateInput,
  deps: {
    projectState: ProjectEditorProjectState
    sidebarState: ProjectEditorSidebarState
    setStatusMessage: (value: string) => void
    openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>
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
      await deps.openProject(deps.projectState.rootPath, {
        incrementalUpdate: { createdFolders: [response.data.path] },
      })
      return
    }

    if (!isPathExistsError(response.error.message)) {
      deps.setStatusMessage(`Could not create category: ${response.error.message}`)
      return
    }
  }

  deps.setStatusMessage('Could not create category: too many name collisions.')
}
