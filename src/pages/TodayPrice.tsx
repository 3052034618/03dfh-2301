import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, SearchX, QrCode, Heart, Plus, X, AlertCircle, ShieldAlert } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Project, BodyPart } from '@/types'
import { cn } from '@/lib/utils'

const CATEGORIES = ['全部', '水光', '光电', '注射', '手术', '修复']
const BODY_PARTS: BodyPart[] = ['面部', '眼部', '鼻部', '唇部', '下颌', '颈部', '胸部', '腹部', '大腿', '手臂', '全身']
const DOCTORS = [
  { id: 'd001', name: '王医生' },
  { id: 'd002', name: '李医生' },
  { id: 'd003', name: '张医生' },
  { id: 'd004', name: '刘医生' },
  { id: 'd005', name: '陈医生' },
  { id: 'd006', name: '赵医生' },
]

function ProjectPriceCard({ project }: { project: Project }) {
  const { addQuotationItem, toggleFavorite, isFavorite } = useAppStore()
  const fav = isFavorite('project', project.id)

  return (
    <div className="bg-white rounded-2xl p-4 shadow-card">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif font-semibold text-warm-900">{project.name}</h3>
            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-rose-gold50 text-rose-gold">{project.category}</span>
          </div>
          <p className="text-sm text-warm-500 mt-1">{project.brand} · {project.bodyPart} · {project.spec}</p>
        </div>
        <button onClick={() => toggleFavorite('project', project.id)} className="shrink-0 p-1 ml-2">
          <Heart className={cn('w-5 h-5', fav ? 'fill-rose-gold text-rose-gold' : 'text-warm-300')} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="bg-warm-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-warm-400">标准价</p>
          <p className="text-sm font-semibold text-warm-600 mt-0.5 line-through">¥{project.standardPrice.toLocaleString()}</p>
        </div>
        <div className="bg-rose-gold50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-rose-goldLight">活动价</p>
          <p className="text-sm font-bold text-rose-gold mt-0.5">¥{project.activityPrice.toLocaleString()}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-2.5 text-center">
          <p className="text-[10px] text-amber-500">最低成交</p>
          <p className="text-sm font-bold text-amber-700 mt-0.5">¥{project.lowestPrice.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 flex-wrap">
        {!project.canStack && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">
            <ShieldAlert className="w-3 h-3" />
            不可叠加
          </span>
        )}
        {project.stackNote && (
          <span className="inline-flex items-start gap-1 text-[11px] text-warm-500 flex-1 min-w-0">
            <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="truncate">{project.stackNote}</span>
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <p className="text-xs text-warm-400">
          {project.sessions > 1 ? `疗程 ${project.sessions} 次 · 单次 ¥${project.sessionPrice.toLocaleString()}` : '单次操作'}
        </p>
        <button
          onClick={() => addQuotationItem(project)}
          className="flex items-center gap-1 px-3 py-1.5 bg-rose-gold text-white rounded-full text-sm font-medium active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />加入报价
        </button>
      </div>
    </div>
  )
}

function FilterDrawer() {
  const { filterBodyPart, setFilterBodyPart, filterDoctor, setFilterDoctor, filterIsOldCustomer, setFilterIsOldCustomer, setShowFilter } = useAppStore()

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilter(false)} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-slide-up max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-warm-900">筛选</h3>
          <button onClick={() => setShowFilter(false)}><X className="w-5 h-5 text-warm-400" /></button>
        </div>
        <div className="mb-4">
          <h4 className="text-sm font-medium text-warm-700 mb-2">部位</h4>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterBodyPart('')} className={cn('px-3 py-1.5 rounded-full text-sm', !filterBodyPart ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600')}>全部</button>
            {BODY_PARTS.map(p => (
              <button key={p} onClick={() => setFilterBodyPart(p)} className={cn('px-3 py-1.5 rounded-full text-sm', filterBodyPart === p ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600')}>{p}</button>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <h4 className="text-sm font-medium text-warm-700 mb-2">医生</h4>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFilterDoctor('')} className={cn('px-3 py-1.5 rounded-full text-sm', !filterDoctor ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600')}>全部</button>
            {DOCTORS.map(d => (
              <button key={d.id} onClick={() => setFilterDoctor(d.id)} className={cn('px-3 py-1.5 rounded-full text-sm', filterDoctor === d.id ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600')}>{d.name}</button>
            ))}
          </div>
        </div>
        <div className="mb-6">
          <h4 className="text-sm font-medium text-warm-700 mb-2">客户类型</h4>
          <div className="flex gap-2">
            <button onClick={() => setFilterIsOldCustomer(false)} className={cn('px-3 py-1.5 rounded-full text-sm', !filterIsOldCustomer ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600')}>新客</button>
            <button onClick={() => setFilterIsOldCustomer(true)} className={cn('px-3 py-1.5 rounded-full text-sm', filterIsOldCustomer ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600')}>老客</button>
          </div>
        </div>
        <button onClick={() => setShowFilter(false)} className="w-full py-3 bg-rose-gold text-white rounded-2xl font-medium">确认</button>
      </div>
    </div>
  )
}

export default function TodayPrice() {
  const {
    searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
    projects, showFilter, setShowFilter, filterBodyPart, filterDoctor, filterIsOldCustomer,
    customers, setCurrentCustomer, setMemberLevel, memberLevel,
  } = useAppStore()

  const [showScan, setShowScan] = useState(false)
  const [scanResult, setScanResult] = useState<{ level: string; name: string } | null>(null)

  const filterCount = [filterBodyPart, filterDoctor, filterIsOldCustomer ? 'yes' : ''].filter(Boolean).length

  const filtered = useMemo(() => {
    return projects.filter(p => {
      if (p.isExpired) return false
      if (selectedCategory && p.category !== selectedCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!p.name.toLowerCase().includes(q) && !p.brand.toLowerCase().includes(q) && !p.bodyPart.toLowerCase().includes(q)) return false
      }
      if (filterBodyPart && p.bodyPart !== filterBodyPart) return false
      if (filterDoctor && p.doctorId !== filterDoctor) return false
      return true
    })
  }, [projects, selectedCategory, searchQuery, filterBodyPart, filterDoctor])

  const handleScan = () => {
    setShowScan(true)
    setScanResult(null)
    setTimeout(() => setScanResult({ level: '金卡', name: '李思涵' }), 1500)
  }

  const selectCustomer = (c: typeof customers[number]) => {
    setCurrentCustomer(c)
    setMemberLevel(c.memberLevel)
    setShowScan(false)
    setScanResult(null)
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-warm-50">
      <div className="sticky top-0 z-40 bg-warm-50 px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-400" />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索项目、品牌、部位..."
              className="w-full pl-10 pr-4 py-2.5 bg-white rounded-full text-sm text-warm-900 placeholder:text-warm-400 shadow-card outline-none"
            />
          </div>
          {memberLevel && (
            <span className="shrink-0 text-xs px-3 py-2 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
              {memberLevel}
            </span>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat === '全部' ? '' : cat)}
              className={cn(
                'shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                (cat === '全部' ? !selectedCategory : selectedCategory === cat)
                  ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600'
              )}
            >{cat}</button>
          ))}
        </div>
        {filterIsOldCustomer && (
          <div className="mt-2 flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full w-fit border border-amber-100">
            <AlertCircle className="w-3 h-3" />
            当前为老客价格，活动价已显示
          </div>
        )}
      </div>

      <div className="relative px-4 pb-24">
        <div className="flex justify-end mb-3">
          <button onClick={() => setShowFilter(true)} className="relative flex items-center gap-1 px-3 py-1.5 bg-white rounded-full text-sm text-warm-600 shadow-card">
            <SlidersHorizontal className="w-4 h-4" />筛选
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-gold text-white text-xs rounded-full flex items-center justify-center">{filterCount}</span>
            )}
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <SearchX className="w-12 h-12 text-warm-300 mb-3" />
            <p className="text-warm-400">未找到匹配项目</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => <ProjectPriceCard key={p.id} project={p} />)}
          </div>
        )}
      </div>

      <button
        onClick={handleScan}
        className="fixed bottom-24 right-4 w-14 h-14 bg-rose-gold text-white rounded-full shadow-float flex items-center justify-center active:scale-95 transition-transform z-30"
      >
        <QrCode className="w-6 h-6" />
      </button>

      {showFilter && <FilterDrawer />}

      {showScan && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowScan(false); setScanResult(null) }} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-warm-900">扫码识别</h3>
              <button onClick={() => { setShowScan(false); setScanResult(null) }}><X className="w-5 h-5 text-warm-400" /></button>
            </div>
            {!scanResult ? (
              <div className="flex flex-col items-center py-10">
                <div className="w-48 h-48 border-2 border-dashed border-rose-goldLight rounded-2xl flex items-center justify-center mb-4">
                  <QrCode className="w-12 h-12 text-rose-goldLight animate-pulse" />
                </div>
                <p className="text-warm-500">正在扫描中...</p>
              </div>
            ) : (
              <div className="py-4">
                <div className="text-center mb-4">
                  <p className="text-warm-500 mb-1">识别结果</p>
                  <p className="text-xl font-semibold text-warm-900">{scanResult.name}</p>
                  <span className="inline-block mt-2 px-3 py-1 bg-rose-gold50 text-rose-gold text-sm rounded-full">{scanResult.level}会员</span>
                </div>
                <p className="text-sm text-warm-500 mb-2">选择顾客</p>
                <div className="space-y-2">
                  {customers.map(c => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full flex items-center justify-between p-3 bg-warm-50 rounded-xl active:bg-warm-100 transition-colors"
                    >
                      <span className="text-sm font-medium text-warm-900">{c.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-gold50 text-rose-gold">{c.memberLevel}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
