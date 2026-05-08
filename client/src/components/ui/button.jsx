import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none',
  {
    variants: {
      variant: {
        default:
          'bg-[#111111] text-white rounded-xl shadow-[0_4px_18px_rgba(0,0,0,0.12)] hover:bg-[#0d1f3c] hover:-translate-y-0.5',
        blue:
          'bg-[#888888] text-[#111111] rounded-xl shadow-[0_4px_18px_rgba(0,0,0,0.12)] hover:bg-[#666666] hover:-translate-y-0.5',
        secondary:
          'bg-[rgba(0,0,0,0.08)] text-[#111111] rounded-xl hover:bg-[rgba(0,0,0,0.10)]',
        outline:
          'border-[1.5px] border-[rgba(0,0,0,0.12)] text-[#111111] rounded-xl bg-[rgba(255,255,255,0.70)] backdrop-blur-sm hover:border-[#888888] hover:bg-[rgba(255,255,255,0.90)]',
        ghost:
          'text-[#111111] rounded-xl hover:bg-[rgba(0,0,0,0.05)]',
        dark:
          'bg-[#111111] text-white rounded-xl hover:bg-[#0d1f3c] hover:-translate-y-0.5',
        destructive:
          'bg-red-500 text-white rounded-xl hover:bg-red-600',
        link:
          'text-[#888888] underline-offset-4 hover:underline p-0 h-auto',
        gradient:
          'text-[#111111] rounded-xl shadow-[0_4px_18px_rgba(0,0,0,0.10)] hover:-translate-y-0.5',
      },
      size: {
        default: 'h-11 px-5 py-2 text-sm',
        sm:      'h-8 px-3 text-xs rounded-lg',
        lg:      'h-12 px-8 text-base rounded-xl',
        xl:      'h-14 px-10 text-base rounded-2xl',
        icon:    'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, children, style, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button'
  const gradientStyle = variant === 'gradient'
    ? { background: 'linear-gradient(135deg, #888888, #AAAAAA)', ...style }
    : style
  return (
    <Comp className={cn(buttonVariants({ variant, size, className }))} style={gradientStyle} ref={ref} {...props}>
      {children}
    </Comp>
  )
})
Button.displayName = 'Button'

export { Button, buttonVariants }
