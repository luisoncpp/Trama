import { useEffect, useState } from 'preact/hooks'
import type { SidebarSection } from './project-editor-types'

const SIDEBAR_UI_STORAGE_KEY = 'trama.sidebar.ui.v1'
const SIDEBAR_MIN_WIDTH = 260
const SIDEBAR_MAX_WIDTH = 460

interface PersistedSidebarUiState {
  activeSection: SidebarSection
  panelCollapsed: boolean
  panelWidth: number
}

function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width))
}

function readSidebarUiState(): PersistedSidebarUiState {
  const fallback: PersistedSidebarUiState = {
    activeSection: 'explorer',
    panelCollapsed: false,
    panelWidth: 300,
  }

  try {
    const raw = window.localStorage.getItem(SIDEBAR_UI_STORAGE_KEY)
    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw) as Partial<PersistedSidebarUiState>
    const activeSection =
      parsed.activeSection === 'explorer' ||
      parsed.activeSection === 'outline' ||
      parsed.activeSection === 'lore' ||
      parsed.activeSection === 'settings'
        ? parsed.activeSection
        : fallback.activeSection

    return {
      activeSection,
      panelCollapsed: typeof parsed.panelCollapsed === 'boolean' ? parsed.panelCollapsed : fallback.panelCollapsed,
      panelWidth: Number.isFinite(parsed.panelWidth) ? clampSidebarWidth(parsed.panelWidth as number) : fallback.panelWidth,
    }
  } catch {
    return fallback
  }
}

export interface SidebarUiStateValues {
  activeSection: SidebarSection
  panelCollapsed: boolean
  panelWidth: number
}

export interface SidebarUiStateSetters {
  setActiveSection: (section: SidebarSection) => void
  setPanelCollapsed: (collapsed: boolean) => void
  setPanelWidth: (width: number) => void
}

export function useSidebarUiState(): { values: SidebarUiStateValues; setters: SidebarUiStateSetters } {
  const [activeSection, setActiveSection] = useState<SidebarSection>(() => readSidebarUiState().activeSection)
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(() => readSidebarUiState().panelCollapsed)
  const [panelWidth, setPanelWidth] = useState<number>(() => readSidebarUiState().panelWidth)

  useEffect(() => {
    const persisted: PersistedSidebarUiState = {
      activeSection,
      panelCollapsed,
      panelWidth: clampSidebarWidth(panelWidth),
    }

    try {
      window.localStorage.setItem(SIDEBAR_UI_STORAGE_KEY, JSON.stringify(persisted))
    } catch {
      // Ignore persistence errors and continue with in-memory state.
    }
  }, [activeSection, panelCollapsed, panelWidth])

  return {
    values: {
      activeSection,
      panelCollapsed,
      panelWidth,
    },
    setters: {
      setActiveSection,
      setPanelCollapsed,
      setPanelWidth: (width: number) => setPanelWidth(clampSidebarWidth(width)),
    },
  }
}
