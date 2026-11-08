import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useTransitionState } from './machine'

/*
  ── Appearance: an explicit two-source state machine ───────────────────────

    source = 'system'  → theme mirrors prefers-color-scheme, kept in step live.
    source = 'user'    → theme is pinned; OS changes are ignored.
    toggle / set()     → always land in 'user' (an explicit choice is sticky).
    reset()            → hands control back to 'system'.

  Why a machine and not a boolean: the old code encoded "has the user chosen?"
  by re-reading localStorage inside the media listener — so the answer lived in
  storage, not in React, and a reset could never be expressed. Now the state
  is the truth, storage is a mirror, and index.html seeds the first paint from
  the same two facts (saved choice — else OS).
*/

export type Theme = 'light' | 'dark'
export type ThemeSource = 'system' | 'user'

export interface ThemeState {
  theme: Theme
  source: ThemeSource
}

export type ThemeEvent =
  | { type: 'system'; dark: boolean }
  | { type: 'toggle' }
  | { type: 'set'; theme: Theme }
  | { type: 'reset' }

/** Pure, total, and exhaustively checked: every event from every state. */
export function themeReducer(state: ThemeState, event: ThemeEvent): ThemeState {
  switch (event.type) {
    case 'system':
      // The OS only matters while it has the floor.
      return state.source === 'system'
        ? { theme: event.dark ? 'dark' : 'light', source: 'system' }
        : state
    case 'toggle':
      return { theme: state.theme === 'light' ? 'dark' : 'light', source: 'user' }
    case 'set':
      return { theme: event.theme, source: 'user' }
    case 'reset':
      return { theme: prefersDark() ? 'dark' : 'light', source: 'system' }
    default: {
      const unhandled: never = event
      return unhandled
    }
  }
}

interface ThemeContextValue extends ThemeState {
  toggle: () => void
  set: (t: Theme) => void
  reset: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
export const STORAGE_KEY = 'rk-theme'

/** Storage is read after mount so render stays pure and SSR-safe. */
function readSavedSource(): ThemeSource {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? 'user' : 'system'
  } catch {
    return 'system'
  }
}

function prefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function readInitial(): ThemeState {
  if (typeof document === 'undefined') return { theme: 'light', source: 'system' }
  const attr = document.documentElement.dataset.theme
  return { theme: attr === 'dark' ? 'dark' : 'light', source: readSavedSource() }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // index.html sets the attribute before paint; we only adopt it into state.
  const [state, dispatch] = useTransitionState<ThemeState, ThemeEvent>(readInitial(), themeReducer)
  // The saved choice, as index.html reads it. Tracked separately because a
  // user-chosen colour that happens to equal the OS colour is still 'user'.
  const [pinned, setPinned] = useState(savedIsPinned)

  // Mirror state → document. One place owns the DOM and the meta tags.
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = state.theme
    root.style.colorScheme = state.theme
    // Keep mobile browser chrome on the actual canvas: void black at night.
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute('content', state.theme === 'dark' ? '#000000' : '#F4F1EA')
      meta.removeAttribute('media')
    })
  }, [state.theme])

  // Mirror the *choice* → storage. Only an explicit choice is persisted; going
  // back to 'system' removes the pin so index.html follows the OS next load.
  useEffect(() => {
    if (!pinned) return
    try {
      localStorage.setItem(STORAGE_KEY, state.theme)
    } catch {
      /* private mode — fail quietly */
    }
  }, [state.theme, pinned])

  useEffect(() => {
    if (pinned) return
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [pinned])

  // Follow the OS for as long as it holds the floor. The reducer ignores this
  // while the choice is pinned, so the listener can stay unconditional.
  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => dispatch({ type: 'system', dark: e.matches })
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [dispatch])

  // Two tabs, one choice: a change in another tab lands here too.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      if (e.newValue === 'light' || e.newValue === 'dark') {
        setPinned(true)
        dispatch({ type: 'set', theme: e.newValue })
      } else if (e.newValue === null) {
        setPinned(false)
        dispatch({ type: 'reset' })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dispatch])

  const toggle = useCallback(() => {
    setPinned(true)
    dispatch({ type: 'toggle' })
  }, [dispatch])
  const set = useCallback(
    (t: Theme) => {
      setPinned(true)
      dispatch({ type: 'set', theme: t })
    },
    [dispatch],
  )
  const reset = useCallback(() => {
    setPinned(false)
    dispatch({ type: 'reset' })
  }, [dispatch])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: state.theme,
      source: pinned ? 'user' : 'system',
      toggle,
      set,
      reset,
    }),
    [state.theme, pinned, toggle, set, reset],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/** Has the visitor ever pinned a choice? index.html treats the key the same way. */
function savedIsPinned() {
  return readSavedSource() === 'user'
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
