import { dialog } from 'electron'
import { readdir } from 'node:fs/promises'
import path from 'node:path'

async function collectMarkdownFilesUnderDirectory(absoluteDir: string, absolutePaths: string[]): Promise<void> {
  const entries = await readdir(absoluteDir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name.startsWith('.')) {
      continue
    }

    const absoluteEntryPath = path.join(absoluteDir, entry.name)
    if (entry.isDirectory()) {
      await collectMarkdownFilesUnderDirectory(absoluteEntryPath, absolutePaths)
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      absolutePaths.push(absoluteEntryPath)
    }
  }
}

export async function pickAiExportStagingFiles(projectRoot: string): Promise<{ canceled: boolean; absolutePaths: string[] }> {
  const result = await dialog.showOpenDialog({
    defaultPath: projectRoot,
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Markdown', extensions: ['md'] }],
    title: 'Add files to export basket',
  })

  if (result.canceled) {
    return { canceled: true, absolutePaths: [] }
  }

  return { canceled: false, absolutePaths: result.filePaths }
}

export async function pickAiExportStagingFolder(projectRoot: string): Promise<{ canceled: boolean; absolutePaths: string[] }> {
  const result = await dialog.showOpenDialog({
    defaultPath: projectRoot,
    properties: ['openDirectory'],
    title: 'Add folder to export basket',
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, absolutePaths: [] }
  }

  const absolutePaths: string[] = []
  await collectMarkdownFilesUnderDirectory(result.filePaths[0], absolutePaths)
  return { canceled: false, absolutePaths }
}
