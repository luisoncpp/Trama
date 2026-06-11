import { useMemo } from 'preact/hooks'
import { useEditorActions } from '../../project-editor-actions-context.tsx'
import { useSidebarSectionRoot } from './sidebar-section-scope-context'
import {
  toProjectPath,
  toSectionRelativePath,
  toProjectFolderPath,
  toSectionRelativeFolderPath,
  type SidebarSectionRoot,
} from './sidebar-path-scoping'
import type { ProjectEditorActions } from '../../project-editor-types'

export function useScopedSidebarActions(): Pick<
  ProjectEditorActions,
  | 'renameFile'
  | 'renameFolder'
  | 'deleteFile'
  | 'deleteFolder'
  | 'editFileTags'
  | 'revealInFileManager'
  | 'selectFile'
  | 'reorderFiles'
  | 'moveFile'
  | 'moveFolder'
> {
  const actions = useEditorActions()
  const root = useSidebarSectionRoot() as SidebarSectionRoot

  return useMemo<ReturnType<typeof useScopedSidebarActions>>(/* buildScopedSidebarActions */ () => {
    const scopePath = (p: string) => toProjectPath(toSectionRelativePath(p), root)
    return {
      renameFile: ({ path, newName }) => actions.renameFile({ path: scopePath(path), newName }),
      renameFolder: ({ path, newName }) => actions.renameFolder({ path: scopePath(path), newName }),
      deleteFile: (path, options) => actions.deleteFile(scopePath(path), options),
      deleteFolder: (path) => actions.deleteFolder(scopePath(path)),
      editFileTags: (path, tags) => actions.editFileTags(scopePath(path), tags),
      revealInFileManager: (path?: string) => actions.revealInFileManager(path ? scopePath(path) : undefined),
      selectFile: (filePath) => actions.selectFile(scopePath(filePath)),
      reorderFiles: (folderPath, orderedIds) => actions.reorderFiles(
        toProjectFolderPath(toSectionRelativeFolderPath(folderPath), root),
        orderedIds.map((path) => toProjectPath(toSectionRelativePath(path), root)),
      ),
      moveFile: (sourcePath, targetFolder) => actions.moveFile(
        toProjectPath(toSectionRelativePath(sourcePath), root),
        toProjectFolderPath(toSectionRelativeFolderPath(targetFolder), root),
      ),
      moveFolder: (sourcePath, targetParent) => actions.moveFolder(
        toProjectPath(toSectionRelativePath(sourcePath), root),
        toProjectFolderPath(toSectionRelativeFolderPath(targetParent), root),
      ),
    }
  }, [actions, root] /*Inputs for buildScopedSidebarActions*/)
}
