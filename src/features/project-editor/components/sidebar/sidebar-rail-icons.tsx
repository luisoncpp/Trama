import type { JSX } from 'preact'

function IconWrapper({ children }: { children: JSX.Element }): JSX.Element {
  return <span class="sidebar-rail__icon">{children}</span>
}

export function ManuscriptIcon(): JSX.Element {
  return (
    <IconWrapper>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M6 4.5h8.5a3.5 3.5 0 0 1 3.5 3.5v10.5H9.5A3.5 3.5 0 0 0 6 22V4.5Z" />
        <path d="M6 4.5V22" />
        <path d="M10 9h5" />
        <path d="M10 12h5" />
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path d="M12 3 4 7v5c0 4.8 3.2 8.7 8 9.9 4.8-1.2 8-5.1 8-9.9V7l-8-4Z" />
        <path d="m9.5 12 1.8 1.8L14.8 10" />
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