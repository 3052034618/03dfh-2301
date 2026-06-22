import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, Droplets, Zap, Syringe, Scissors, Shield } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { ProjectCategory } from '@/types'

const categoryIcon: Record<ProjectCategory, React.ElementType> = {
  水光: Droplets,
  光电: Zap,
  注射: Syringe,
  手术: Scissors,
  修复: Shield,
}

const categoryColor: Record<ProjectCategory, string> = {
  水光: 'bg-blue-100 text-blue-600',
  光电: 'bg-amber-100 text-amber-600',
  注射: 'bg-purple-100 text-purple-600',
  手术: 'bg-red-100 text-red-600',
  修复: 'bg-green-100 text-green-600',
}

type TabKey = 'project' | 'package' | 'script'

const tabs: { key: TabKey; label: string }[] = [
  { key: 'project', label: '项目' },
  { key: 'package', label: '套餐' },
  { key: 'script', label: '话术' },
]

export default function Favorites() {
  const [activeTab, setActiveTab] = useState<TabKey>('project')
  const navigate = useNavigate()
  const { favorites, toggleFavorite, projects, packages, scripts, addQuotationItem } = useAppStore()

  const favProjects = projects.filter((p) =>
    favorites.some((f) => f.itemType === 'project' && f.itemId === p.id)
  )
  const favPackages = packages.filter((p) =>
    favorites.some((f) => f.itemType === 'package' && f.itemId === p.id)
  )
  const favScripts = scripts.filter((s) =>
    favorites.some((f) => f.itemType === 'script' && f.itemId === s.id)
  )

  const totalCount = favorites.length

  const EmptyState = ({ text }: { text: string }) => (
    <div className="flex flex-col items-center justify-center py-16 text-warm-400">
      <Heart className="w-12 h-12 mb-3" />
      <p className="text-sm">{text}</p>
    </div>
  )

  return (
    <div className="max-w-md mx-auto pb-24">
      <div className="sticky top-0 z-10 bg-warm-50 px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-4">
          <h1 className="text-xl font-bold text-warm-900">收藏常用</h1>
          {totalCount > 0 && (
            <span className="bg-rose-gold text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {totalCount}
            </span>
          )}
        </div>
        <div className="flex bg-warm-200 rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-white text-rose-gold shadow-card'
                  : 'text-warm-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-2">
        {activeTab === 'project' && (
          <>
            {favProjects.length === 0 ? (
              <EmptyState text="暂无收藏" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {favProjects.map((project) => {
                  const Icon = categoryIcon[project.category]
                  return (
                    <div
                      key={project.id}
                      onClick={() => navigate('/')}
                      className="bg-white rounded-xl p-3 shadow-card relative cursor-pointer active:scale-[0.98] transition-transform"
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite('project', project.id)
                        }}
                        className="absolute top-2 right-2 text-rose-gold"
                      >
                        <Heart className="w-4 h-4 fill-rose-gold" />
                      </button>
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${categoryColor[project.category]}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-sm font-medium text-warm-900 truncate">
                        {project.name}
                      </p>
                      <p className="text-rose-gold font-bold text-sm mt-1">
                        ¥{project.activityPrice.toLocaleString()}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'package' && (
          <>
            {favPackages.length === 0 ? (
              <EmptyState text="暂无收藏" />
            ) : (
              <div className="space-y-3">
                {favPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="bg-white rounded-xl p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-warm-900 truncate">
                          {pkg.name}
                        </p>
                        <p className="text-rose-gold font-bold mt-1">
                          ¥{pkg.packagePrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <button
                          onClick={() => {
                            const proj = projects.find(
                              (p) => p.id === pkg.projectIds[0]
                            )
                            if (proj) addQuotationItem(proj)
                          }}
                          className="bg-rose-gold text-white text-xs px-3 py-1.5 rounded-lg active:bg-rose-goldDark"
                        >
                          加入报价
                        </button>
                        <button
                          onClick={() => toggleFavorite('package', pkg.id)}
                          className="text-rose-gold"
                        >
                          <Heart className="w-4 h-4 fill-rose-gold" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'script' && (
          <>
            {favScripts.length === 0 ? (
              <EmptyState text="暂无收藏" />
            ) : (
              <div className="space-y-3">
                {favScripts.map((script) => (
                  <div
                    key={script.id}
                    className="bg-white rounded-xl p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="bg-rose-gold100 text-rose-goldDark text-xs px-2 py-0.5 rounded-full">
                            {script.category}
                          </span>
                          <p className="text-sm font-medium text-warm-900 truncate">
                            {script.title}
                          </p>
                        </div>
                        <p className="text-xs text-warm-500 line-clamp-2">
                          {script.opening}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleFavorite('script', script.id)}
                        className="text-rose-gold ml-2 shrink-0"
                      >
                        <Heart className="w-4 h-4 fill-rose-gold" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-warm-400">
          <Heart className="w-16 h-16 mb-4" />
          <p className="text-base">暂无收藏</p>
          <p className="text-sm mt-1">点击项目或话术的心形图标即可收藏</p>
        </div>
      )}
    </div>
  )
}
