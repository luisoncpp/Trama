// @Architecture(descriptionShort="Private implementation detail for parent module")
import type { HeadingRevealTarget } from '../../project-editor-types'
import type { PaneWorkspace } from '../../pane'

export function revealDocumentHeading(target: HeadingRevealTarget, workspace: PaneWorkspace): void {
  workspace.revealHeadingInPane(workspace.layout.activePane, target)
}
