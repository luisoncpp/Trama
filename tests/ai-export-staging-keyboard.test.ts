import { describe, expect, it } from 'vitest'
import { handleStagingBasketKeyDown } from '../src/features/project-editor/components/ai-export-staging'

function keyEvent(key: string): KeyboardEvent {
  return { key, preventDefault: () => undefined } as KeyboardEvent
}

describe('ai-export-staging basket keyboard', () => {
  it('moves focus with arrow keys', () => {
    const right = handleStagingBasketKeyDown(keyEvent('ArrowRight'), 0, 3)
    expect(right.focusedIndex).toBe(1)
    expect(right.removeIndex).toBeNull()

    const left = handleStagingBasketKeyDown(keyEvent('ArrowLeft'), 0, 3)
    expect(left.focusedIndex).toBe(2)
  })

  it('removes the focused chip on Backspace', () => {
    const result = handleStagingBasketKeyDown(keyEvent('Backspace'), 1, 3)
    expect(result.removeIndex).toBe(1)
    expect(result.focusedIndex).toBe(1)
  })
})
