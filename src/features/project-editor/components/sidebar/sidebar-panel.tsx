import type { SidebarSection } from '../../project-editor-types'
import { SidebarRail } from './sidebar-rail'
import { SidebarExplorerContent } from './sidebar-explorer-content'
import { SidebarSettingsContent } from './sidebar-settings-content.tsx'

type ContentSidebarSection = Exclude<SidebarSection, 'settings'>

interface SidebarSectionConfig {
  title: string
  root: string
}

const SIDEBAR_SECTION_CONFIG: Record<ContentSidebarSection, SidebarSectionConfig> = {
  explorer: { title: 'Manuscript', root: 'book/' },
  outline: { title: 'Outline', root: 'outline/' },
  lore: { title: 'Lore', root: 'lore/' },
}

function normalizePath(path: string): string {
  return path.replaceAll('\\', '/')
}

function getScopedFiles(files: string[], sectionRoot: string): string[] {
  return files
    .map(normalizePath)
    .filter((path) => path.startsWith(sectionRoot))
    .map((path) => path.slice(sectionRoot.length))
    .filter((path) => path.length > 0)
}

function getScopedSelectedPath(selectedPath: string | null, sectionRoot: string): string | null {
  if (!selectedPath) {
    return null
  }

  const normalized = normalizePath(selectedPath)
  if (!normalized.startsWith(sectionRoot)) {
    return null
  }

  const scopedPath = normalized.slice(sectionRoot.length)
  return scopedPath.length > 0 ? scopedPath : null
}

function joinProjectPath(rootPath: string, sectionRoot: string): string {
  if (!rootPath) {
    return ''
  }

  return `${rootPath.replace(/[\\/]$/, '')}/${sectionRoot.replace(/\/$/, '')}`
}

interface SidebarPanelProps {
  visibleFiles: string[]
  selectedPath: string | null
  loadingDocument: boolean
  onSelectFile: (filePath: string) => void
  sidebarActiveSection: SidebarSection
  sidebarPanelCollapsed: boolean
  sidebarPanelWidth: number
  onSelectSidebarSection: (section: SidebarSection) => void
  onToggleSidebarPanelCollapsed: () => void
  onSidebarPanelWidthChange: (width: number) => void
  apiAvailable: boolean
  loadingProject: boolean
  rootPath: string
  onPickFolder: () => void
}

export function SidebarPanel({
  visibleFiles,
  selectedPath,
  onSelectFile,
  rootPath,
  sidebarActiveSection,
  sidebarPanelCollapsed,
  sidebarPanelWidth,
  onSelectSidebarSection,
  onToggleSidebarPanelCollapsed,
  onSidebarPanelWidthChange,
  ...props
}: SidebarPanelProps) {
  const isContentSection = sidebarActiveSection !== 'settings'
  const sectionConfig = isContentSection ? SIDEBAR_SECTION_CONFIG[sidebarActiveSection] : null
  const scopedFiles = sectionConfig ? getScopedFiles(visibleFiles, sectionConfig.root) : []
  const scopedSelectedPath = sectionConfig ? getScopedSelectedPath(selectedPath, sectionConfig.root) : null

  return (
    <aside
      class={`sidebar-shell ${sidebarPanelCollapsed ? 'is-collapsed' : ''}`}
      style={{ width: `${sidebarPanelCollapsed ? 72 : sidebarPanelWidth}px` }}
    >
      <SidebarRail
        activeSection={sidebarActiveSection}
        collapsed={sidebarPanelCollapsed}
        onSelectSection={onSelectSidebarSection}
        onToggleCollapsed={onToggleSidebarPanelCollapsed}
      />

      {!sidebarPanelCollapsed && sectionConfig && (
        <SidebarExplorerContent
          {...props}
          title={sectionConfig.title}
          scopePathLabel={joinProjectPath(rootPath, sectionConfig.root)}
          visibleFiles={scopedFiles}
          selectedPath={scopedSelectedPath}
          onSelectFile={(filePath) => onSelectFile(`${sectionConfig.root}${filePath}`)}
        />
      )}

      {!sidebarPanelCollapsed && sidebarActiveSection === 'settings' && (
        <SidebarSettingsContent
          panelWidth={sidebarPanelWidth}
          onPanelWidthChange={onSidebarPanelWidthChange}
        />
      )}
    </aside>
  )
}