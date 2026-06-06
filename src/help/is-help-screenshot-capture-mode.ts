export function isHelpScreenshotCaptureMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.tramaCaptureMode?.helpScreenshots === true
}
