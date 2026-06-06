import { useMemo } from 'preact/hooks'
import type { ProjectEditorDialogsProps } from './project-editor-dialogs'
import { useAiExport } from './use-ai-export'
import { useAiImport } from './use-ai-import'
import { useBookExport } from './use-book-export'
import { useZuluImport } from './use-zulu-import'

export function useProjectEditorViewDialogs(rootPath: string, visibleFiles: string[]) {
  const aiImport = useAiImport(rootPath)
  const aiExport = useAiExport(rootPath)
  const bookExport = useBookExport(rootPath)
  const zuluImport = useZuluImport(rootPath)

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
