import { useCallback, useMemo } from 'preact/hooks'
import type { ProjectSnapshot } from '../../shared/ipc'
import type { ProjectEditorDialogsProps } from './project-editor-dialogs'
import { useAiExport } from './use-ai-export'
import { useAiImport } from './use-ai-import'
import { useBookExport } from './use-book-export'
import { useZuluImport } from './use-zulu-import'
import type { OpenProjectOptions } from './open-project-types'

export function useProjectEditorViewDialogs(
  rootPath: string,
  visibleFiles: string[],
  snapshot: ProjectSnapshot | null,
  openProject: (projectRoot: string, options?: OpenProjectOptions) => Promise<void>,
) {
  const handleImportSuccess = useCallback(
    /* handleImportSuccess */ async (createdFiles: string[]) => {
      if (rootPath) {
        await openProject(rootPath, {
          incrementalUpdate: { createdFiles },
        })
      }
    },
    [rootPath, openProject] /*Inputs for handleImportSuccess*/,
  )

  const aiImport = useAiImport(rootPath, handleImportSuccess)
  const aiExport = useAiExport(rootPath, snapshot)
  const bookExport = useBookExport(rootPath)
  const zuluImport = useZuluImport(rootPath, handleImportSuccess)

  const dialogsProps = useMemo(
    /* buildProjectEditorDialogsProps */ (): ProjectEditorDialogsProps => ({
      rootPath,
      visibleFiles,
      aiImport,
      bookExport,
      aiExport,
      zuluImport,
    }),
    [rootPath, visibleFiles, aiImport, bookExport, aiExport, zuluImport] /*Inputs for buildProjectEditorDialogsProps*/,
  )

  return { dialogsProps }
}

