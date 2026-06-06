export class PaneAutosave {
  private timer: number | null = null

  schedule(
    delay: number,
    shouldFire: () => boolean,
    onFire: () => void,
  ): void {
    this.cancel()
    this.timer = window.setTimeout(() => {
      this.timer = null
      if (shouldFire()) {
        onFire()
      }
    }, delay)
  }

  cancel(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
      this.timer = null
    }
  }

  destroy(): void {
    this.cancel()
  }
}
