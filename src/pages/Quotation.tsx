import { useState, useRef, useMemo, useEffect } from 'react'
import html2canvas from 'html2canvas'
import {
  FileText, Minus, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  Image, X, Tag, History, Save, DollarSign, Sparkles, Clock, GitCompare,
  ShieldAlert, Ban, CheckCircle2
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { HesitationReason, MemberLevel, Quotation, Project, Discount } from '@/types'
import { cn } from '@/lib/utils'
import Toast from '@/components/Toast'
import QuotationImage from '@/components/QuotationImage'

const HESITATION_OPTS: { value: HesitationReason; label: string; icon: React.ElementType }[] = [
  { value: '价格', label: '价格', icon: DollarSign },
  { value: '效果', label: '效果', icon: Sparkles },
  { value: '恢复期', label: '恢复期', icon: Clock },
  { value: '对比', label: '对比', icon: GitCompare },
]

function isExpired(dateStr: string) {
  return new Date(dateStr) < new Date(new Date().toDateString())
}

function computeEffectiveDiscounts(
  items: { project: Project; quantity: number }[],
  selectedDiscountIds: string[],
  allDiscounts: Discount[]
): { applied: Discount[]; conflicts: string[][]; excluded: { discount: Discount; projects: Project[] }[]; savings: number; allDisabledDueToExclusive: boolean } {
  const active = allDiscounts.filter(
    d => selectedDiscountIds.includes(d.id) && !isExpired(d.validUntil)
  )

  const excluded: { discount: Discount; projects: Project[] }[] = []
  for (const d of active) {
    const exProjs = items.filter(i => d.excludeIds.includes(i.project.id)).map(i => i.project)
    if (exProjs.length > 0) excluded.push({ discount: d, projects: exProjs })
  }

  const calcSave = (d: Discount) => {
    const applicableItems = items.filter(i => !d.excludeIds.includes(i.project.id))
    if (applicableItems.length === 0) return 0
    const applicableTotal = applicableItems.reduce((s, i) => s + i.project.activityPrice * i.quantity, 0)
    if (d.type === 'percentage') return applicableTotal * (1 - d.discountValue / 10)
    if (d.type === 'fixed') return d.discountValue
    return 0
  }

  const nonStackable = active.filter(d => !d.canStack)
  const stackable = active.filter(d => d.canStack)
  const conflicts: string[][] = []
  let effective: Discount[] = []
  let savings = 0
  let allDisabledDueToExclusive = false

  if (nonStackable.length > 0) {
    for (let i = 0; i < nonStackable.length; i++) {
      for (let j = i + 1; j < nonStackable.length; j++) {
        conflicts.push([nonStackable[i].name, nonStackable[j].name])
      }
    }
    for (const ns of nonStackable) {
      for (const s of stackable) {
        conflicts.push([ns.name, s.name])
      }
    }
    const allCandidates = [...nonStackable, ...stackable]
    let best = allCandidates[0]
    let bestSave = calcSave(allCandidates[0])
    for (const d of allCandidates) {
      const save = calcSave(d)
      if (save > bestSave) { bestSave = save; best = d }
    }
    effective = [best]
    savings = bestSave
    allDisabledDueToExclusive = true
  } else {
    effective = [...stackable]
    for (const d of effective) savings += calcSave(d)
  }

  return { applied: effective, conflicts, excluded, savings, allDisabledDueToExclusive }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function Quotation() {
  const {
    projects, quotationItems, removeQuotationItem, updateQuotationItemQuantity,
    discounts, appliedDiscounts, toggleDiscount,
    hesitationReason, setHesitationReason, memberLevel, saveQuotation,
    savedQuotations, activeSavedQuotationId, loadSavedQuotation, deleteSavedQuotation,
    currentCustomer,
  } = useAppStore()

  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [showHesitation, setShowHesitation] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSaveToast, setShowSaveToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('保存成功')
  const quotationRef = useRef<HTMLDivElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const nonExpiredDiscounts = discounts.filter(d => !isExpired(d.validUntil))

  const { effectiveApplied, conflicts, excluded, discountAmount, exclusiveLock } = useMemo(() => {
    const res = computeEffectiveDiscounts(quotationItems, appliedDiscounts, discounts)
    return {
      effectiveApplied: res.applied,
      conflicts: res.conflicts,
      excluded: res.excluded,
      discountAmount: res.savings,
      exclusiveLock: res.allDisabledDueToExclusive,
    }
  }, [quotationItems, appliedDiscounts, discounts])

  const { originalTotal, activityTotal, floorTotal, finalTotal } = useMemo(() => {
    const orig = quotationItems.reduce((s, i) => s + i.project.standardPrice * i.quantity, 0)
    const act = quotationItems.reduce((s, i) => s + i.project.activityPrice * i.quantity, 0)
    const floor = quotationItems.reduce((s, i) => s + i.project.lowestPrice * i.quantity, 0)
    return {
      originalTotal: orig,
      activityTotal: act,
      floorTotal: floor,
      finalTotal: Math.max(act - discountAmount, floor),
    }
  }, [quotationItems, discountAmount])

  useEffect(() => {
    for (const d of appliedDiscounts) {
      const disc = discounts.find(x => x.id === d)
      if (!disc) continue
      if (disc.scope === 'category') continue
      if (disc.excludeIds.length === 0) continue
      const allExcluded = quotationItems.every(i => disc.excludeIds.includes(i.project.id))
      if (allExcluded && quotationItems.length > 0) {
        toggleDiscount(d)
      }
    }
  }, [quotationItems, appliedDiscounts, discounts, toggleDiscount])

  const handleGenerateImage = async () => {
    if (!quotationRef.current || quotationItems.length === 0) return
    try {
      const canvas = await html2canvas(quotationRef.current, { backgroundColor: '#FFF8F6', scale: 2 })
      const link = document.createElement('a')
      link.download = `报价单_${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
      setToastMsg('报价图已生成')
      setShowSaveToast(true)
    } catch {
      setToastMsg('图片生成失败')
      setShowSaveToast(true)
    }
  }

  const handleSave = () => {
    if (quotationItems.length === 0) return
    const q: Quotation = {
      id: `q_${Date.now()}`,
      customerName: currentCustomer?.name ?? '',
      memberLevel: memberLevel as MemberLevel,
      projectIds: quotationItems.map(i => i.project.id),
      discountIds: effectiveApplied.map(d => d.id),
      totalPrice: finalTotal,
      hesitationReason: hesitationReason as HesitationReason,
      createdAt: new Date().toISOString(),
      status: '草稿',
    }
    saveQuotation(q)
    setToastMsg('报价已保存')
    setShowSaveToast(true)
  }

  const getProjectById = (id: string) => projects.find(p => p.id === id)

  if (quotationItems.length === 0 && savedQuotations.length === 0) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-warm-50 flex flex-col">
        <div className="sticky top-0 z-40 bg-warm-50 px-4 py-3">
          <h1 className="text-lg font-semibold text-warm-900">顾客报价单</h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-20">
          <FileText className="w-16 h-16 text-warm-200 mb-4" />
          <p className="text-warm-400 text-lg mb-1">暂无报价项目</p>
          <p className="text-warm-300 text-sm text-center">从今日价格页面选择项目加入报价</p>
        </div>
        <Toast open={showSaveToast} onClose={() => setShowSaveToast(false)} message={toastMsg} />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-warm-50">
      <div className="sticky top-0 z-40 bg-warm-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-warm-900">顾客报价单</h1>
            <span className="px-2 py-0.5 bg-rose-gold50 text-rose-gold text-xs rounded-full">{quotationItems.length}项</span>
            {memberLevel && <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">{memberLevel}</span>}
            {activeSavedQuotationId && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">已保存</span>}
          </div>
          {savedQuotations.length > 0 && (
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white text-warm-600 text-xs shadow-card">
              <History className="w-3.5 h-3.5" />历史 ({savedQuotations.length})
            </button>
          )}
        </div>
      </div>

      <div ref={quotationRef} className="px-4 pb-56">
        {quotationItems.length > 0 ? (
          <div className="space-y-3 mb-6">
            {quotationItems.map(({ project: p, quantity }) => {
              const expanded = expandedItem === p.id
              return (
                <div key={p.id} className="bg-white rounded-2xl p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-warm-900 truncate">{p.name}</h3>
                      <p className="text-sm text-warm-500 truncate">{p.brand} · {p.bodyPart}</p>
                      {!p.canStack && (
                        <span className="inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-500">
                          <ShieldAlert className="w-3 h-3" />不可叠加
                        </span>
                      )}
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
                      <div className="flex justify-between"><span className="text-warm-500">标准价</span><span className="line-through text-warm-400">¥{p.standardPrice.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-warm-500">单次价</span><span>¥{p.sessionPrice.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-warm-500">疗程价 (活动)</span><span className="text-rose-gold font-medium">¥{p.activityPrice.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-warm-500">最低成交</span><span className="text-amber-700 font-medium">¥{p.lowestPrice.toLocaleString()}</span></div>
                      <div className="flex justify-between"><span className="text-warm-500">分期参考 (6期)</span><span>¥{Math.round(p.activityPrice * quantity / 6).toLocaleString()}/月</span></div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-warm-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-warm-300" />
            <p className="text-sm">暂无报价项目</p>
          </div>
        )}

        {quotationItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-warm-700 mb-2 flex items-center gap-1">
              <Tag className="w-4 h-4 text-rose-gold" />可用优惠
            </h3>
            <div className="space-y-2">
              {nonExpiredDiscounts.map(d => {
                const applied = appliedDiscounts.includes(d.id)
                const effectiveNow = effectiveApplied.some(e => e.id === d.id)
                const ex = excluded.find(x => x.discount.id === d.id)
                const allItemsExcluded = quotationItems.length > 0 &&
                  quotationItems.every(i => d.excludeIds.includes(i.project.id))
                return (
                  <div key={d.id}>
                    <button
                      onClick={() => !allItemsExcluded && toggleDiscount(d.id)}
                      disabled={allItemsExcluded}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors border',
                        applied
                          ? effectiveNow
                            ? 'bg-rose-gold50 border-rose-goldLight'
                            : 'bg-warm-50 border-amber-300'
                          : allItemsExcluded
                            ? 'bg-warm-50 border-warm-200 opacity-50'
                            : 'bg-white border-warm-200'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {applied && effectiveNow && <CheckCircle2 className="w-4 h-4 shrink-0 text-rose-gold" />}
                        {applied && !effectiveNow && <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />}
                        {!applied && !allItemsExcluded && <Tag className={cn('w-4 h-4 shrink-0', 'text-warm-400')} />}
                        {allItemsExcluded && <Ban className="w-4 h-4 shrink-0 text-warm-400" />}
                        <div className="min-w-0">
                          <span className={cn('text-sm truncate block', applied && effectiveNow ? 'text-rose-gold font-medium' : allItemsExcluded ? 'text-warm-400' : 'text-warm-700')}>{d.name}</span>
                          <div className="flex items-center gap-1 flex-wrap mt-0.5">
                            {d.needApproval && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">需主管确认</span>}
                            {!d.canStack && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500">不可叠加</span>}
                            {d.canStack && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">可叠加</span>}
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 text-xs text-warm-400 ml-2">
                        {d.type === 'percentage' ? `${d.discountValue}折` : d.type === 'fixed' ? `-¥${d.discountValue}` : '赠送'}
                      </span>
                    </button>
                    {ex && (
                      <p className="text-[11px] text-amber-600 mt-1 flex items-start gap-1 px-1">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>该优惠不适用于：{ex.projects.map(p => p.name).join('、')}</span>
                      </p>
                    )}
                    {applied && !effectiveNow && (
                      <p className="text-[11px] text-amber-600 mt-1 flex items-start gap-1 px-1">
                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span>与其他不可叠加优惠冲突，系统将自动选择优惠力度最大的</span>
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            {(conflicts.length > 0 || exclusiveLock) && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <p className="text-xs text-amber-700 font-medium flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />优惠冲突提示
                </p>
                {conflicts.map((c, i) => (
                  <p key={i} className="text-[11px] text-amber-600">✗ {c[0]} 与 {c[1]} 不可同时叠加</p>
                ))}
                <p className="text-[11px] text-amber-700 mt-1">
                  实际仅按优惠力度最大的 <span className="font-medium">{effectiveApplied.map(d => d.name).join('、') || '—'}</span> 计算
                </p>
              </div>
            )}
          </div>
        )}

        {quotationItems.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-card">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-warm-500">
                <span>原价合计</span><span className="line-through">¥{originalTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-warm-500">
                <span>活动价合计</span><span>¥{activityTotal.toLocaleString()}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>优惠金额 ({effectiveApplied.map(d => d.name).join('、')})</span>
                  <span>-¥{Math.round(discountAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="pt-2 mt-1 border-t border-warm-100 flex justify-between items-end">
                <span className="text-warm-500 text-xs">最低成交边界 ¥{floorTotal.toLocaleString()}</span>
                <div className="text-right">
                  <p className="text-xs text-warm-400">最终价格</p>
                  <p className="text-2xl font-bold text-rose-gold">¥{Math.round(finalTotal).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-warm-200 px-4 py-3 z-40">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <button
            onClick={() => setShowHesitation(true)}
            className={cn(
              'shrink-0 flex items-center gap-1 px-4 py-2.5 rounded-xl text-sm font-medium',
              hesitationReason ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-warm-100 text-warm-600'
            )}
          >标记犹豫{hesitationReason ? ` · ${hesitationReason}` : ''}</button>
          <button
            onClick={handleGenerateImage}
            disabled={quotationItems.length === 0}
            className={cn(
              'flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-1',
              quotationItems.length > 0 ? 'bg-rose-gold text-white' : 'bg-warm-200 text-warm-400'
            )}
          ><Image className="w-4 h-4" />生成图片</button>
          <button
            onClick={handleSave}
            disabled={quotationItems.length === 0}
            className={cn(
              'shrink-0 px-4 py-2.5 text-sm font-medium flex items-center gap-1',
              quotationItems.length > 0 ? 'text-rose-gold' : 'text-warm-300'
            )}
          ><Save className="w-4 h-4" />保存</button>
        </div>
      </div>

      {showHesitation && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHesitation(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-warm-900">标记犹豫原因</h3>
              <button onClick={() => setShowHesitation(false)}><X className="w-5 h-5 text-warm-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {HESITATION_OPTS.map(opt => {
                const Icon = opt.icon
                const selected = hesitationReason === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setHesitationReason(selected ? '' : opt.value)}
                    className={cn(
                      'flex flex-col items-center justify-center gap-2 py-5 rounded-xl transition-colors',
                      selected ? 'bg-rose-gold50 border-2 border-rose-gold' : 'bg-warm-50 border-2 border-transparent active:bg-warm-100'
                    )}
                  >
                    <Icon className={cn('w-6 h-6', selected ? 'text-rose-gold' : 'text-warm-500')} />
                    <span className={cn('text-sm font-medium', selected ? 'text-rose-gold' : 'text-warm-700')}>{opt.label}</span>
                  </button>
                )
              })}
            </div>
            <button onClick={() => setShowHesitation(false)} className="w-full py-3 bg-rose-gold text-white rounded-2xl font-medium">确认</button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHistory(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-slide-up max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-warm-900">历史报价</h3>
              <button onClick={() => setShowHistory(false)}><X className="w-5 h-5 text-warm-400" /></button>
            </div>
            {savedQuotations.length === 0 ? (
              <p className="text-warm-400 text-center py-10">暂无历史报价</p>
            ) : (
              <div className="space-y-2">
                {[...savedQuotations].reverse().map(q => (
                  <div key={q.id} className="p-3 bg-warm-50 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-warm-900">
                            {q.customerName || '未命名顾客'}
                          </span>
                          {q.memberLevel && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">{q.memberLevel}</span>}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-warm-100 text-warm-500">{q.status}</span>
                        </div>
                        <p className="text-[11px] text-warm-400 mt-0.5">{formatDate(q.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-rose-gold font-bold">¥{q.totalPrice.toLocaleString()}</p>
                        <p className="text-[11px] text-warm-400">{q.projectIds.length}项</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-warm-500 mt-2 truncate">
                      包含：{q.projectIds.map(id => getProjectById(id)?.name).filter(Boolean).join('、')}
                    </p>
                    {q.hesitationReason && (
                      <p className="text-[11px] text-amber-600 mt-1">犹豫原因：{q.hesitationReason}</p>
                    )}
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => { loadSavedQuotation(q.id); setShowHistory(false) }}
                        className="flex-1 py-2 bg-rose-gold text-white text-xs rounded-lg font-medium"
                      >打开报价</button>
                      {activeSavedQuotationId === q.id && (
                        <button
                          onClick={() => loadSavedQuotation(null)}
                          className="flex-1 py-2 bg-warm-200 text-warm-700 text-xs rounded-lg font-medium"
                        >新建报价</button>
                      )}
                      <button
                        onClick={() => deleteSavedQuotation(q.id)}
                        className="px-3 py-2 bg-red-50 text-red-500 text-xs rounded-lg"
                      >删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Toast open={showSaveToast} onClose={() => setShowSaveToast(false)} message={toastMsg} />
    </div>
  )
}
