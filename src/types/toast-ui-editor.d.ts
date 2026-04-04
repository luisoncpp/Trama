declare module '@toast-ui/editor' {
  export interface EditorOptions {
    el: HTMLElement
    height?: string
    initialEditType?: 'markdown' | 'wysiwyg'
    previewStyle?: 'tab' | 'vertical'
    initialValue?: string
    usageStatistics?: boolean
    events?: {
      change?: () => void
    }
  }

  export default class Editor {
    constructor(options: EditorOptions)
    destroy(): void
    getMarkdown(): string
    setMarkdown(markdown: string, cursorToEnd?: boolean): void
    disable(): void
    enable(): void
  }
}
