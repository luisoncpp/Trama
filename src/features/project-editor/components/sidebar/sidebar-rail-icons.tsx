import type { JSX } from 'preact'

function IconWrapper({ children }: { children: JSX.Element }): JSX.Element {
  return <span class="sidebar-rail__icon">{children}</span>
}

export function ManuscriptIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        <path d="M6 8h2" />
        <path d="M6 12h2" />
        <path d="M16 8h2" />
        <path d="M16 12h2" />
      </svg>
    </IconWrapper>
  )
}

export function OutlineIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="7" cy="7" r="1.5" />
        <circle cx="7" cy="12" r="1.5" />
        <circle cx="7" cy="17" r="1.5" />
        <path d="M10 7h7" />
        <path d="M10 12h7" />
        <path d="M10 17h7" />
      </svg>
    </IconWrapper>
  )
}

export function LoreIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 12h-5" />
        <path d="M15 8h-5" />
        <path d="M19 17V5a2 2 0 0 0-2-2H4" />
        <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
      </svg>
    </IconWrapper>
  )
}

export function TransferIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M7 7h11" />
        <path d="m15 4 3 3-3 3" />
        <path d="M17 17H6" />
        <path d="m9 14-3 3 3 3" />
      </svg>
    </IconWrapper>
  )
}

export function SettingsIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.8 1.8 0 0 1-2.5 2.5l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1.8 1.8 0 0 1-3.6 0v-.1a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a1.8 1.8 0 0 1-2.5-2.5l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1.8 1.8 0 0 1 0-3.6h.1a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a1.8 1.8 0 0 1 2.5-2.5l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1.8 1.8 0 0 1 3.6 0v.1a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a1.8 1.8 0 0 1 2.5 2.5l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a1.8 1.8 0 0 1 0 3.6h-.1a1 1 0 0 0-.9.6Z" />
      </svg>
    </IconWrapper>
  )
}

export function CollapseLeftIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m11 17-5-5 5-5" />
        <path d="m18 17-5-5 5-5" />
      </svg>
    </IconWrapper>
  )
}

export function HelpIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <path d="M12 17h.01" />
      </svg>
    </IconWrapper>
  )
}

export function ExpandRightIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m6 17 5-5-5-5" />
        <path d="m13 17 5-5-5-5" />
      </svg>
    </IconWrapper>
  )
}
