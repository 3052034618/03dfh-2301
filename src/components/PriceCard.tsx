import { Heart, Plus } from 'lucide-react'
import type { Project } from '@/types'
import { cn } from '@/lib/utils'

interface PriceCardProps {
  project: Project
  onAdd: () => void
  onFavorite: () => void
  isFavorited: boolean
}

export default function PriceCard({ project, onAdd, onFavorite, isFavorited }: PriceCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <h3 className="font-serif font-semibold text-warm-900 text-base leading-snug">
          {project.name}
        </h3>
        <button onClick={onFavorite} className="p-1 -m-1">
          <Heart
            size={18}
            className={cn(
              isFavorited ? 'fill-rose-gold text-rose-gold' : 'text-warm-300'
            )}
          />
        </button>
      </div>

      <div className="text-warm-500 text-xs">
        {project.brand} · {project.spec}
      </div>

      <div className="flex items-center gap-2">
        <span className="price-tag price-tag-standard">
          标准价 ¥{project.standardPrice}
        </span>
        <span className="price-tag price-tag-activity">
          活动价 ¥{project.activityPrice}
        </span>
        <span className="price-tag price-tag-lowest">
          最低价 ¥{project.lowestPrice}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {!project.canStack && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500 font-medium">
            不可叠加
          </span>
        )}
        {project.stackNote && (
          <span className="text-[10px] text-warm-400">{project.stackNote}</span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-warm-500">
          疗程 {project.sessions}次 · 单次 ¥{project.sessionPrice}
        </span>
        <button
          onClick={onAdd}
          className="flex items-center gap-1 text-xs font-medium bg-rose-gold text-white px-3 py-1.5 rounded-full active:opacity-80"
        >
          <Plus size={14} />
          加入报价
        </button>
      </div>
    </div>
  )
}
