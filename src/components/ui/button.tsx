import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-soft hover:brightness-110',
        secondary: 'bg-muted text-foreground hover:bg-border',
        outline: 'border border-border bg-transparent text-foreground hover:bg-muted',
        ghost: 'text-foreground hover:bg-muted',
        soft: 'bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-primary hover:bg-[color-mix(in_srgb,var(--primary)_22%,transparent)]',
        destructive: 'bg-destructive text-white hover:brightness-110',
        accent: 'bg-accent text-accent-foreground hover:brightness-105',
      },
      size: {
        default: 'h-10 px-5',
        sm: 'h-8 px-3 text-xs rounded-xl',
        lg: 'h-12 px-7 text-base rounded-2xl',
        icon: 'h-10 w-10 rounded-full',
        'icon-sm': 'h-8 w-8 rounded-full',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
})
Button.displayName = 'Button'

export { Button, buttonVariants }
