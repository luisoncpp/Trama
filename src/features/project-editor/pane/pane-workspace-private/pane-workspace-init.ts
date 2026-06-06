import type { PaneNavigationHistoryStore } from '../../project-editor-types'
import { getEmptyNavigationHistory } from '../pane-navigation-state'

function createDefaultNavigationStore(): PaneNavigationHistoryStore {
  return {
    primary: getEmptyNavigationHistory(),
    secondary: getEmptyNavigationHistory(),
  }
}

export function resolveConstructorDeps(
  navigationHistoryOrSavedContent?: PaneNavigationHistoryStore | Map<string, string>,
  savedContentMap?: Map<string, string>,
): { navHistory: PaneNavigationHistoryStore; savedContentMap: Map<string, string> | undefined } {
  const isSavedContentMap = navigationHistoryOrSavedContent instanceof Map
  return {
    navHistory: isSavedContentMap
      ? createDefaultNavigationStore()
      : (navigationHistoryOrSavedContent ?? createDefaultNavigationStore()),
    savedContentMap: isSavedContentMap ? navigationHistoryOrSavedContent : savedContentMap,
  }
}
