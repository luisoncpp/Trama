import type Quill from 'quill'

const CENTERED_CONTENT_CLASS = 'trama-centered-content'

function isCenterBoundary(node: Element): boolean {
  return node.classList.contains('trama-center-boundary')
}

function isLayoutDirective(node: Element): boolean {
  return node.classList.contains('trama-layout-directive')
}

function isCenterStartBoundary(node: Element): boolean {
  return node.getAttribute('data-trama-role') === 'start'
}

function isCenterEndBoundary(node: Element): boolean {
  return node.getAttribute('data-trama-role') === 'end'
}

export function syncCenteredLayoutArtifacts(editor: Quill): void {
  const blocks = Array.from(editor.root.children)
  let isCentered = false

  for (const block of blocks) {
    if (!(block instanceof Element)) {
      continue
    }

    if (isCenterBoundary(block)) {
      if (isCenterStartBoundary(block)) isCentered = true
      if (isCenterEndBoundary(block)) isCentered = false
      continue
    }

    if (isLayoutDirective(block)) {
      block.classList.remove(CENTERED_CONTENT_CLASS)
      continue
    }

    if (isCentered) {
      block.classList.add(CENTERED_CONTENT_CLASS)
    } else {
      block.classList.remove(CENTERED_CONTENT_CLASS)
    }
  }
}
