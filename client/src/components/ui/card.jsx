import * as React from 'react'
import { cn } from '../../lib/utils'

const Card = React.forwardRef(({ className, glass, ...props }, ref) => (
  <div ref={ref} className={cn(
    glass
      ? 'bg-[rgba(255,255,255,0.68)] backdrop-blur-xl border border-[rgba(0,0,0,0.08)] rounded-[20px] shadow-[0_4px_24px_rgba(0,0,0,0.05)]'
      : 'bg-[rgba(255,255,255,0.90)] border border-[rgba(0,0,0,0.08)] rounded-[20px] shadow-[0_2px_20px_rgba(0,0,0,0.05)]',
    'transition-all duration-300',
    className
  )} {...props} />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1 p-6 pb-3', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('font-display font-semibold leading-snug text-[#111111]', className)} {...props} />
))
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-[rgba(0,0,0,0.40)]', className)} {...props} />
))
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
))
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle }
