import { describe, expect, it } from 'vitest'
import type { ProjectIndex, TreeItem } from '../src/shared/ipc'
import { orderBookFilesByIndex } from '../electron/services/book-export-order'

function createIndex(partial?: Partial<ProjectIndex>): ProjectIndex {
  return {
    version: '1.0.0',
    corkboardOrder: {},
    cache: {},
    ...partial,
  }
}

describe('book export order', () => {
  it('uses base tree order when there is no explicit corkboard order', () => {
    const tree: TreeItem[] = [
      {
        id: 'book',
        title: 'book',
        path: 'book',
        type: 'folder',
        children: [
          { id: 'book/02.md', title: '02', path: 'book/02.md', type: 'file' },
          { id: 'book/01.md', title: '01', path: 'book/01.md', type: 'file' },
        ],
      },
    ]

    const ordered = orderBookFilesByIndex(tree, createIndex())
    expect(ordered).toEqual(['book/02.md', 'book/01.md'])
  })

  it('applies corkboardOrder per folder and keeps missing ids at the end', () => {
    const tree: TreeItem[] = [
      {
        id: 'book',
        title: 'book',
        path: 'book',
        type: 'folder',
        children: [
          { id: 'book/01.md', title: '01', path: 'book/01.md', type: 'file' },
          { id: 'book/02.md', title: '02', path: 'book/02.md', type: 'file' },
          { id: 'book/03.md', title: '03', path: 'book/03.md', type: 'file' },
        ],
      },
    ]

    const index = createIndex({
      corkboardOrder: {
        book: ['scene-2', 'scene-1'],
      },
      cache: {
        'book/01.md': { id: 'scene-1' },
        'book/02.md': { id: 'scene-2' },
        'book/03.md': { id: 'scene-3' },
      },
    })

    const ordered = orderBookFilesByIndex(tree, index)
    expect(ordered).toEqual(['book/02.md', 'book/01.md', 'book/03.md'])
  })

  it('ignores files outside book folder', () => {
    const tree: TreeItem[] = [
      { id: 'lore/one.md', title: 'one', path: 'lore/one.md', type: 'file' },
      { id: 'book/one.md', title: 'one', path: 'book/one.md', type: 'file' },
      { id: 'outline/one.md', title: 'one', path: 'outline/one.md', type: 'file' },
    ]

    const ordered = orderBookFilesByIndex(tree, createIndex())
    expect(ordered).toEqual(['book/one.md'])
  })
})
