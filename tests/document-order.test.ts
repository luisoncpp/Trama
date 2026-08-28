import { describe, expect, it } from 'vitest'
import {
  folderKeyFromDocumentPath,
  orderIdentity,
  rankSortByOrder,
  rebuildDocumentOrder,
  reconcileFolderOrder,
  remapDocumentOrder,
} from '../src/shared/document-order'

describe('document order', () => {
  it('derives the folder key from a project-relative document path', () => {
    expect(folderKeyFromDocumentPath('scene.md')).toBe('')
    expect(folderKeyFromDocumentPath('book/01.md')).toBe('book')
    expect(folderKeyFromDocumentPath('book/act-1/scene.md')).toBe('book/act-1')
  })

  it('uses frontmatter id when present and otherwise the path', () => {
    expect(orderIdentity({ id: 'scene-a' }, 'book/01.md')).toBe('scene-a')
    expect(orderIdentity({ id: '  ' }, 'book/01.md')).toBe('book/01.md')
    expect(orderIdentity({}, 'book/01.md')).toBe('book/01.md')
  })

  it('keeps previous identities and appends new ones', () => {
    expect(reconcileFolderOrder(['b', 'a', 'gone'], ['a', 'b', 'c'])).toEqual(['b', 'a', 'c'])
  })

  it('rank-sorts by order list and keeps unranked items in relative order', () => {
    const sorted = rankSortByOrder(
      ['a.md', 'b.md', 'c.md'],
      ['id-b', 'id-a'],
      (path) => (path === 'a.md' ? 'id-a' : path === 'b.md' ? 'id-b' : 'id-c'),
    )
    expect(sorted).toEqual(['b.md', 'a.md', 'c.md'])
  })

  it('remaps folder keys and path identities while leaving frontmatter ids', () => {
    const remapped = remapDocumentOrder(
      {
        'book/old': ['book/old/b.md', 'scene-a', 'book/old/nested/c.md'],
        'book/old/nested': ['book/old/nested/c.md'],
        lore: ['lore/x.md'],
      },
      { renamedFolders: [{ from: 'book/old', to: 'book/new' }] },
    )

    expect(remapped).toEqual({
      'book/new': ['book/new/b.md', 'scene-a', 'book/new/nested/c.md'],
      'book/new/nested': ['book/new/nested/c.md'],
      lore: ['lore/x.md'],
    })
  })

  it('remaps path-valued identities on file rename', () => {
    const remapped = remapDocumentOrder(
      {
        book: ['book/old.md', 'book/keep.md'],
      },
      { renamedFiles: [{ from: 'book/old.md', to: 'book/renamed.md' }] },
    )

    expect(remapped.book).toEqual(['book/renamed.md', 'book/keep.md'])
  })

  it('rebuilds folder lists from current files using previous order', () => {
    expect(
      rebuildDocumentOrder(
        ['book/new/a.md', 'book/new/b.md'],
        {},
        { 'book/new': ['book/new/b.md', 'book/new/a.md'] },
      ),
    ).toEqual({
      'book/new': ['book/new/b.md', 'book/new/a.md'],
    })
  })
})
