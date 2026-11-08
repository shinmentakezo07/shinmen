import { useEffect } from 'react'

/**
 * Owns ⌘K / Ctrl-K for the whole document — exactly once.
 *
 * Three rules that the site previously got wrong when the listener was inline
 * in App:
 *   · Keyed off `event.code === 'KeyK'`, so it survives non-Latin layouts
 *     where `key` is a local letter.
 *   · Ignored while an IME is composing (⌘K in a Japanese/Chinese input would
 *     otherwise swallow the keystroke) and when Alt is involved.
 *   · The listener can be attached *after first mount* (the palette chunk is
 *     lazy), so a first ⌘K is not lost while the chunk is still loading.
 */
export function isCommandShortcut(e: KeyboardEvent) {
  return (
    (e.metaKey || e.ctrlKey) &&
    !e.altKey &&
    !e.shiftKey &&
    !e.isComposing &&
    (e.code === 'KeyK' || e.key.toLowerCase() === 'k')
  )
}

export function useCommandShortcut(onTrigger: () => void, active = true) {
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (!isCommandShortcut(e)) return
      e.preventDefault()
      onTrigger()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onTrigger, active])
}
