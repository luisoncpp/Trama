import {
  hydrateBrokenImageComments,
  renderBrokenImageCommentsAsHtml,
} from '../../../../shared/markdown-image-placeholder'

export function preserveBrokenOnSerialize(markdown: string): string {
  return markdown
}

export function expandBrokenForSave(markdown: string): string {
  return hydrateBrokenImageComments(markdown)
}

export function renderBrokenForEditor(markdown: string): string {
  return renderBrokenImageCommentsAsHtml(markdown)
}
