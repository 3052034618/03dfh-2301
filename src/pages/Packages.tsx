import { useState } from 'react'
import { Heart, Plus, X, Check } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Project } from '@/types'

export default function Packages() {
  const { packages, projects, addQuotationItem, toggleFavorite, isFavorite } = useAppStore()
  const [activeTab, setActiveTab] = useState<'preset' | 'custom'>('preset')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showPicker, setShowPicker] = useState(false)

  const getProjectById = (id: string) => projects.find(p => p.id === id)

  const PresetTab = () => (
    <div className="space-y-4">
      {packages.map(pkg => (
        <div key={pkg.id} className="bg-white rounded-2xl p-4 shadow-card relative">
          <button
            onClick={() => toggleFavorite('package', pkg.id)}
            className="absolute top-4 right-4"
          >
            <Heart
              className={`w-5 h-5 ${isFavorite('package', pkg.id) ? 'fill-rose-gold text-rose-gold' : 'text-warm-400'}`}
            />
          </button>
          <h3 className="font-serif font-semibold text-lg text-warm-900 pr-8">{pkg.name}</h3>
          <p className="text-warm-500 text-sm mt-1">{pkg.description}</p>
          <div className="mt-3 space-y-1">
            {pkg.projectIds.map(pid => {
              const proj = getProjectById(pid)
              if (!proj) return null
              return (
                <div key={pid} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-goldLight shrink-0" />
                  <span className="text-warm-700">{proj.name}</span>
                  <span className="text-warm-400 ml-auto">¥{proj.sessionPrice}/次</span>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex items-baseline gap-3 flex-wrap">
            <span className="text-rose-gold font-semibold text-xl">套餐价 ¥{pkg.packagePrice.toLocaleString()}</span>
            <span className="text-warm-400 line-through text-sm">原价 ¥{pkg.originalPrice.toLocaleString()}</span>
            <span className="text-green-600 text-sm font-medium">省 ¥{(pkg.originalPrice - pkg.packagePrice).toLocaleString()}</span>
          </div>
          <p className="text-xs text-warm-400 mt-2">有效期至 {pkg.validUntil}</p>
          <button
            onClick={() => {
              pkg.projectIds.forEach(pid => {
                const proj = getProjectById(pid)
                if (proj) addQuotationItem(proj)
              })
            }}
            className="mt-3 w-full py-2.5 bg-rose-gold text-white rounded-xl font-medium active:bg-rose-goldDark"
          >
            加入报价
          </button>
        </div>
      ))}
    </div>
  )

  const selectedProjects = selectedIds.map(id => getProjectById(id)).filter(Boolean) as Project[]
  const totalActivity = selectedProjects.reduce((sum, p) => sum + p.activityPrice, 0)
  const totalStandard = selectedProjects.reduce((sum, p) => sum + p.standardPrice, 0)
  const savedPercent = totalStandard > 0 ? Math.round((1 - totalActivity / totalStandard) * 100) : 0

  const categories = [...new Set(projects.map(p => p.category))]
  const groupedProjects = categories.map(cat => ({
    category: cat,
    projects: projects.filter(p => p.category === cat),
  }))

  const CustomTab = () => (
    <div>
      {selectedProjects.length === 0 ? (
        <div className="text-center py-12 text-warm-400">点击下方添加项目</div>
      ) : (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedProjects.map(p => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 bg-rose-gold50 text-rose-gold px-3 py-1.5 rounded-full text-sm"
              >
                {p.name}
                <button onClick={() => setSelectedIds(ids => ids.filter(id => id !== p.id))}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <div className="flex justify-between text-sm text-warm-500">
              <span>活动价合计</span>
              <span>¥{totalActivity.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-warm-400 mt-1">
              <span>标准价合计</span>
              <span>¥{totalStandard.toLocaleString()}</span>
            </div>
            {totalStandard > 0 && (
              <div className="mt-2 text-green-600 text-sm font-medium">
                自定义套餐省 {savedPercent}%
              </div>
            )}
          </div>
        </div>
      )}
      <button
        onClick={() => setShowPicker(true)}
        className="mt-4 w-full py-2.5 border-2 border-dashed border-rose-goldLight text-rose-gold rounded-xl flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        添加项目
      </button>
      {selectedProjects.length > 0 && (
        <button
          onClick={() => {
            selectedProjects.forEach(p => addQuotationItem(p))
            setSelectedIds([])
          }}
          className="mt-3 w-full py-2.5 bg-rose-gold text-white rounded-xl font-medium active:bg-rose-goldDark"
        >
          生成报价单
        </button>
      )}
    </div>
  )

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-serif font-semibold text-warm-900 mb-4">套餐组合</h1>
      <div className="flex bg-warm-100 rounded-xl p-1 mb-4">
        {(['preset', 'custom'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab ? 'bg-white text-rose-gold shadow-card' : 'text-warm-500'
            }`}
          >
            {tab === 'preset' ? '预设套餐' : '自定义组合'}
          </button>
        ))}
      </div>
      {activeTab === 'preset' ? <PresetTab /> : <CustomTab />}

      {showPicker && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end" onClick={() => setShowPicker(false)}>
          <div
            className="bg-white w-full max-w-md mx-auto rounded-t-2xl max-h-[70vh] overflow-y-auto p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-warm-900">选择项目</h3>
              <button onClick={() => setShowPicker(false)}>
                <X className="w-5 h-5 text-warm-400" />
              </button>
            </div>
            {groupedProjects.map(group => (
              <div key={group.category} className="mb-4">
                <h4 className="text-sm font-medium text-warm-500 mb-2">{group.category}</h4>
                {group.projects.map(proj => {
                  const isSelected = selectedIds.includes(proj.id)
                  return (
                    <button
                      key={proj.id}
                      onClick={() =>
                        setSelectedIds(ids =>
                          isSelected ? ids.filter(id => id !== proj.id) : [...ids, proj.id]
                        )
                      }
                      className={`w-full flex items-center justify-between py-2.5 px-3 rounded-lg mb-1 ${
                        isSelected ? 'bg-rose-gold50' : ''
                      }`}
                    >
                      <div className="text-left">
                        <span className={`text-sm ${isSelected ? 'text-rose-gold font-medium' : 'text-warm-800'}`}>
                          {proj.name}
                        </span>
                        <span className="text-xs text-warm-400 ml-2">¥{proj.activityPrice.toLocaleString()}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-rose-gold" />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
