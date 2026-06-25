// @Architecture(descriptionShort="Opens a path (folder or file) in the OS file manager via IPC")
export async function revealInFileManager(
  path: string,
  setStatusMessage: (message: string) => void
): Promise<void> {
  if (!path.trim()) {
    return
  }

  if (!window.tramaApi?.revealInFileManager) {
    setStatusMessage('Preload API unavailable. Reopen the app to open the folder.')
    return
  }

  const response = await window.tramaApi.revealInFileManager({ path })
  if (!response.ok) {
    setStatusMessage(`Could not open path: ${response.error.message}`)
    return
  }

  setStatusMessage('Revealed in file explorer.')
}
