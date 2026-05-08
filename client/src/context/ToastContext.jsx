import { useCallback, useMemo, useState } from 'react'
import ToastContext from './toast-context'

let nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const pushToast = useCallback((message, type = 'info', timeout = 2800) => {
    const id = nextId++
    setToasts((prev) => [...prev, { id, message, type }])
    window.setTimeout(() => removeToast(id), timeout)
  }, [removeToast])

  const value = useMemo(() => ({
    success: (message) => pushToast(message, 'success'),
    error: (message) => pushToast(message, 'error', 3600),
    info: (message) => pushToast(message, 'info'),
    warning: (message) => pushToast(message, 'warning', 3200),
  }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const typeClasses = {
            success: 'bg-green-500/10 text-green-500 border-green-500/20',
            error: 'bg-red-500/10 text-red-500 border-red-500/20',
            warning: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
            info: 'bg-primary-container/20 text-primary border-primary/20 dark:bg-stone-800/80 dark:text-stone-200 dark:border-stone-700'
          }
          const iconMap = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info'
          }
          return (
            <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg font-medium text-sm transition-all duration-300 animate-in slide-in-from-right-8 fade-in ${typeClasses[toast.type] || typeClasses.info}`} role="status">
              <span className="material-symbols-outlined text-xl">{iconMap[toast.type] || 'info'}</span>
              <span className="flex-1 mr-4">{toast.message}</span>
              <button className="opacity-60 hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shrink-0" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
