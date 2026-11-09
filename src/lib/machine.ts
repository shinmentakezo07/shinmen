/*
  The site's smallest state machines, made explicit.

  Several widgets here are state machines that were only *implicit*: a boolean
  "copied" flag, an "is the assistant busy" flag, a theme that may or may not be
  following the OS. They worked, but their reachable states and legal
  transitions lived in the head of whoever last edited the component, so every
  new contributor re-derived them, and impossible combinations (copied and
  failed at once; a toast that fires again after unmount) were expressible.

  This module is the shared vocabulary:

    · type State — one union per machine, so illegal states are unrepresentable.
    · transition(s, event) — pure, total, exhaustively checked by `never`. The
      machine exists in a test without a DOM.
    · useTransitionState(s, reduce) — the React binding: ref-stable dispatch,
      no stale closures, no timer leaks.
    · useTransientFlag — the "acted, then quietly reset" machine that copy
      buttons and menus kept re-implementing by hand.
*/

import { useCallback, useEffect, useRef, useState } from 'react'

export type Reducer<S, E> = (state: S, event: E) => S

/*
  ── The view machine ───────────────────────────────────────────────────────
  A disclosure that changes what you are looking at, not just whether you are
  looking. Its invariant is the point: the next pane is always prepared *before*
  the transition, so an answer still in flight cannot be replaced by whichever
  request happens to resolve last.

      browse ──prepare(to)──▶ preparing(to, from = at)
      preparing ──commit──▶ browse(at = to)
      preparing ──miss(to)──▶ browse(at = to)      (§ prepared from cache)
      preparing ──retire(to)──▶ browse(at = null)  (left while in flight)
      browse(at) ──request(to = at)──▶ preparing(to, from = null)

  Events that do not name the pane in flight are ignored, so a stale
  resolution is a no-op rather than a race.

  Leaving a pane has no "open" event at all: retire lands the commit once the
  collapse animation finishes, but the accessor already reports null, because
  the user said "close" and a pane that lingers to animate its exit must not
  read as one that is open.
*/

export interface ViewState<S> {
  /** The pane in flight, if any. */
  to: S | null
  /** What was on screen when it started; null when leaving a pane. */
  from: S | null
}

export type ViewEvent<S> =
  | { type: 'prepare'; to: S; from: S | null }
  | { type: 'commit' }
  | { type: 'miss'; to: S }
  | { type: 'retire'; to: S }

export function viewReducer<S>(state: ViewState<S>, event: ViewEvent<S>): ViewState<S> {
  const idle = !state.to
  switch (event.type) {
    case 'prepare':
      // Already preparing *this* pane: a second prepare is the same fact twice.
      if (state.to === event.to) return state
      return { to: event.to, from: event.from }
    case 'commit':
      return idle ? state : { to: null, from: null }
    case 'miss':
      return state.to === event.to ? { to: null, from: null } : state
    case 'retire':
      return state.to === event.to ? { to: null, from: null } : state
    default: {
      const unhandled: never = event
      return unhandled
    }
  }
}

/** The React binding for a pure reducer: stable dispatch, always current state. */
export function useTransitionState<S, E>(initial: S, reduce: Reducer<S, E>) {
  const [state, setState] = useState<S>(initial)
  // Hooks must not close over the reducer identity: a reducer declared inline
  // is a new function every render, and dispatch would then be new too.
  const ref = useRef(reduce)
  ref.current = reduce
  const dispatch = useCallback((event: E) => setState((s) => ref.current(s, event)), [])
  return [state, dispatch] as const
}

/**
 * A one-shot acknowledgement: idle → active for `holdMs`, then idle again.
 * Re-triggering restarts the hold; leaving the component cancels it, so a
 * "Copied" flag can never fire a setState after unmount.
 *
 * settle() is for the async path — run the work, and only if it succeeds does
 * the flag go active (with any other flag cleared first).
 */
export function useTransientFlag<K extends string>(holdMs: number) {
  const [active, setActive] = useState<K | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const clearTimer = useCallback(() => {
    if (timer.current !== undefined) window.clearTimeout(timer.current)
    timer.current = undefined
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  /** Mark `kind` active for holdMs. Safe to call from an event handler. */
  const flash = useCallback(
    (kind: K) => {
      clearTimer()
      setActive(kind)
      timer.current = window.setTimeout(() => {
        timer.current = undefined
        setActive((current) => (current === kind ? null : current))
      }, holdMs)
    },
    [clearTimer, holdMs],
  )

  /** Flash only when `work` succeeds; a rejection leaves the flag untouched. */
  const settle = useCallback(
    async (kind: K, work: () => Promise<unknown>) => {
      try {
        await work()
      } catch {
        return false
      }
      flash(kind)
      return true
    },
    [flash],
  )

  return { active, flash, settle } as const
}
