import { useState, useRef, useMemo } from 'react'
import html2canvas from 'html2canvas'
import { FileText, Minus, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, Image, X, Tag } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { HesitationReason, MemberLevel } from '@/types'
import { cn } from '@/lib/utils'

const HESITATION_REASONS: HesitationReason[] = ['价格', '效果', '恢复期', '对比']

function HesitationModal({ onClose }: { onClose: () => void }) {
  const { hesitationReason, setHesitationReason } = useAppStore()

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-warm-900">标记犹豫原因</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-warm-400" /></button>
        </div>
        <div className="flex flex-wrap gap-2 mb-6">
          {HESITATION_REASONS.map(r => (
            <button
              key={r}
              onClick={() => setHesitationReason(r)}
              className={cn('px-4 py-2 rounded-full text-sm', hesitationReason === r ? 'bg-rose-gold text-white' : 'bg-warm-100 text-warm-600')}
            >{r}</button>
          ))}
        </div>
        <button onClick={onClose} className="w-full py-3 bg-rose-gold text-white rounded-2xl font-medium">确认</button>
      </div>
    </div>
  )
}

export default function Quotation() {
  const {
    quotationItems, removeQuotationItem, updateQuotationItemQuantity,
    discounts, appliedDiscounts, toggleDiscount,
    hesitationReason, memberLevel, saveQuotation,
  } = useAppStore()

  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [showHesitation, setShowHesitation] = useState(false)
  const quotationRef = useRef<HTMLDivElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const validDiscounts = discounts.filter(d => d.validUntil >= today)

  const hasStackConflict = useMemo(() => {
    const selected = appliedDiscounts.map(id => discounts.find(d => d.id === id)).filter(Boolean)
    const nonStackable = selected.filter(d => d && !d.canStack)
    return nonStackable.length > 1
  }, [appliedDiscounts, discounts])

  const { originalTotal, activityTotal, discountAmount, finalTotal } = useMemo(() => {
    const orig = quotationItems.reduce((s, i) => s + i.project.standardPrice * i.quantity, 0)
    const act = quotationItems.reduce((s, i) => s + i.project.activityPrice * i.quantity, 0)
    let disc = 0
    for (const id of appliedDiscounts) {
      const d = discounts.find(x => x.id === id)
      if (!d) continue
      if (d.type === 'percentage') disc += act * (1 - d.discountValue / 10)
      else if (d.type === 'fixed') disc += d.discountValue
    }
    const floor = quotationItems.reduce((s, i) => s + i.project.lowestPrice * i.quantity, 0)
    return { originalTotal: orig, activityTotal: act, discountAmount: disc, finalTotal: Math.max(act - disc, floor) }
  }, [quotationItems, appliedDiscounts, discounts])

  const handleGenerateImage = async () => {
    if (!quotationRef.current) return
    const canvas = await html2canvas(quotationRef.current, { backgroundColor: '#FFF8F6' })
    const link = document.createElement('a')
    link.download = `报价单_${Date.now()}.png`
    link.href = canvas.toDataURL()
    link.click()
  }

  const handleSave = () => {
    saveQuotation({
      id: `q_${Date.now()}`,
      customerName: '',
      memberLevel: memberLevel as MemberLevel,
      projectIds: quotationItems.map(i => i.project.id),
      discountIds: appliedDiscounts,
      totalPrice: finalTotal,
      hesitationReason: hesitationReason as HesitationReason,
      createdAt: new Date().toISOString(),
      status: '草稿',
    })
  }

  if (quotationItems.length === 0) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-warm-50 flex flex-col items-center justify-center">
        <FileText className="w-16 h-16 text-warm-200 mb-4" />
        <p className="text-warm-400 text-lg mb-1">暂无报价项目</p>
        <p className="text-warm-300 text-sm">从今日价格页面添加项目</p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-warm-50">
      <div className="sticky top-0 z-40 bg-warm-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-warm-900">顾客报价单</h1>
          <span className="px-2 py-0.5 bg-rose-gold50 text-rose-gold text-xs rounded-full">{quotationItems.length}项</span>
          {memberLevel && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{memberLevel}</span>}
        </div>
      </div>

      <div ref={quotationRef} className="px-4 pb-48">
        <div className="space-y-3 mb-6">
          {quotationItems.map(({ project: p, quantity }) => {
            const expanded = expandedItem === p.id
            return (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-card">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-warm-900 truncate">{p.name}</h3>
                    <p className="text-sm text-warm-500 truncate">{p.brand} · {p.bodyPart}</p>
                  </div>
                  <button onClick={() => removeQuotationItem(p.id)} className="shrink-0 p-1 ml-2 text-warm-300 active:text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => quantity > 1 && updateQuotationItemQuantity(p.id, quantity - 1)}
                      className="w-7 h-7 rounded-full bg-warm-100 flex items-center justify-center active:bg-warm-200"
                    ><Minus className="w-3 h-3 text-warm-600" /></button>
                    <span className="text-sm font-medium w-6 text-center">{quantity}</span>
                    <button
                      onClick={() => updateQuotationItemQuantity(p.id, quantity + 1)}
                      className="w-7 h-7 rounded-full bg-warm-100 flex items-center justify-center active:bg-warm-200"
                    ><Plus className="w-3 h-3 text-warm-600" /></button>
                  </div>
                  <span className="text-lg font-bold text-rose-gold">¥{(p.activityPrice * quantity).toLocaleString()}</span>
                </div>
                <button onClick={() => setExpandedItem(expanded ? null : p.id)} className="flex items-center gap-1 mt-2 text-xs text-warm-400">
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}价格明细
                </button>
                {expanded && (
                  <div className="mt-2 pt-2 border-t border-warm-100 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-warm-500">单次价</span><span>¥{p.standardPrice.toLocaleString()}</span></div>
                    <div className="flex justify-between"><span className="text-warm-500">疗程价</span><span className="text-rose-gold">¥{p.activityPrice.toLocaleString()}</span></div>
                    {p.sessions > 1 && (
                      <div className="flex justify-between"><span className="text-warm-500">分期参考</span><span>¥{Math.round(p.activityPrice * quantity / 6).toLocaleString()}/月</span></div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {validDiscounts.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-warm-700 mb-2">可用优惠</h3>
            <div className="space-y-2">
              {validDiscounts.map(d => {
                const applied = appliedDiscounts.includes(d.id)
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDiscount(d.id)}
                    className={cn(
                      'w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors',
                      applied ? 'bg-rose-gold50 border border-rose-goldLight' : 'bg-white border border-warm-200'
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Tag className={cn('w-4 h-4 shrink-0', applied ? 'text-rose-gold' : 'text-warm-400')} />
                      <span className={cn('text-sm truncate', applied ? 'text-rose-gold font-medium' : 'text-warm-700')}>{d.name}</span>
                      {d.needApproval && <span className="shrink-0 text-xs px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">需主管确认</span>}
                    </div>
                    <span className="shrink-0 text-xs text-warm-400 ml-2">
                      {d.type === 'percentage' ? `${d.discountValue}折` : d.type === 'fixed' ? `-¥${d.discountValue}` : '赠送'}
                    </span>
                  </button>
                )
              })}
            </div>
            {hasStackConflict && (
              <div className="flex items-center gap-1 mt-2 text-xs text-amber-600">
                <AlertTriangle className="w-3 h-3" />所选优惠不可叠加使用
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-card">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-warm-500">
              <span>原价合计</span><span>¥{originalTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-warm-500">
              <span>活动价合计</span><span>¥{activityTotal.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>优惠金额</span><span>-¥{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="pt-2 border-t border-warm-100 flex justify-between items-end">
              <span className="text-warm-700 font-medium">最终价格</span>
              <span className="text-2xl font-bold text-rose-gold">¥{finalTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 px-4 py-3 z-40">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => setShowHesitation(true)}
            className={cn(
              'shrink-0 flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium',
              hesitationReason ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-warm-100 text-warm-600'
            )}
          >标记犹豫{hesitationReason ? `:${hesitationReason}` : ''}</button>
          <button
            onClick={handleGenerateImage}
            className="flex-1 py-2.5 bg-rose-gold text-white rounded-xl text-sm font-medium flex items-center justify-center gap-1"
          ><Image className="w-4 h-4" />生成图片</button>
          <button onClick={handleSave} className="shrink-0 px-4 py-2.5 text-rose-gold text-sm font-medium">保存报价</button>
        </div>
      </div>

      {showHesitation && <HesitationModal onClose={() => setShowHesitation(false)} />}
    </div>
  )
}
