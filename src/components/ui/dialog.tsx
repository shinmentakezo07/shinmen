import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'

/*
  A Radix dialog restyled as a sheet: square corners, hairline rules, mono
  chrome. Used for the command palette and the assistant panel.
*/
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close
export const DialogTitle = DialogPrimitive.Title
export const DialogDescription = DialogPrimitive.Description

export function DialogContent({
  className,
  children,
  overlayClass,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & { overlayClass?: string }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]',
          'data-[state=open]:animate-[rk-fade_180ms_var(--ease-out)]',
          overlayClass,
        )}
      />
      <DialogPrimitive.Content
        className={cn(
          'fixed left-1/2 top-[12vh] z-50 w-[min(92vw,40rem)] -translate-x-1/2',
          'border border-line-strong bg-bg-raised text-fg shadow-[0_20px_60px_-20px_rgba(0,0,0,0.35)]',
          'data-[state=open]:animate-[rk-pop_200ms_var(--ease-out)]',
          'focus:outline-none',
          className,
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
