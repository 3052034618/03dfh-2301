import { useState, useRef, useMemo, useEffect } from 'react'
import html2canvas from 'html2canvas'
import {
  FileText, Minus, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  Image, X, Tag, History, Save, DollarSign, Sparkles, Clock, GitCompare,
  ShieldAlert, Ban, CheckCircle2, User, Phone, Award, Calendar, FileEdit,
  Copy, Check, Info, ShoppingBag, BadgeCheck, CircleAlert, CircleX,
  CircleCheck, UserCircle2
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type { HesitationReason, MemberLevel, Quotation, Project, Discount, ProjectQuantity, VerificationItem } from '@/types'
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

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDateShort(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function computeEffectiveDiscounts(
  items: { project: Project; quantity: number }[],
  appliedIds: string[],
  allDiscounts: Discount[]
): {
  applied: Discount[]
  conflicts: string[][]
  excluded: { discount: Discount; projects: Project[] }[]
  savings: number
  allDisabledDueToExclusive: boolean
  verificationItems: VerificationItem[]
} {
  const active = allDiscounts.filter(
    d => appliedIds.includes(d.id) && !isExpired(d.validUntil)
  )

  const excluded: { discount: Discount; projects: Project[] }[] = []
  const verificationItems: VerificationItem[] = []

  for (const d of allDiscounts) {
    if (!appliedIds.includes(d.id)) {
      continue
    }
    const exProjs = items.filter(i => d.excludeIds.includes(i.project.id)).map(i => i.project)
    const applicableProjs = items.filter(i => !d.excludeIds.includes(i.project.id)).map(i => i.project)
    if (exProjs.length > 0) excluded.push({ discount: d, projects: exProjs })

    let applicable = false
    let reason = ''

    if (items.length === 0) {
      applicable = true
      reason = '暂无项目，请添加后核验'
    } else if (exProjs.length === 0) {
      applicable = true
      reason = `当前项目（${applicableProjs.map(p => p.name).join('、')}）符合该优惠使用条件`
    } else if (applicableProjs.length > 0) {
      applicable = true
      reason = `部分项目不适用：${exProjs.map(p => p.name).join('、')}`
    } else {
      applicable = false
      reason = `所有项目均在排除范围内：${exProjs.map(p => p.name).join('、')}`
    }

    if (d.needApproval && applicable) {
      reason = '需主管签字确认后生效 · ' + reason
    }

    verificationItems.push({
      discountId: d.id,
      discountName: d.name,
      applicable,
      reason,
      needApproval: d.needApproval,
    })
  }

  const calcSave = (d: Discount) => {
    const applicableItems = items.filter(i => !d.excludeIds.includes(i.project.id))
    if (applicableItems.length === 0) return 0
    const applicableTotal = applicableItems.reduce((s, i) => s + i.project.activityPrice * i.quantity, 0)
    if (d.type === 'percentage') return applicableTotal * (1 - d.discountValue / 10)
    if (d.type === 'fixed') return d.discountValue
    return 0
  }

  const applicableActive = active.filter(d => {
    if (items.length === 0) return true
    return !items.every(i => d.excludeIds.includes(i.project.id))
  })

  const nonStackable = applicableActive.filter(d => !d.canStack)
  const stackable = applicableActive.filter(d => d.canStack)
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

  return { applied: effective, conflicts, excluded, savings, allDisabledDueToExclusive, verificationItems }
}

export default function Quotation() {
  const {
    projects, quotationItems, removeQuotationItem, updateQuotationItemQuantity,
    discounts, appliedDiscounts, toggleDiscount,
    hesitationReason, setHesitationReason, memberLevel, saveQuotation,
    savedQuotations, activeSavedQuotationId, parentQuotationId, loadSavedQuotation,
    deleteSavedQuotation, updateSavedQuotation, currentCustomer, customers, setCurrentCustomer,
  } = useAppStore()

  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const [expandedDiscount, setExpandedDiscount] = useState<string | null>(null)
  const [showHesitation, setShowHesitation] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showCustomerDrawer, setShowCustomerDrawer] = useState(false)
  const [showSaveToast, setShowSaveToast] = useState(false)
  const [toastMsg, setToastMsg] = useState('保存成功')
  const [toastType, setToastType] = useState<'success' | 'error'>('success')
  const [hasChanges, setHasChanges] = useState(false)
  const [showSaveOptions, setShowSaveOptions] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const quotationRef = useRef<HTMLDivElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const nonExpiredDiscounts = discounts.filter(d => !isExpired(d.validUntil))

  const { effectiveApplied, conflicts, excluded, discountAmount, exclusiveLock, verificationItems } = useMemo(() => {
    const res = computeEffectiveDiscounts(quotationItems, appliedDiscounts, discounts)
    return {
      effectiveApplied: res.applied,
      conflicts: res.conflicts,
      excluded: res.excluded,
      discountAmount: res.savings,
      exclusiveLock: res.allDisabledDueToExclusive,
      verificationItems: res.verificationItems,
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

  const groupedDiscounts = useMemo(() => {
    const applicable: Discount[] = []
    const needApproval: Discount[] = []
    const notApplicable: Discount[] = []

    for (const d of nonExpiredDiscounts) {
      const allExcluded = quotationItems.length > 0 &&
        quotationItems.every(i => d.excludeIds.includes(i.project.id))
      if (allExcluded) {
        notApplicable.push(d)
      } else if (d.needApproval) {
        needApproval.push(d)
      } else {
        applicable.push(d)
      }
    }

    return { applicable, needApproval, notApplicable }
  }, [nonExpiredDiscounts, quotationItems])

  const customerQuotationHistory = useMemo(() => {
    if (!currentCustomer) return []
    return savedQuotations.filter(q => q.customerId === currentCustomer.id)
  }, [savedQuotations, currentCustomer])

  const frequentProjects = useMemo(() => {
    if (!currentCustomer) return []
    const countMap: Record<string, number> = {}
    for (const q of customerQuotationHistory) {
      for (const pid of q.projectIds) {
        countMap[pid] = (countMap[pid] || 0) + 1
      }
    }
    return Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([pid, count]) => ({ project: projects.find(p => p.id === pid), count }))
      .filter(x => x.project) as { project: Project; count: number }[]
  }, [currentCustomer, customerQuotationHistory, projects])

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

  useEffect(() => {
    setHasChanges(true)
  }, [quotationItems, appliedDiscounts, hesitationReason, currentCustomer])

  useEffect(() => {
    setHasChanges(false)
  }, [activeSavedQuotationId, parentQuotationId])

  const getProjectById = (id: string) => projects.find(p => p.id === id)

  const handleGenerateImage = async () => {
    if (!quotationRef.current || quotationItems.length === 0) return
    try {
      const canvas = await html2canvas(quotationRef.current, { backgroundColor: '#FFF8F6', scale: 2 })
      const link = document.createElement('a')
      link.download = `报价单_${Date.now()}.png`
      link.href = canvas.toDataURL()
      link.click()
      setToastMsg('报价图已生成')
      setToastType('success')
      setShowSaveToast(true)
    } catch {
      setToastMsg('图片生成失败')
      setToastType('error')
      setShowSaveToast(true)
    }
  }

  const buildQuotation = (newId = true, asCopy = false): Quotation => {
    const projectQuantities: ProjectQuantity[] = quotationItems.map(i => ({
      projectId: i.project.id,
      quantity: i.quantity,
    }))

    const approvalNeeded = effectiveApplied.filter(d => d.needApproval)
    let verificationNote = ''
    if (effectiveApplied.length === 0) {
      verificationNote = '未使用优惠 · 按活动价成交'
    } else if (approvalNeeded.length > 0) {
      verificationNote = `核验通过 · 待主管确认 · 需确认：${approvalNeeded.map(d => d.name).join('、')}`
    } else {
      verificationNote = '核验通过 · 可直接成交'
    }

    return {
      id: newId ? `q_${Date.now()}` : (activeSavedQuotationId ?? `q_${Date.now()}`),
      customerId: currentCustomer?.id ?? '',
      customerName: currentCustomer?.name ?? '',
      memberLevel: (currentCustomer?.memberLevel ?? memberLevel ?? '普通') as MemberLevel,
      projectIds: quotationItems.map(i => i.project.id),
      projectQuantities,
      discountIds: effectiveApplied.map(d => d.id),
      totalPrice: Math.round(finalTotal),
      hesitationReason: hesitationReason as HesitationReason,
      createdAt: activeSavedQuotationId && !asCopy
        ? savedQuotations.find(q => q.id === activeSavedQuotationId)?.createdAt ?? new Date().toISOString()
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: asCopy ? '草稿' : '草稿',
      parentQuotationId: asCopy ? (parentQuotationId ?? activeSavedQuotationId) : (activeSavedQuotationId ? null : parentQuotationId),
      verificationNote,
      verificationItems,
    }
  }

  const doSave = (mode: 'update' | 'new') => {
    if (quotationItems.length === 0) return
    if (mode === 'update' && activeSavedQuotationId) {
      const q = buildQuotation(false, false)
      updateSavedQuotation(q)
      setToastMsg('报价已更新')
    } else {
      const q = buildQuotation(true, mode === 'new' && !!activeSavedQuotationId)
      saveQuotation(q)
      setToastMsg('报价已保存')
    }
    setToastType('success')
    setShowSaveToast(true)
    setShowSaveOptions(false)
    setHasChanges(false)
  }

  const handleSave = () => {
    if (quotationItems.length === 0) return
    if (activeSavedQuotationId && hasChanges) {
      setShowSaveOptions(true)
    } else {
      doSave('new')
    }
  }

  const handleCopyId = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(text)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // ignore
    }
  }

  const appliedVerificationItems = verificationItems.filter(v => appliedDiscounts.includes(v.discountId))
  const approvalNeededItems = appliedVerificationItems.filter(v => v.needApproval && v.applicable)
  const appliedEffectiveIds = effectiveApplied.map(d => d.id)

  const conclusionText = useMemo(() => {
    if (effectiveApplied.length === 0) return '未使用优惠 · 按活动价成交'
    if (approvalNeededItems.length > 0) return `核验通过 · 待主管确认`
    return '核验通过 · 可直接成交'
  }, [effectiveApplied, approvalNeededItems])

  const memberLevelColor = (level: string) => {
    switch (level) {
      case '钻石': return 'bg-purple-50 text-purple-600 border-purple-200'
      case '金卡': return 'bg-amber-50 text-amber-700 border-amber-200'
      case '银卡': return 'bg-slate-50 text-slate-600 border-slate-200'
      default: return 'bg-warm-50 text-warm-600 border-warm-200'
    }
  }

  if (quotationItems.length === 0 && savedQuotations.length === 0 && !currentCustomer) {
    return (
      <div className="max-w-md mx-auto min-h-screen bg-warm-50 flex flex-col">
        <div className="sticky top-0 z-40 bg-warm-50 px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-warm-900">顾客报价单</h1>
            <button
              onClick={() => setShowCustomerDrawer(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-warm-600 text-xs shadow-card"
            >
              <User className="w-3.5 h-3.5" />选择顾客
            </button>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-20">
          <FileText className="w-16 h-16 text-warm-200 mb-4" />
          <p className="text-warm-400 text-lg mb-1">暂无报价项目</p>
          <p className="text-warm-300 text-sm text-center">从今日价格页面选择项目加入报价</p>
        </div>
        <Toast open={showSaveToast} onClose={() => setShowSaveToast(false)} message={toastMsg} type={toastType} />
        {showCustomerDrawer && <CustomerDrawer onClose={() => setShowCustomerDrawer(false)} />}
      </div>
    )
  }

  function CustomerDrawer({ onClose }: { onClose: () => void }) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
        <div className="absolute top-0 right-0 bottom-0 w-[85%] max-w-sm bg-warm-50 animate-slide-left overflow-y-auto" style={{ animation: 'slideInRight 0.3s ease-out' }}>
          <div className="sticky top-0 z-10 bg-warm-50 px-4 py-3 flex items-center justify-between border-b border-warm-100">
            <h3 className="text-lg font-semibold text-warm-900">顾客资料</h3>
            <button onClick={onClose}><X className="w-5 h-5 text-warm-400" /></button>
          </div>

          <div className="p-4">
            <div className="mb-4">
              <p className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                <UserCircle2 className="w-3.5 h-3.5" />选择顾客
              </p>
              <div className="space-y-2">
                {customers.map(c => {
                  const selected = currentCustomer?.id === c.id
                  return (
                    <button
                      key={c.id}
                      onClick={() => setCurrentCustomer(c)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-xl text-left border transition-colors',
                        selected ? 'bg-rose-gold50 border-rose-goldLight' : 'bg-white border-warm-200 active:bg-warm-50'
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          'w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0',
                          c.memberLevel === '钻石' ? 'bg-purple-500' :
                          c.memberLevel === '金卡' ? 'bg-amber-500' :
                          c.memberLevel === '银卡' ? 'bg-slate-400' : 'bg-warm-400'
                        )}>
                          {c.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className={cn('text-sm font-medium truncate', selected ? 'text-rose-gold' : 'text-warm-800')}>{c.name}</p>
                          <p className="text-[11px] text-warm-400 truncate">{c.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', memberLevelColor(c.memberLevel))}>
                          {c.memberLevel}
                        </span>
                        {selected && <Check className="w-4 h-4 text-rose-gold shrink-0" />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {currentCustomer && (
              <>
                <div className="bg-white rounded-2xl p-4 mb-4 shadow-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold',
                      currentCustomer.memberLevel === '钻石' ? 'bg-purple-500' :
                      currentCustomer.memberLevel === '金卡' ? 'bg-amber-500' :
                      currentCustomer.memberLevel === '银卡' ? 'bg-slate-400' : 'bg-warm-400'
                    )}>
                      {currentCustomer.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-base font-semibold text-warm-900">{currentCustomer.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-3 h-3 text-warm-400" />
                        <span className="text-xs text-warm-500">{currentCustomer.phone}</span>
                      </div>
                      <span className={cn('inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full border', memberLevelColor(currentCustomer.memberLevel))}>
                        <Award className="w-3 h-3 inline mr-0.5 -mt-0.5" />{currentCustomer.memberLevel}会员
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />历史报价 ({customerQuotationHistory.length})
                  </p>
                  {customerQuotationHistory.length === 0 ? (
                    <p className="text-xs text-warm-300 text-center py-4 bg-white rounded-xl">暂无历史报价</p>
                  ) : (
                    <div className="space-y-2">
                      {[...customerQuotationHistory].reverse().slice(0, 5).map(q => (
                        <div key={q.id} className="bg-white rounded-xl p-3">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-warm-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{formatDateShort(q.createdAt)}
                            </span>
                            <span className="text-sm font-bold text-rose-gold">¥{q.totalPrice.toLocaleString()}</span>
                          </div>
                          <p className="text-[11px] text-warm-500 truncate">
                            <ShoppingBag className="w-3 h-3 inline mr-1 -mt-0.5" />
                            {q.projectIds.length}项 · {q.projectIds.map(id => getProjectById(id)?.name).filter(Boolean).slice(0, 2).join('、')}{q.projectIds.length > 2 ? '...' : ''}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => { loadSavedQuotation(q.id, false); onClose() }}
                              className="flex-1 py-1.5 bg-rose-gold text-white text-[11px] rounded-lg font-medium flex items-center justify-center gap-1"
                            >
                              <FileEdit className="w-3 h-3" />继续编辑
                            </button>
                            <button
                              onClick={() => { loadSavedQuotation(q.id, true); onClose() }}
                              className="flex-1 py-1.5 bg-warm-100 text-warm-700 text-[11px] rounded-lg font-medium flex items-center justify-center gap-1"
                            >
                              <Copy className="w-3 h-3" />另存一份
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />常做项目
                  </p>
                  {frequentProjects.length === 0 ? (
                    <p className="text-xs text-warm-300 text-center py-4 bg-white rounded-xl">暂无数据</p>
                  ) : (
                    <div className="space-y-2">
                      {frequentProjects.map(({ project, count }, idx) => (
                        <div key={project.id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0',
                              idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-warm-400'
                            )}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm text-warm-800 truncate">{project.name}</p>
                              <p className="text-[10px] text-warm-400">{project.brand} · {project.category}</p>
                            </div>
                          </div>
                          <span className="text-[11px] text-rose-gold font-medium shrink-0 ml-2">{count}次</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-warm-50">
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      <div className="sticky top-0 z-40 bg-warm-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-semibold text-warm-900">顾客报价单</h1>
            <span className="px-2 py-0.5 bg-rose-gold50 text-rose-gold text-xs rounded-full">{quotationItems.length}项</span>
            {currentCustomer?.memberLevel && (
              <span className={cn('px-2 py-0.5 text-xs rounded-full border', memberLevelColor(currentCustomer.memberLevel))}>
                {currentCustomer.memberLevel}
              </span>
            )}
            {activeSavedQuotationId && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full flex items-center gap-0.5">
                <FileEdit className="w-3 h-3" />编辑报价草稿
              </span>
            )}
            {parentQuotationId && !activeSavedQuotationId && (
              <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-xs rounded-full flex items-center gap-0.5">
                <Copy className="w-3 h-3" />另存草稿
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomerDrawer(true)}
              className={cn(
                'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs shadow-card',
                currentCustomer ? 'bg-rose-gold50 text-rose-gold' : 'bg-white text-warm-600'
              )}
            >
              <User className="w-3.5 h-3.5" />
              {currentCustomer ? currentCustomer.name : '选择顾客'}
            </button>
            {savedQuotations.length > 0 && (
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-white text-warm-600 text-xs shadow-card">
                <History className="w-3.5 h-3.5" />历史 ({savedQuotations.length})
              </button>
            )}
          </div>
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
              <Tag className="w-4 h-4 text-rose-gold" />优惠核验
            </h3>

            {groupedDiscounts.applicable.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-green-600 mb-1.5 flex items-center gap-1 font-medium">
                  <CircleCheck className="w-3.5 h-3.5" />适用优惠
                </p>
                <div className="space-y-2">
                  {groupedDiscounts.applicable.map(d => (
                    <DiscountCard
                      key={d.id}
                      d={d}
                      appliedDiscounts={appliedDiscounts}
                      effectiveAppliedIds={appliedEffectiveIds}
                      expandedDiscount={expandedDiscount}
                      setExpandedDiscount={setExpandedDiscount}
                      excluded={excluded}
                      disabled={false}
                      toggleDiscount={toggleDiscount}
                      variant="applicable"
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedDiscounts.needApproval.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-amber-600 mb-1.5 flex items-center gap-1 font-medium">
                  <CircleAlert className="w-3.5 h-3.5" />需主管确认
                </p>
                <div className="space-y-2">
                  {groupedDiscounts.needApproval.map(d => (
                    <DiscountCard
                      key={d.id}
                      d={d}
                      appliedDiscounts={appliedDiscounts}
                      effectiveAppliedIds={appliedEffectiveIds}
                      expandedDiscount={expandedDiscount}
                      setExpandedDiscount={setExpandedDiscount}
                      excluded={excluded}
                      disabled={false}
                      toggleDiscount={toggleDiscount}
                      variant="approval"
                    />
                  ))}
                </div>
              </div>
            )}

            {groupedDiscounts.notApplicable.length > 0 && (
              <div className="mb-3">
                <p className="text-[11px] text-red-500 mb-1.5 flex items-center gap-1 font-medium">
                  <CircleX className="w-3.5 h-3.5" />不适用
                </p>
                <div className="space-y-2">
                  {groupedDiscounts.notApplicable.map(d => (
                    <DiscountCard
                      key={d.id}
                      d={d}
                      appliedDiscounts={appliedDiscounts}
                      effectiveAppliedIds={appliedEffectiveIds}
                      expandedDiscount={expandedDiscount}
                      setExpandedDiscount={setExpandedDiscount}
                      excluded={excluded}
                      disabled={true}
                      toggleDiscount={toggleDiscount}
                      variant="not-applicable"
                    />
                  ))}
                </div>
              </div>
            )}

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

        {quotationItems.length > 0 && appliedVerificationItems.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-card mb-4">
            <div className="flex items-center gap-1.5 mb-3">
              <ShieldAlert className="w-4 h-4 text-warm-600" />
              <h3 className="text-sm font-medium text-warm-800">核验结论</h3>
            </div>

            <div className={cn(
              'p-3 rounded-xl mb-3',
              effectiveApplied.length === 0 ? 'bg-warm-50 border border-warm-200' :
              approvalNeededItems.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'
            )}>
              <div className="flex items-start gap-2">
                {effectiveApplied.length === 0 ? (
                  <Info className="w-4 h-4 text-warm-500 shrink-0 mt-0.5" />
                ) : approvalNeededItems.length > 0 ? (
                  <CircleAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                )}
                <p className={cn(
                  'text-sm font-medium',
                  effectiveApplied.length === 0 ? 'text-warm-600' :
                  approvalNeededItems.length > 0 ? 'text-amber-700' : 'text-green-700'
                )}>
                  {conclusionText}
                </p>
              </div>
              {approvalNeededItems.length > 0 && (
                <p className="text-[11px] text-amber-600 mt-1.5 ml-6">
                  需主管确认：{approvalNeededItems.map(v => v.discountName).join('、')}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              {appliedVerificationItems.map(v => (
                <div key={v.discountId} className="flex items-start gap-2 text-[11px]">
                  {v.applicable ? (
                    v.needApproval ? (
                      <CircleAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <CircleCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                    )
                  ) : (
                    <CircleX className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className={cn(
                      'font-medium',
                      v.applicable ? (v.needApproval ? 'text-amber-700' : 'text-green-700') : 'text-red-600'
                    )}>{v.discountName}</span>
                    <span className={cn(
                      ' ml-1',
                      v.applicable ? (v.needApproval ? 'text-amber-600' : 'text-green-600') : 'text-red-500'
                    )}>· {v.reason}</span>
                  </div>
                </div>
              ))}
            </div>
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
                {[...savedQuotations].reverse().map(q => {
                  const parent = q.parentQuotationId ? savedQuotations.find(pq => pq.id === q.parentQuotationId) : null
                  return (
                    <div key={q.id} className="p-3 bg-warm-50 rounded-xl">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-warm-900">
                              {q.customerName || '未命名顾客'}
                            </span>
                            {q.memberLevel && <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border', memberLevelColor(q.memberLevel))}>{q.memberLevel}</span>}
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-warm-100 text-warm-500">{q.status}</span>
                            {q.parentQuotationId && parent && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded bg-teal-50 text-teal-600 flex items-center gap-0.5 cursor-pointer"
                                onClick={() => handleCopyId(q.parentQuotationId)}
                              >
                                <Copy className="w-3 h-3" />
                                源自: {formatDateShort(parent.createdAt)}
                                {copiedId === q.parentQuotationId && <Check className="w-3 h-3 ml-0.5" />}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-warm-400 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{formatDate(q.createdAt)}
                          </p>
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
                      {q.verificationNote && (
                        <p className="text-[11px] text-warm-500 mt-1">核验：{q.verificationNote}</p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => { loadSavedQuotation(q.id, false); setShowHistory(false) }}
                          className={cn(
                            'flex-1 py-2 text-white text-xs rounded-lg font-medium flex items-center justify-center gap-1',
                            activeSavedQuotationId === q.id ? 'bg-warm-400' : 'bg-rose-gold'
                          )}
                        >
                          <FileEdit className="w-3.5 h-3.5" />
                          {activeSavedQuotationId === q.id ? '当前编辑中' : '继续编辑'}
                        </button>
                        <button
                          onClick={() => { loadSavedQuotation(q.id, true); setShowHistory(false) }}
                          className="flex-1 py-2 bg-teal-500 text-white text-xs rounded-lg font-medium flex items-center justify-center gap-1"
                        >
                          <Copy className="w-3.5 h-3.5" />另存一份
                        </button>
                        <button
                          onClick={() => deleteSavedQuotation(q.id)}
                          className="px-3 py-2 bg-red-50 text-red-500 text-xs rounded-lg flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {showCustomerDrawer && <CustomerDrawer onClose={() => setShowCustomerDrawer(false)} />}

      {showSaveOptions && (
        <div className="fixed inset-0 z-[60] animate-fade-in">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowSaveOptions(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-warm-900">保存方式</h3>
              <button onClick={() => setShowSaveOptions(false)}><X className="w-5 h-5 text-warm-400" /></button>
            </div>
            <p className="text-sm text-warm-500 mb-4">检测到已保存的报价有修改，请选择保存方式</p>
            <div className="space-y-2">
              <button
                onClick={() => doSave('update')}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-rose-gold50 border-2 border-rose-gold text-left active:bg-rose-gold/10"
              >
                <div className="w-10 h-10 rounded-full bg-rose-gold flex items-center justify-center shrink-0">
                  <Save className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-rose-gold">保存修改</p>
                  <p className="text-xs text-warm-500">覆盖当前的报价草稿</p>
                </div>
              </button>
              <button
                onClick={() => doSave('new')}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-warm-50 border-2 border-warm-200 text-left active:bg-warm-100"
              >
                <div className="w-10 h-10 rounded-full bg-warm-300 flex items-center justify-center shrink-0">
                  <Copy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-warm-800">另存为新报价</p>
                  <p className="text-xs text-warm-500">创建新的报价草稿，原报价保留</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast open={showSaveToast} onClose={() => setShowSaveToast(false)} message={toastMsg} type={toastType} />
    </div>
  )
}

function DiscountCard({
  d,
  appliedDiscounts,
  effectiveAppliedIds,
  expandedDiscount,
  setExpandedDiscount,
  excluded,
  disabled,
  toggleDiscount,
  variant,
}: {
  d: Discount
  appliedDiscounts: string[]
  effectiveAppliedIds: string[]
  expandedDiscount: string | null
  setExpandedDiscount: (id: string | null) => void
  excluded: { discount: Discount; projects: Project[] }[]
  disabled: boolean
  toggleDiscount: (id: string) => void
  variant: 'applicable' | 'approval' | 'not-applicable'
}) {
  const applied = appliedDiscounts.includes(d.id)
  const effectiveNow = effectiveAppliedIds.includes(d.id)
  const ex = excluded.find(x => x.discount.id === d.id)
  const expanded = expandedDiscount === d.id

  const iconClass = variant === 'applicable' ? 'text-green-500' : variant === 'approval' ? 'text-amber-500' : 'text-warm-400'
  const Icon = variant === 'applicable' ? CircleCheck : variant === 'approval' ? CircleAlert : CircleX

  const applicableItems = (isApplied: boolean) => {
    if (d.needApproval && isApplied) return '需主管签字确认后生效 · 当前项目符合该优惠使用条件'
    if (variant === 'not-applicable') return `所有项目均在排除范围内：${ex?.projects.map(p => p.name).join('、')}`
    if (ex && ex.projects.length > 0) return `部分项目不适用：${ex.projects.map(p => p.name).join('、')}（其余可用）`
    return '当前项目符合该优惠使用条件'
  }

  return (
    <div>
      <div
        className={cn(
          'w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors border',
          disabled && 'opacity-50',
          applied
            ? effectiveNow
              ? variant === 'approval'
                ? 'bg-amber-50 border-amber-300'
                : 'bg-rose-gold50 border-rose-goldLight'
              : 'bg-warm-50 border-amber-300'
            : 'bg-white border-warm-200'
        )}
      >
        <button
          onClick={() => setExpandedDiscount(expanded ? null : d.id)}
          className="flex-1 flex items-center gap-2 min-w-0"
        >
          <Icon className={cn('w-4 h-4 shrink-0', iconClass)} />
          <div className="min-w-0 flex-1 text-left">
            <span className={cn(
              'text-sm truncate block',
              applied && effectiveNow
                ? variant === 'approval' ? 'text-amber-700 font-medium' : 'text-rose-gold font-medium'
                : disabled ? 'text-warm-400' : 'text-warm-700'
            )}>{d.name}</span>
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              {d.needApproval && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">需主管确认</span>}
              {!d.canStack && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-500">不可叠加</span>}
              {d.canStack && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600">可叠加</span>}
            </div>
          </div>
          <span className="shrink-0 text-xs text-warm-400 mx-2">
            {d.type === 'percentage' ? `${d.discountValue}折` : d.type === 'fixed' ? `-¥${d.discountValue}` : '赠送'}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-warm-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-warm-400 shrink-0" />}
        </button>
        <div className="ml-2 shrink-0">
          <button
            onClick={() => !disabled && toggleDiscount(d.id)}
            disabled={disabled}
            className={cn(
              'w-10 h-6 rounded-full transition-colors relative',
              disabled ? 'bg-warm-200 cursor-not-allowed' :
              applied ? (variant === 'approval' ? 'bg-amber-500' : 'bg-rose-gold') : 'bg-warm-200'
            )}
          >
            <span className={cn(
              'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all',
              applied ? 'left-[18px]' : 'left-0.5'
            )} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="mt-1.5 p-2.5 bg-warm-50 rounded-xl text-[11px] text-warm-600 flex items-start gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warm-400" />
          <div>
            <p className="font-medium text-warm-700 mb-0.5">适用原因</p>
            <p>{applicableItems(applied)}</p>
          </div>
        </div>
      )}
      {applied && !effectiveNow && !expanded && (
        <p className="text-[11px] text-amber-600 mt-1 flex items-start gap-1 px-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>与其他不可叠加优惠冲突，系统将自动选择优惠力度最大的</span>
        </p>
      )}
    </div>
  )
}
