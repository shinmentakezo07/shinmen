import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

/*
  Restyled away from shadcn's rounded defaults: zero radius, mono lettering,
  and a hairline border that the accent floods on hover. The accent is used
  as a *state*, never as decoration.
*/
const button = cva(
  'inline-flex items-center justify-center gap-2 font-mono text-[length:var(--step--1)] uppercase tracking-[0.12em] transition-colors duration-[var(--dur-1)] ease-[var(--ease-out)] disabled:pointer-events-none disabled:opacity-40 select-none',
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
    },
    defaultVariants: { variant: 'outline', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  asChild?: boolean
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(button({ variant, size }), className)} {...props} />
}
