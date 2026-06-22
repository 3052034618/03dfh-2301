import { useState } from 'react'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { Discount, MemberLevel } from '@/types'

const MEMBER_LEVELS: MemberLevel[] = ['普通', '银卡', '金卡', '钻石']

function isExpired(validUntil: string) {
  return new Date(validUntil) < new Date(new Date().toDateString())
}

function getTypeLabel(type: Discount['type']) {
  if (type === 'percentage') return '折扣'
  if (type === 'fixed') return '立减'
  return '赠送'
}

function formatDiscountValue(d: Discount) {
  if (d.type === 'percentage') return `${d.discountValue}折`
  if (d.type === 'fixed') return `立减¥${d.discountValue}`
  return `充值满${d.discountValue}送...`
}

function getScopeLabel(d: Discount) {
  if (d.scope === 'all') return '全场通用'
  if (d.scope === 'category') return '指定分类'
  return '指定项目'
}

export default function Discount() {
  const { discounts, projects, memberLevel, setMemberLevel } = useAppStore()
  const [showExpired, setShowExpired] = useState(false)
  const [showStackRules, setShowStackRules] = useState(false)

  const active = discounts.filter(d => !isExpired(d.validUntil))
  const expired = discounts.filter(d => isExpired(d.validUntil))

  const getProjectName = (id: string) => projects.find(p => p.id === id)?.name ?? id

  const getBarColor = (d: Discount) => {
    if (d.needApproval) return 'bg-amber-500'
    if (!d.canStack) return 'bg-red-500'
    return 'bg-green-500'
  }

  const getStackBadge = (d: Discount) => {
    if (d.needApproval) {
      return (
        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          需主管确认
        </span>
      )
    }
    if (d.canStack) {
      return <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-600">可叠加</span>
    }
    return <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600">不可叠加</span>
  }

  const renderCard = (d: Discount, greyed?: boolean) => (
    <div key={d.id} className={`bg-white rounded-2xl shadow-card overflow-hidden ${greyed ? 'opacity-50' : ''}`}>
      <div className="flex">
        <div className={`w-1.5 shrink-0 ${getBarColor(d)}`} />
        <div className="flex-1 p-4">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`font-semibold ${greyed ? 'text-warm-400' : 'text-warm-900'}`}>{d.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${greyed ? 'bg-warm-100 text-warm-400' : 'bg-rose-gold50 text-rose-gold'}`}>
              {getTypeLabel(d.type)}
            </span>
          </div>
          <p className={`text-sm ${greyed ? 'text-warm-300' : 'text-warm-500'}`}>{d.description}</p>
          <div className={`text-sm mt-1 ${greyed ? 'text-warm-300' : 'text-warm-600'}`}>
            <span>{getScopeLabel(d)}</span>
            <span className="mx-2">·</span>
            <span className="font-medium">{formatDiscountValue(d)}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {getStackBadge(d)}
            <span className={`text-xs ${greyed ? 'text-warm-300' : 'text-warm-400'}`}>
              有效期至 {d.validUntil}
            </span>
          </div>
          {d.excludeIds.length > 0 && (
            <p className={`text-xs mt-1.5 ${greyed ? 'text-warm-300' : 'text-warm-500'}`}>
              不适用于: {d.excludeIds.map(getProjectName).join('、')}
            </p>
          )}
        </div>
      </div>
    </div>
  )

  const stackable = active.filter(d => d.canStack)
  const nonStackable = active.filter(d => !d.canStack)

  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-24">
      <h1 className="text-xl font-serif font-semibold text-warm-900 mb-4">优惠核验</h1>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        {MEMBER_LEVELS.map(level => (
          <button
            key={level}
            onClick={() => setMemberLevel(level)}
            className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              memberLevel === level ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600'
            }`}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold text-warm-900">当前可用优惠</h2>
          <span className="text-xs bg-rose-gold text-white px-2 py-0.5 rounded-full">{active.length}</span>
        </div>
        <div className="space-y-3">
          {active.map(d => renderCard(d))}
        </div>
      </div>

      {expired.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => setShowExpired(!showExpired)}
            className="flex items-center gap-2 mb-3 text-warm-600 w-full"
          >
            <h2 className="font-semibold">已过期活动</h2>
            <span className="text-xs bg-warm-200 text-warm-500 px-2 py-0.5 rounded-full">{expired.length}</span>
            <span className="ml-auto">
              {showExpired ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </span>
          </button>
          {showExpired && (
            <div className="space-y-3">
              {expired.map(d => renderCard(d, true))}
            </div>
          )}
        </div>
      )}

      <div>
        <button
          onClick={() => setShowStackRules(!showStackRules)}
          className="flex items-center gap-2 mb-3 text-warm-600 w-full"
        >
          <h2 className="font-semibold">叠加规则说明</h2>
          <span className="ml-auto">
            {showStackRules ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>
        {showStackRules && (
          <div className="bg-white rounded-2xl p-4 shadow-card text-sm space-y-3">
            {stackable.length > 0 && (
              <div>
                <p className="text-green-600 font-medium mb-1">可叠加优惠：</p>
                <p className="text-warm-500">{stackable.map(d => d.name).join('、')}</p>
                <p className="text-warm-400 text-xs mt-1">以上优惠可与任意其他优惠叠加使用</p>
              </div>
            )}
            {nonStackable.length > 0 && (
              <div>
                <p className="text-red-600 font-medium mb-1">不可叠加优惠：</p>
                <p className="text-warm-500">{nonStackable.map(d => d.name).join('、')}</p>
                <p className="text-warm-400 text-xs mt-1">以上优惠相互之间不可同时使用</p>
                {nonStackable.length >= 2 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-warm-500 text-xs">不可组合：</p>
                    {nonStackable.flatMap((a, i) =>
                      nonStackable.slice(i + 1).map(b => (
                        <p key={`${a.id}-${b.id}`} className="text-red-400 text-xs">
                          ✗ {a.name} + {b.name}
                        </p>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
            <div>
              <p className="text-warm-600 font-medium mb-1">叠加规则：</p>
              <p className="text-warm-400 text-xs">标记为"可叠加"的优惠可以与其他任意优惠同时使用；标记为"不可叠加"或"需主管确认"的优惠之间不可同时使用。</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
