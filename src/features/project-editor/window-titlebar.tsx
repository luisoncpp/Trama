export function markOverlayTitleBar() {
  if (typeof navigator === 'undefined') {
    return
  }

  if (/Windows/i.test(navigator.userAgent) && /Electron/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('has-overlay-titlebar')
  }
}

export function WindowTitlebar() {
  if (typeof document === 'undefined' || !document.documentElement.classList.contains('has-overlay-titlebar')) {
    return null
  }

  return (
    <div class="window-titlebar">
      <span class="window-titlebar__title">Trama</span>
    </div>
  )
}
