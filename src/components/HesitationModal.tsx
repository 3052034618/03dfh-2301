import { DollarSign, Sparkles, Clock, GitCompare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HesitationModalProps {
  open: boolean
  onClose: () => void
  onSelect: (reason: string) => void
}

const options = [
  { label: '价格', icon: DollarSign, value: '价格' },
  { label: '效果', icon: Sparkles, value: '效果' },
  { label: '恢复期', icon: Clock, value: '恢复期' },
  { label: '对比', icon: GitCompare, value: '对比' },
]

export default function HesitationModal({ open, onClose, onSelect }: HesitationModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-slide-up">
        <div className="px-5 py-4 border-b border-warm-200">
          <h2 className="text-lg font-semibold text-warm-900 text-center">标记犹豫原因</h2>
        </div>

        <div className="p-5 grid grid-cols-2 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.value}
                onClick={() => onSelect(opt.value)}
                className={cn(
                  'flex flex-col items-center justify-center gap-2 py-5 rounded-xl',
                  'bg-warm-50 active:bg-rose-gold50 transition-colors'
                )}
              >
                <Icon size={24} className="text-rose-gold" />
                <span className="text-sm font-medium text-warm-700">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
