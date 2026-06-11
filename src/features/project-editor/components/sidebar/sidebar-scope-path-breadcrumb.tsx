import { PROJECT_EDITOR_STRINGS } from '../../project-editor-strings'
import { useEditorActions } from '../../project-editor-actions-context.tsx'
import { formatProjectRootBreadcrumbLabel } from './sidebar-panel-logic'
import { SidebarProjectRootContextMenu } from './sidebar-project-root-context-menu.tsx'
import { useSidebarProjectRootContextMenu } from './use-sidebar-project-root-context-menu.ts'

interface SidebarScopePathBreadcrumbProps {
  projectRootPath: string
  disabled: boolean
}

function ScopePathFolderIcon() {
  return (
    <svg
      class="path-breadcrumb-trigger__icon"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.9"
      aria-hidden="true"
    >
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4H10l2 2h6.5A2.5 2.5 0 0 1 21 8.5V17a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V6.5Z" />
    </svg>
  )
}

export function SidebarScopePathBreadcrumb({
  projectRootPath,
  disabled,
}: SidebarScopePathBreadcrumbProps) {
  const { pickProjectFolder } = useEditorActions()
  const hasProject = Boolean(projectRootPath.trim())
  const label = hasProject ? formatProjectRootBreadcrumbLabel(projectRootPath) : PROJECT_EDITOR_STRINGS.noFolderSelected
  const contextMenu = useSidebarProjectRootContextMenu({ hasProject })

  return (
    <>
      <button
        type="button"
        class={`path-breadcrumb-trigger${hasProject ? '' : ' path-breadcrumb-trigger--empty'}`}
        onClick={() => {
          void pickProjectFolder()
        }}
        onContextMenu={contextMenu.handleContextMenu}
        disabled={disabled}
        title={hasProject ? label : PROJECT_EDITOR_STRINGS.noFolderSelected}
        aria-label={PROJECT_EDITOR_STRINGS.selectProjectFolderAria}
        aria-haspopup="menu"
      >
        <ScopePathFolderIcon />
        {hasProject ? (
          <span class="path-breadcrumb-trigger__label" dir="rtl">
            <span class="path-breadcrumb-trigger__label-text" dir="ltr">
              {label}
            </span>
          </span>
        ) : (
          <span class="path-breadcrumb-trigger__label">{label}</span>
        )}
      </button>
      <SidebarProjectRootContextMenu
        isOpen={Boolean(contextMenu.contextMenuPosition)}
        position={contextMenu.contextMenuPosition}
        hasProject={hasProject}
        onSelectProject={contextMenu.handleSelectProject}
        onRevealInFileManager={contextMenu.handleRevealInFileManager}
        onCloseProject={contextMenu.handleCloseProject}
        onDismiss={contextMenu.closeContextMenu}
      />
    </>
  )
}
