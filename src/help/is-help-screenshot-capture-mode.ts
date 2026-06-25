// @Architecture(descriptionShort="Guard predicate for screenshot capture mode detection")
export function isHelpScreenshotCaptureMode(): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  return window.tramaCaptureMode?.helpScreenshots === true
}
