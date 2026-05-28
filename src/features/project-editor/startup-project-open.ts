export interface StartupProjectOpenDeps {
  lastProjectRootPath: string | null
  openProject: (projectRoot: string) => Promise<void>
  pickProjectFolder: () => Promise<void>
  validateProjectFolder: (rootPath: string) => Promise<boolean>
  clearLastProjectRootPath?: () => void
}

export async function restoreLastProjectOrPickFolder(deps: StartupProjectOpenDeps): Promise<void> {
  if (!deps.lastProjectRootPath) {
    await deps.pickProjectFolder()
    return
  }

  const isValid = await deps.validateProjectFolder(deps.lastProjectRootPath)
  if (isValid) {
    await deps.openProject(deps.lastProjectRootPath)
    return
  }

  deps.clearLastProjectRootPath?.()
  await deps.pickProjectFolder()
}
