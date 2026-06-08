import { useEffect, useRef, useState } from 'preact/hooks'
import { AiExportStagingController } from './ai-export-staging'
import { AiExportStagingChips } from './ai-export-staging-chips'

interface AiExportStagingBasketProps {
  projectRoot: string
  selectedPaths: string[]
  onSelectedPathsChange: (paths: string[]) => void
  exporting: boolean
  setLastError: (message: string | null) => void
  setCopyToastMessage: (message: string | null) => void
}

function useStagingController(props: AiExportStagingBasketProps) {
  const selectedPathsRef = useRef(props.selectedPaths)
  selectedPathsRef.current = props.selectedPaths

  const controllerRef = useRef<AiExportStagingController | null>(null)
  if (!controllerRef.current) {
    controllerRef.current = new AiExportStagingController({
      projectRoot: props.projectRoot,
      getSelectedPaths: () => selectedPathsRef.current,
      setSelectedPaths: props.onSelectedPathsChange,
      feedback: { setLastError: props.setLastError, setCopyToastMessage: props.setCopyToastMessage },
      getExporting: () => props.exporting,
    })
  }

  useEffect(() => {
    controllerRef.current?.setOptions({
      projectRoot: props.projectRoot,
      getSelectedPaths: () => selectedPathsRef.current,
      setSelectedPaths: props.onSelectedPathsChange,
      feedback: { setLastError: props.setLastError, setCopyToastMessage: props.setCopyToastMessage },
      getExporting: () => props.exporting,
    })
  }, [
    props.projectRoot,
    props.onSelectedPathsChange,
    props.exporting,
    props.setLastError,
    props.setCopyToastMessage,
  ])

  return controllerRef.current
}

function AiExportStagingPickerRow({
  controller,
  exporting,
  selectedCount,
  onClearBasket,
}: {
  controller: AiExportStagingController
  exporting: boolean
  selectedCount: number
  onClearBasket: () => void
}) {
  return (
    <div class="ai-export-dialog__picker-row">
      <button
        type="button"
        class="editor-button editor-button--secondary editor-button--inline ai-export-dialog__picker-button"
        onClick={() => void controller.addFiles()}
        disabled={exporting}
      >
        Add Files...
      </button>
      <button
        type="button"
        class="editor-button editor-button--secondary editor-button--inline ai-export-dialog__picker-button"
        onClick={() => void controller.addFolder()}
        disabled={exporting}
      >
        Add Folder...
      </button>
      {selectedCount > 0 && (
        <button type="button" class="ai-export-dialog__clear-basket" onClick={onClearBasket} disabled={exporting}>
          Clear basket
        </button>
      )}
    </div>
  )
}

export function AiExportStagingBasket(props: AiExportStagingBasketProps) {
  const controller = useStagingController(props)
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (focusedIndex !== null && focusedIndex >= props.selectedPaths.length) {
      setFocusedIndex(props.selectedPaths.length === 0 ? null : props.selectedPaths.length - 1)
    }
  }, [props.selectedPaths.length, focusedIndex])

  const handleBasketKeyDown = (event: KeyboardEvent) => {
    const result = controller.handleBasketKeyDown(event, focusedIndex)
    setFocusedIndex(result.focusedIndex)
  }

  const removePath = (index: number) => {
    controller.removePathAt(index)
    setFocusedIndex((current) => {
      if (current === null || props.selectedPaths.length <= 1) {
        return null
      }
      if (index < current) {
        return current - 1
      }
      if (index === current) {
        return Math.min(current, props.selectedPaths.length - 2)
      }
      return current
    })
  }

  return (
    <div class="ai-export-dialog__basket">
      <AiExportStagingPickerRow
        controller={controller}
        exporting={props.exporting}
        selectedCount={props.selectedPaths.length}
        onClearBasket={() => {
          controller.clearBasket()
          setFocusedIndex(null)
        }}
      />
      <AiExportStagingChips
        projectRoot={props.projectRoot}
        selectedPaths={props.selectedPaths}
        exporting={props.exporting}
        focusedIndex={focusedIndex}
        onFocusIndexChange={setFocusedIndex}
        onRemovePath={removePath}
        onKeyDown={handleBasketKeyDown}
      />
    </div>
  )
}
