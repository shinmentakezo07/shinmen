import { Fragment } from 'react'
import { LazyMotion, domAnimation, m, useReducedMotion, type Variants } from 'motion/react'
import { cn } from '@/lib/utils'

/*
  Motion is purposeful: things arrive in reading order and then stop. No
  parallax, no ambient floating, no attention-seeking loops.

  We use `m` + LazyMotion rather than the full `motion` component so only the
  DOM-animation feature set (~5kB gzipped) ships, not the whole engine.
*/

const EASE = [0.16, 1, 0.3, 1] as const

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

/** Wraps a subtree in the lazy feature loader. Mount once near the root. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  )
}

export function Stagger({
  children,
  className,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  as?: 'div' | 'ul'
}) {
  const reduce = useReducedMotion()
  const Comp = m[as]
  if (reduce) return <Comp className={className}>{children}</Comp>
  return (
    <Comp
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-12% 0px' }}
    >
      {children}
    </Comp>
  )
}

export function StaggerItem({
  children,
  className,
  style,
  as = 'div',
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  as?: 'div' | 'li'
}) {
  const reduce = useReducedMotion()
  const Comp = m[as]
  if (reduce) return <Comp className={className} style={style}>{children}</Comp>
  return (
    <Comp className={className} style={style} variants={item}>
      {children}
    </Comp>
  )
}

/**
 * A heading whose words rise into place, one after another. We split on words
 * (not characters) and keep them as live text — selectable and read in order
 * by screen readers — with real spaces between the animated wrappers.
 */
export function RevealHeading({
  text,
  className,
  delay = 0,
}: {
  text: string
  className?: string
  delay?: number
}) {
  const reduce = useReducedMotion()
  const words = text.split(' ')

  if (reduce) return <span className={className}>{text}</span>

  return (
    <span className={cn('inline', className)}>
      {words.map((w, i) => (
        <Fragment key={`${w}-${i}`}>
          <span className="inline-block overflow-hidden align-bottom pb-[0.12em]">
            <m.span
              className="inline-block"
              initial={{ y: '110%' }}
              animate={{ y: 0 }}
              transition={{ duration: 0.75, ease: EASE, delay: delay + i * 0.045 }}
            >
              {w}
            </m.span>
          </span>
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  )
}
