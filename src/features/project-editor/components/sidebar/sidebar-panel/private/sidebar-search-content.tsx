// @Architecture(descriptionShort="Global markdown search section body")
import { useEditorActions } from '../../../../project-editor-actions-context.tsx'
import { useSidebarState } from '../../sidebar-state-context.tsx'
import { useGlobalSearchController, type GlobalSearchController } from '../../../../global-search/index.ts'

function resultTitle(path: string): string {
  const fileName = path.split('/').pop() ?? path
  return fileName.replace(/\.md$/i, '')
}

function SearchOptionToggle({ pressed, title, label, onToggle }: {
  pressed: boolean
  title: string
  label: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      class={`sidebar-search__option ${pressed ? 'is-active' : ''}`}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      onClick={onToggle}
    >
      {label}
    </button>
  )
}

function SearchControls({ search, disabled }: { search: GlobalSearchController; disabled: boolean }) {
  return (
    <form
      class="sidebar-search__controls"
      onSubmit={(event) => {
        event.preventDefault()
        void search.runSearch()
      }}
    >
      <div class="sidebar-search__query-row">
        <input
          type="text"
          class="sidebar-search__input"
          placeholder="Search in project..."
          value={search.query}
          disabled={disabled}
          onInput={(event) => search.setQuery((event.currentTarget as HTMLInputElement).value)}
          aria-label="Search across project documents"
        />
        <SearchOptionToggle
          pressed={search.caseSensitive}
          title="Match case"
          label="Aa"
          onToggle={search.toggleCaseSensitive}
        />
        <SearchOptionToggle
          pressed={search.wholeWord}
          title="Match whole word"
          label="[ab]"
          onToggle={search.toggleWholeWord}
        />
      </div>
      <button
        type="submit"
        class="editor-button editor-button--secondary sidebar-search__submit"
        disabled={disabled || search.searching || !search.query.trim()}
      >
        {search.searching ? 'Searching...' : 'Search'}
      </button>
    </form>
  )
}

function SearchStatus({ search }: { search: GlobalSearchController }) {
  if (search.errorMessage) {
    return <p class="sidebar-search__status sidebar-search__status--error">{search.errorMessage}</p>
  }
  if (search.executedQuery === null) {
    return null
  }
  if (search.results.length === 0) {
    return <p class="sidebar-search__status">No documents contain “{search.executedQuery}”.</p>
  }

  const totalMatches = search.results.reduce((sum, file) => sum + file.matchCount, 0)
  return (
    <p class="sidebar-search__status" aria-live="polite">
      {totalMatches} {totalMatches === 1 ? 'match' : 'matches'} in {search.results.length}{' '}
      {search.results.length === 1 ? 'document' : 'documents'}
    </p>
  )
}

function SearchResultList({ search }: { search: GlobalSearchController }) {
  if (search.results.length === 0) {
    return null
  }

  return (
    <ul class="sidebar-search__results">
      {search.results.map((file) => (
        <li key={file.path}>
          <button
            type="button"
            class="sidebar-search__result"
            title={file.path}
            onClick={() => search.openResult(file.path)}
          >
            <span class="sidebar-search__result-title">{resultTitle(file.path)}</span>
            <span class="sidebar-search__result-path">{file.path}</span>
            <span class="sidebar-search__result-count">{file.matchCount}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function SidebarSearchContent() {
  const { selectFile } = useEditorActions()
  const { loadingProject, apiAvailable } = useSidebarState()
  const search = useGlobalSearchController({ selectFile })
  const disabled = loadingProject || !apiAvailable

  return (
    <div class="sidebar-panel-content">
      <aside class="workspace-panel workspace-panel--sidebar">
        <div class="workspace-panel__header">
          <div>
            <p class="workspace-panel__eyebrow">Global search</p>
          </div>
        </div>
        <SearchControls search={search} disabled={disabled} />
        <SearchStatus search={search} />
        <SearchResultList search={search} />
      </aside>
    </div>
  )
}
