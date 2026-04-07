import Quill from 'quill'

interface SelectionRect extends DOMRect {
	width: number
	height: number
}

export function createUpdateCenteredScroll(
	container: HTMLElement,
	editorRoot: HTMLElement,
	quill: Quill,
	getSelectionRect: () => SelectionRect | null,
): () => void {
	return function updateCenteredScroll() {
		const selection = quill.getSelection()
		if (!selection) {
			editorRoot.style.removeProperty('--focus-extra-top')
			editorRoot.style.removeProperty('--focus-extra-bottom')
			return
		}

		const selectionRect = getSelectionRect()
		if (!selectionRect) {
			return
		}

		const basePad = Math.max(0, Math.round(container.clientHeight / 2 - selectionRect.height / 2))
		editorRoot.style.setProperty('--focus-extra-top', `${basePad}px`)
		editorRoot.style.setProperty('--focus-extra-bottom', `${basePad}px`)

		requestAnimationFrame(() => {
			updateScrollRAF1(container, editorRoot, quill, selectionRect, basePad, getSelectionRect)
		})
	}
}

function updateScrollRAF1(
	container: HTMLElement,
	editorRoot: HTMLElement,
	quill: Quill,
	selectionRect: SelectionRect,
	basePad: number,
	getSelectionRect: () => SelectionRect | null,
): void {
	const refreshedRect = getSelectionRect() ?? selectionRect
	const containerRect = container.getBoundingClientRect()
	let desired =
		container.scrollTop +
		(refreshedRect.top - containerRect.top) -
		(container.clientHeight / 2 - refreshedRect.height / 2)
	let maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)

	if (desired > maxScroll + 1) {
		const extraBottom = Math.ceil(desired - maxScroll) + 16
		editorRoot.style.setProperty('--focus-extra-bottom', `${basePad + extraBottom}px`)
	}

	if (desired < -1) {
		const extraTop = Math.ceil(Math.abs(desired)) + 16
		editorRoot.style.setProperty('--focus-extra-top', `${basePad + extraTop}px`)
	}

	requestAnimationFrame(() => {
		updateScrollRAF2(container, editorRoot, quill, refreshedRect, getSelectionRect)
	})
}

function updateScrollRAF2(
	container: HTMLElement,
	editorRoot: HTMLElement,
	quill: Quill,
	refreshedRect: SelectionRect,
	getSelectionRect: () => SelectionRect | null,
): void {
	const finalRect = getSelectionRect() ?? refreshedRect
	const finalContainerRect = container.getBoundingClientRect()
	const desired =
		container.scrollTop +
		(finalRect.top - finalContainerRect.top) -
		(container.clientHeight / 2 - finalRect.height / 2)
	const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight)
	const target = Math.max(0, Math.min(desired, maxScroll))
	if (Math.abs(container.scrollTop - target) > 1) {
		container.scrollTop = Math.round(target)
	}
}
