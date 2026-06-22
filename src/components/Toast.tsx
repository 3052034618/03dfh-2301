import { useEffect } from 'react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastProps {
  open: boolean
  onClose: () => void
  message: string
  type?: 'success' | 'error'
  duration?: number
}

export default function Toast({ open, onClose, message, type = 'success', duration = 2000 }: ToastProps) {
  useEffect(() => {
    if (open && duration > 0) {
      const t = setTimeout(onClose, duration)
      return () => clearTimeout(t)
    }
  }, [open, duration, onClose])

  if (!open) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-scale-in">
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-3 rounded-2xl shadow-float min-w-[200px]',
          type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        )}
      >
        {type === 'success' ? (
          <CheckCircle className="w-5 h-5 shrink-0" />
        ) : (
          <AlertCircle className="w-5 h-5 shrink-0" />
        )}
        <span className="text-sm font-medium">{message}</span>
        <button onClick={onClose} className="ml-2 shrink-0 opacity-60 hover:opacity-100">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
