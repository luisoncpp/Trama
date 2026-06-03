export type BasketKeyDownResult = {
  focusedIndex: number | null
  removeIndex: number | null
}

export function handleStagingBasketKeyDown(
  event: KeyboardEvent,
  focusedIndex: number | null,
  itemCount: number,
): BasketKeyDownResult {
  if (itemCount === 0) {
    return { focusedIndex: null, removeIndex: null }
  }

  const currentIndex = focusedIndex ?? 0

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    event.preventDefault()
    return {
      focusedIndex: (currentIndex + 1) % itemCount,
      removeIndex: null,
    }
  }

  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    event.preventDefault()
    return {
      focusedIndex: (currentIndex - 1 + itemCount) % itemCount,
      removeIndex: null,
    }
  }

  if (event.key === 'Backspace' || event.key === 'Delete') {
    if (focusedIndex === null) {
      return { focusedIndex: null, removeIndex: null }
    }
    event.preventDefault()
    const nextFocus = itemCount <= 1 ? null : focusedIndex >= itemCount - 1 ? focusedIndex - 1 : focusedIndex
    return {
      focusedIndex: nextFocus,
      removeIndex: focusedIndex,
    }
  }

  return { focusedIndex, removeIndex: null }
}
