// @Architecture(descriptionShort="Private implementation detail for parent module")
import type { DocumentContentsLabelTarget, HeadingRevealTarget } from '../../project-editor-types'
import type { PaneWorkspace } from '../../pane'

export function revealDocumentHeading(target: HeadingRevealTarget, workspace: PaneWorkspace): void {
  workspace.revealHeadingInPane(workspace.layout.activePane, target)
}

export function setDocumentContentsLabel(target: DocumentContentsLabelTarget, workspace: PaneWorkspace): void {
  workspace.setLayoutDirectiveLabelInPane(workspace.layout.activePane, target)
}
