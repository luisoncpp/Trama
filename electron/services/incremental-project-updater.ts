import type { TreeItem, DocumentMeta } from '../../src/shared/ipc.js'
import { DocumentRepository } from './document-repository.js'
import {
  deepCloneTree, removeFolderFromTree, removeFileFromTree,
  renameFolderInTree, renameFileInTree, ensureFolderInTree, addFileToTree,
} from './tree-mutations.js'

const documentRepository = new DocumentRepository()

export interface IncrementalChanges {
  createdFiles?: string[]
  deletedFiles?: string[]
  renamedFiles?: { from?: string; to?: string }[]
  createdFolders?: string[]
  deletedFolders?: string[]
  renamedFolders?: { from?: string; to?: string }[]
}

export interface CachedProjectState {
  tree: TreeItem[]
  markdownFiles: string[]
  metaByPath: Record<string, DocumentMeta>
}

function applyFolderDeletions(
  cache: CachedProjectState,
  changes: IncrementalChanges,
) {
  let { markdownFiles, metaByPath, tree } = cache
  if (!changes.deletedFolders) return { markdownFiles, metaByPath, tree }
  for (const folderPath of changes.deletedFolders) {
    const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`
    markdownFiles = markdownFiles.filter((f) => !f.startsWith(prefix))
    for (const filePath of Object.keys(metaByPath)) {
      if (filePath.startsWith(prefix)) delete metaByPath[filePath]
    }
    tree = removeFolderFromTree(tree, folderPath)
  }
  return { markdownFiles, metaByPath, tree }
}

function applyFileDeletions(state: { markdownFiles: string[]; metaByPath: Record<string, DocumentMeta>; tree: TreeItem[] }, changes: { deletedFiles?: string[] }) {
  if (!changes.deletedFiles) return state
  let { markdownFiles, metaByPath, tree } = state
  for (const filePath of changes.deletedFiles) {
    markdownFiles = markdownFiles.filter((f) => f !== filePath)
    delete metaByPath[filePath]
    tree = removeFileFromTree(tree, filePath)
  }
  return { markdownFiles, metaByPath, tree }
}

function applyFolderRenames(state: { markdownFiles: string[]; metaByPath: Record<string, DocumentMeta>; tree: TreeItem[] }, changes: { renamedFolders?: { from?: string; to?: string }[] }) {
  if (!changes.renamedFolders) return state
  let { markdownFiles, metaByPath, tree } = state
  for (const r of changes.renamedFolders) {
    if (!r.from || !r.to) continue
    const op = r.from, np = r.to
    const oPre = op.endsWith('/') ? op : `${op}/`
    const nPre = np.endsWith('/') ? np : `${np}/`
    markdownFiles = markdownFiles.map((f) => f.startsWith(oPre) ? `${nPre}${f.slice(oPre.length)}` : f)
    const updatedMeta: Record<string, DocumentMeta> = {}
    for (const [k, v] of Object.entries(metaByPath)) {
      updatedMeta[k.startsWith(oPre) ? `${nPre}${k.slice(oPre.length)}` : k] = v
    }
    metaByPath = updatedMeta
    tree = renameFolderInTree(tree, op, np)
  }
  return { markdownFiles, metaByPath, tree }
}

function applyFileRenames(state: { markdownFiles: string[]; metaByPath: Record<string, DocumentMeta>; tree: TreeItem[] }, changes: { renamedFiles?: { from?: string; to?: string }[] }) {
  if (!changes.renamedFiles) return state
  let { markdownFiles, metaByPath, tree } = state
  for (const r of changes.renamedFiles) {
    if (!r.from || !r.to) continue
    markdownFiles = markdownFiles.map((f) => (f === r.from! ? r.to! : f))
    if (metaByPath[r.from!] !== undefined) { metaByPath[r.to!] = metaByPath[r.from!]; delete metaByPath[r.from!] }
    tree = renameFileInTree(tree, r.from, r.to)
  }
  return { markdownFiles, metaByPath, tree }
}

function applyFolderCreations(tree: TreeItem[], changes: { createdFolders?: string[] }): TreeItem[] {
  if (!changes.createdFolders) return tree
  for (const p of changes.createdFolders) tree = ensureFolderInTree(tree, p)
  return tree
}

async function applyFileCreations(
  markdownFiles: string[],
  metaByPath: Record<string, DocumentMeta>,
  tree: TreeItem[],
  changes: { createdFiles?: string[] },
  projectRoot: string,
): Promise<{ markdownFiles: string[]; metaByPath: Record<string, DocumentMeta>; tree: TreeItem[] }> {
  if (!changes.createdFiles) return { markdownFiles, metaByPath, tree }
  for (const filePath of changes.createdFiles) {
    if (!markdownFiles.includes(filePath)) markdownFiles.push(filePath)
    try { metaByPath[filePath] = (await documentRepository.readDocument(projectRoot, filePath)).meta }
    catch { metaByPath[filePath] = {} }
    tree = addFileToTree(tree, filePath)
  }
  return { markdownFiles, metaByPath, tree }
}

export async function applyIncrementalUpdate(
  cache: CachedProjectState,
  changes: IncrementalChanges,
  projectRoot: string,
): Promise<CachedProjectState> {
  let { markdownFiles, metaByPath, tree } = { markdownFiles: [...cache.markdownFiles], metaByPath: { ...cache.metaByPath }, tree: deepCloneTree(cache.tree) }

  let state = applyFolderDeletions({ markdownFiles, metaByPath, tree }, changes)
  state = applyFileDeletions(state, changes)
  state = applyFolderRenames(state, changes)
  state = applyFileRenames(state, changes)
  tree = applyFolderCreations(state.tree, changes)
  const result = await applyFileCreations(state.markdownFiles, state.metaByPath, tree, changes, projectRoot)
  markdownFiles = result.markdownFiles.sort((a, b) => a.localeCompare(b, 'es'))
  return { tree: result.tree, markdownFiles, metaByPath: result.metaByPath }
}
