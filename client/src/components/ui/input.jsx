import * as React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      'w-full h-11 rounded-xl border-[1.5px] border-[rgba(123,107,255,0.18)] bg-[#F2FDFF] px-4 text-sm text-[#111111] placeholder:text-[rgba(0,0,0,0.25)] outline-none transition-all duration-200 focus:border-[#7B6BFF] focus:shadow-[0_0_0_3px_rgba(123,107,255,0.12)] disabled:opacity-50 disabled:cursor-not-allowed',
      className
    )}
    ref={ref}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
