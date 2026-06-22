import { useState } from 'react'
import { Heart, Lightbulb, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ScriptCategory } from '@/types'

const categories: { key: ScriptCategory | '全部'; color: string; dotColor: string }[] = [
  { key: '全部', color: 'bg-rose-gold text-white', dotColor: '' },
  { key: '价格异议', color: 'bg-rose-gold text-white', dotColor: 'bg-amber-400' },
  { key: '效果疑虑', color: 'bg-rose-gold text-white', dotColor: 'bg-blue-400' },
  { key: '恢复期担忧', color: 'bg-rose-gold text-white', dotColor: 'bg-green-400' },
  { key: '品牌对比', color: 'bg-rose-gold text-white', dotColor: 'bg-purple-400' },
  { key: '纠结犹豫', color: 'bg-rose-gold text-white', dotColor: 'bg-rose-400' },
]

const categoryColorMap: Record<ScriptCategory, string> = {
  '价格异议': 'amber',
  '效果疑虑': 'blue',
  '恢复期担忧': 'green',
  '品牌对比': 'purple',
  '纠结犹豫': 'rose',
}

const categoryDotMap: Record<ScriptCategory, string> = {
  '价格异议': 'bg-amber-400',
  '效果疑虑': 'bg-blue-400',
  '恢复期担忧': 'bg-green-400',
  '品牌对比': 'bg-purple-400',
  '纠结犹豫': 'bg-rose-400',
}

const categoryBorderMap: Record<ScriptCategory, string> = {
  '价格异议': 'border-amber-400',
  '效果疑虑': 'border-blue-400',
  '恢复期担忧': 'border-green-400',
  '品牌对比': 'border-purple-400',
  '纠结犹豫': 'border-rose-400',
}

const categoryBadgeMap: Record<ScriptCategory, string> = {
  '价格异议': 'bg-amber-100 text-amber-700',
  '效果疑虑': 'bg-blue-100 text-blue-700',
  '恢复期担忧': 'bg-green-100 text-green-700',
  '品牌对比': 'bg-purple-100 text-purple-700',
  '纠结犹豫': 'bg-rose-100 text-rose-700',
}

export default function Scripts() {
  const [activeCategory, setActiveCategory] = useState<ScriptCategory | '全部'>('全部')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { scripts, toggleFavorite, isFavorite } = useAppStore()

  const filteredScripts =
    activeCategory === '全部'
      ? scripts
      : scripts.filter((s) => s.category === activeCategory)

  return (
    <div className="max-w-md mx-auto pb-24">
      <div className="sticky top-0 z-10 bg-warm-50 px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold text-warm-900 mb-3">话术提示</h1>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'bg-rose-gold text-white'
                  : 'bg-white text-warm-600 shadow-card'
              }`}
            >
              {cat.key !== '全部' && (
                <span
                  className={`w-2 h-2 rounded-full ${categoryDotMap[cat.key as ScriptCategory]}`}
                />
              )}
              {cat.key}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-2 space-y-3">
        {filteredScripts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-warm-400">
            <Lightbulb className="w-12 h-12 mb-3" />
            <p className="text-sm">暂无匹配话术</p>
          </div>
        ) : (
          filteredScripts.map((script) => {
            const isExpanded = expandedId === script.id
            const favorited = isFavorite('script', script.id)
            return (
              <div
                key={script.id}
                className={`bg-white rounded-xl shadow-card border-l-[3px] ${categoryBorderMap[script.category]}`}
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : script.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${categoryBadgeMap[script.category]}`}
                      >
                        {script.category}
                      </span>
                      <h3 className="text-sm font-medium text-warm-900 truncate">
                        {script.title}
                      </h3>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-warm-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-warm-400 shrink-0" />
                    )}
                  </div>

                  {!isExpanded && (
                    <p className="text-xs text-warm-500 mt-2 line-clamp-2">
                      {script.opening}
                    </p>
                  )}
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-warm-700 mb-1">开场白</p>
                      <div className="bg-rose-gold50 rounded-lg p-3 text-sm text-warm-800">
                        {script.opening}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-warm-700 mb-1 flex items-center gap-1">
                        <Lightbulb className="w-3 h-3 text-amber-400" />
                        核心论点
                      </p>
                      <div className="bg-amber-50 rounded-lg p-3 text-sm text-warm-800">
                        {script.corePoint}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-warm-700 mb-1 flex items-center gap-1">
                        <Target className="w-3 h-3 text-green-500" />
                        收尾引导
                      </p>
                      <div className="bg-green-50 rounded-lg p-3 text-sm text-warm-800">
                        {script.closing}
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite('script', script.id)
                        }}
                        className="text-rose-gold"
                      >
                        <Heart
                          className={`w-5 h-5 ${favorited ? 'fill-rose-gold' : ''}`}
                        />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
