import { useEffect, useId, useRef, useState } from 'react'
import { cn } from '../lib/utils'

export default function ThemedSelect({
  value,
  options,
  onChange,
  label = 'Select option',
  align = 'left',
  placement = 'down',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listboxId = useId()

  useEffect(() => {
    if (!open) return

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const textAlign = align === 'center' ? 'text-center justify-center' : 'text-left justify-start'

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={label}
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          'group relative w-full min-h-[52px] rounded-2xl border px-4 py-3 pr-12 font-medium outline-none transition-all duration-300',
          'bg-white/75 text-on-surface border-outline-variant/30 shadow-[0_14px_38px_rgba(17,17,17,0.04)]',
          'hover:border-amber-400/30 hover:bg-white/90 focus:border-amber-400 focus:ring-4 focus:ring-amber-400/10',
          'dark:bg-stone-950/55 dark:text-stone-100 dark:border-stone-700/80 dark:hover:border-amber-400/30 dark:focus:border-amber-400 dark:focus:ring-amber-400/10',
          textAlign
        )}
      >
        <span className="block min-w-0 truncate">{value}</span>
        <span className={cn(
          'material-symbols-outlined pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant dark:text-stone-500 transition-transform duration-200',
          open && 'rotate-180'
        )}>
          {placement === 'up' ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            'no-scrollbar absolute left-0 right-0 z-[100] max-h-72 overflow-y-auto rounded-2xl border border-outline-variant/25 bg-white/95 p-1.5 shadow-[0_24px_70px_rgba(17,17,17,0.16)] backdrop-blur-xl dark:border-stone-700/80 dark:bg-stone-950/95 dark:shadow-[0_24px_80px_rgba(0,0,0,0.48)]',
            placement === 'up' ? 'bottom-[calc(100%+0.5rem)]' : 'top-[calc(100%+0.5rem)]'
          )}
        >
          {options.map(option => {
            const selected = option === value
            return (
              <button
                type="button"
                role="option"
                aria-selected={selected}
                key={option}
                onClick={() => {
                  onChange(option)
                  setOpen(false)
                }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200',
                  align === 'center' ? 'justify-center text-center' : 'justify-between text-left',
                  selected
                    ? 'bg-[rgba(196,133,2,0.12)] text-on-surface dark:bg-[rgba(196,133,2,0.18)] dark:text-stone-100'
                    : 'text-on-surface-variant hover:bg-amber-400/10 hover:text-on-surface dark:text-stone-400 dark:hover:bg-amber-400/10 dark:hover:text-stone-100'
                )}
              >
                <span className="min-w-0 truncate">{option}</span>
                {selected && (
                  <span className="material-symbols-outlined text-[18px] text-amber-400">check</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
