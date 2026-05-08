import * as React from 'react'
import { cva } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-[#EDE9FF] text-[#7B6BFF]',
        secondary:   'bg-[rgba(0,0,0,0.06)] text-[#6557e8]',
        destructive: 'bg-[rgba(239,68,68,0.1)] text-red-600',
        outline:     'border border-[rgba(123,107,255,0.3)] text-[#7B6BFF]',
        success:     'bg-[rgba(34,197,94,0.1)] text-green-600',
        warning:     'bg-[rgba(196,133,2,0.1)] text-amber-600',
        // Tier variants
        startup:   'bg-[rgba(236,72,153,0.1)]  text-pink-600',
        service:   'bg-[rgba(14,165,233,0.1)]  text-sky-600',
        product:   'bg-[#EDE9FF]               text-[#7B6BFF]',
        fintech:   'bg-[rgba(34,197,94,0.1)]   text-green-600',
        toptier:   'bg-[rgba(196,133,2,0.1)]  text-amber-600',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
