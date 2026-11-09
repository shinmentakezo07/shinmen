import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

/*
  Restyled away from shadcn's rounded defaults: zero radius, mono lettering,
  and a hairline border that the accent floods on hover. The accent is used
  as a *state*, never as decoration.

  The fill modifier is the site's one primary-button gesture — vermilion
  sweeping in from the left, label inverting — so a button that starts the
  next action looks the same in the hero, the contact section, and anywhere
  else. It lives here rather than in a second CSS block: one primitive, one
  place to change it.
*/
const button = cva(
  'relative isolate inline-flex select-none items-center justify-center gap-2 overflow-hidden font-mono text-[length:var(--step--1)] uppercase tracking-[0.12em] transition-colors duration-[var(--dur-1)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-40',
  {
    variants: {
      variant: {
        solid: 'bg-fg text-bg hover:bg-accent hover:text-accent-ink',
        outline:
          'border border-line-strong text-fg hover:border-accent hover:text-accent',
        ghost: 'text-fg-muted hover:text-fg',
        accent: 'bg-accent text-accent-ink hover:bg-fg hover:text-bg',
      },
      size: {
        sm: 'h-8 px-3',
        md: 'h-11 px-5',
        lg: 'h-[3.25rem] px-7',
      },
      fill: {
        true: 'cta-fill',
      },
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean
}

export function Button({ className, variant, size, fill, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(button({ variant, size, fill }), className)} {...props} />
}
