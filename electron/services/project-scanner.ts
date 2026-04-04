import path from 'node:path'
import { readdir } from 'node:fs/promises'
import type { TreeItem } from '../../src/shared/ipc.js'

const IGNORED_DIRECTORIES = new Set([
  '.git',
  'node_modules',
  'Assets',
  'dist',
  'dist-electron',
])

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}

async function scanDirectory(
  projectRoot: string,
  relativeDir: string,
  markdownFiles: string[],
): Promise<TreeItem[]> {
  const absoluteDir = path.resolve(projectRoot, relativeDir)
  const entries = await readdir(absoluteDir, { withFileTypes: true })

  const directories = entries
    .filter((entry) => entry.isDirectory() && !IGNORED_DIRECTORIES.has(entry.name))
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.md'))
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))

  const result: TreeItem[] = []

  for (const directory of directories) {
    const childRelative = relativeDir ? path.join(relativeDir, directory.name) : directory.name
    const children = await scanDirectory(projectRoot, childRelative, markdownFiles)

    if (children.length > 0) {
      result.push({
        id: toPosix(childRelative),
        title: directory.name,
        path: toPosix(childRelative),
        type: 'folder',
        children,
      })
    }
  }

  for (const file of files) {
    const fileRelative = relativeDir ? path.join(relativeDir, file.name) : file.name
    const normalizedPath = toPosix(fileRelative)

    markdownFiles.push(normalizedPath)
    result.push({
      id: normalizedPath,
      title: file.name.replace(/\.md$/i, ''),
      path: normalizedPath,
      type: 'file',
    })
  }

  return result
}

export async function scanProject(projectRoot: string): Promise<{ tree: TreeItem[]; markdownFiles: string[] }> {
  const markdownFiles: string[] = []
  const tree = await scanDirectory(projectRoot, '', markdownFiles)

  return {
    tree,
    markdownFiles: markdownFiles.sort((left, right) => left.localeCompare(right, 'es')),
  }
}
