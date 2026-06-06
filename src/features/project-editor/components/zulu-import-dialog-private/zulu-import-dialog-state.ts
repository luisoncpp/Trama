import { useState } from 'preact/hooks'
import type { ZuluTagMode, ZuluImportPreviewResponse, ZuluSelectFileResponse } from '../../../../shared/ipc'

export function useZuluImportDialogState() {
  const [fileData, setFileData] = useState<ZuluSelectFileResponse | null>(null)
  const [targetFolder, setTargetFolder] = useState('lore/')
  const [tagMode, setTagMode] = useState<ZuluTagMode>('none')
  const [preview, setPreview] = useState<ZuluImportPreviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [selectingFile, setSelectingFile] = useState(false)
  return { fileData, setFileData, targetFolder, setTargetFolder, tagMode, setTagMode, preview, setPreview, loading, setLoading, importing, setImporting, selectingFile, setSelectingFile }
}
