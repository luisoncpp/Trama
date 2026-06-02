import { marked, type Token } from 'marked'

export interface InlineTextRun {
  text: string
  bold: boolean
  italic: boolean
}

function preprocessInlineInput(text: string): string {
  return text
    .replace(/^#{1,6}\s+/g, '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/<(strong|b)>([\s\S]*?)<\/(strong|b)>/gi, '**$2**')
    .replace(/<(em|i)>([\s\S]*?)<\/(em|i)>/gi, '_$2_')
    .trim()
}

function collectRunsFromTokens(
  tokens: Token[] | undefined,
  bold: boolean,
  italic: boolean,
  runs: InlineTextRun[],
): void {
  if (!tokens) {
    return
  }

  for (const token of tokens) {
    switch (token.type) {
      case 'text':
        if (token.text) {
          runs.push({ text: token.text, bold, italic })
        }
        break
      case 'strong':
        collectRunsFromTokens(token.tokens, true, italic, runs)
        break
      case 'em':
        collectRunsFromTokens(token.tokens, bold, true, runs)
        break
      case 'del':
        collectRunsFromTokens(token.tokens, bold, italic, runs)
        break
      case 'codespan':
        runs.push({ text: token.text, bold, italic })
        break
      case 'link': {
        const linkTokens = token.tokens ?? [{ type: 'text', raw: token.text, text: token.text } as Token]
        collectRunsFromTokens(linkTokens, bold, italic, runs)
        break
      }
      case 'escape':
        if (token.text) {
          runs.push({ text: token.text, bold, italic })
        }
        break
      default:
        if ('tokens' in token && Array.isArray(token.tokens)) {
          collectRunsFromTokens(token.tokens as Token[], bold, italic, runs)
        }
        break
    }
  }
}

function collectRunsFromBlocks(blocks: Token[]): InlineTextRun[] {
  const runs: InlineTextRun[] = []

  for (const block of blocks) {
    if (block.type === 'paragraph' || block.type === 'heading') {
      collectRunsFromTokens(block.tokens, false, false, runs)
      continue
    }

    if (block.type === 'text' && block.text) {
      runs.push({ text: block.text, bold: false, italic: false })
    }
  }

  return runs
}

export function parseInlineMarkdownRuns(text: string): InlineTextRun[] {
  const source = preprocessInlineInput(text)
  if (!source) {
    return []
  }

  return collectRunsFromBlocks(marked.lexer(source))
}

export function stripInlineMarkdown(text: string): string {
  return parseInlineMarkdownRuns(text)
    .map((run) => run.text)
    .join('')
}
