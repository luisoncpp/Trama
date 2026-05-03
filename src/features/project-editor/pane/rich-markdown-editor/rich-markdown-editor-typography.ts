import Quill from 'quill'
import Delta from 'quill-delta'

interface TypographyRule {
  pattern: string
  replacement: string
}

const RULES: TypographyRule[] = [
  { pattern: '--', replacement: '\u2014' },
  { pattern: '<<', replacement: '\u00ab' },
  { pattern: '>>', replacement: '\u00bb' },
]

type TextChangeDelta = { ops?: Array<{ retain?: number; insert?: unknown }> }

function getInsertIndex(delta: TextChangeDelta): number | null {
  const ops = delta.ops ?? []
  if (ops.length === 1) {
    const [op] = ops
    if (typeof op.insert === 'string' && op.insert.length === 1) {
      return 0
    }
  }
  if (ops.length === 2) {
    const [retainOp, insertOp] = ops
    if (
      typeof retainOp.retain === 'number' &&
      typeof insertOp.insert === 'string' &&
      insertOp.insert.length === 1
    ) {
      return retainOp.retain
    }
  }
  return null
}

export function registerTypographyHandler(editor: Quill): void {
  let replacing = false

  editor.on('text-change', (delta, _old, source) => {
    if (source !== 'user' || replacing) return

    const index = getInsertIndex(delta as TextChangeDelta)
    if (index === null || index < 1) return

    const two = editor.getText(index - 1, 2)
    const rule = RULES.find(r => r.pattern === two)
    if (!rule) return

    replacing = true
    try {
      editor.history.cutoff()
      editor.updateContents(
        new Delta().retain(index - 1).delete(2).insert(rule.replacement),
        'user',
      )
      editor.history.cutoff()
    } finally {
      replacing = false
    }
  })
}
