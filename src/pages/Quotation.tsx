import { useState, useRef, useMemo, useEffect } from 'react'
import html2canvas from 'html2canvas'
import {
  FileText, Minus, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle,
  Image, X, Tag, History, Save, DollarSign, Sparkles, Clock, GitCompare,
  ShieldAlert, Ban, CheckCircle2, User, Phone, Award, Calendar, FileEdit,
  Copy, Check, Info, ShoppingBag, BadgeCheck, CircleAlert, CircleX,
  CircleCheck, UserCircle2, Send, Handshake, ThumbsDown, Search, Filter,
  Flag, StickyNote
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import type {
  HesitationReason, MemberLevel, Quotation, Project, Discount,
  ProjectQuantity, VerificationItem, FollowStatus, VersionLabel, QuotationDiff
} from '@/types'
import { cn } from '@/lib/utils'
import Toast from '@/components/Toast'
import QuotationImage from '@/components/QuotationImage'

const HESITATION_OPTS: { value: HesitationReason; label: string; icon: React.ElementType }[] = [
  { value: '价格', label: '价格', icon: DollarSign },
  { value: '效果', label: '效果', icon: Sparkles },
  { value: '恢复期', label: '恢复期', icon: Clock },
  { value: '对比', label: '对比', icon: GitCompare },
]

const FOLLOW_STATUS_OPTS: { value: FollowStatus; label: string; icon: React.ElementType; color: string }[] = [
  { value: '草稿', label: '草稿', icon: FileText, color: 'bg-warm-100 text-warm-700 border-warm-200' },
  { value: '已发送', label: '已发送', icon: Send, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: '待回访', label: '待回访', icon: Calendar, color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: '已成交', label: '已成交', icon: Handshake, color: 'bg-green-50 text-green-700 border-green-200' },
  { value: '已放弃', label: '已放弃', icon: ThumbsDown, color: 'bg-slate-100 text-slate-500 border-slate-200' },
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
  confirmedIds: string[],
  allDiscounts: Discount[]
): {
  applied: Discount[]
  confirmedApplied: Discount[]
  conflicts: string[][]
  excluded: { discount: Discount; projects: Project[] }[]
  savings: number
  confirmedSavings: number
  allDisabledDueToExclusive: boolean
  verificationItems: VerificationItem[]
} {
  const active = allDiscounts.filter(
    d => appliedIds.includes(d.id) && !isExpired(d.validUntil)
  )

  const excluded: { discount: Discount; projects: Project[] }[] = []
  const verificationItems: VerificationItem[] = []

  for (const d of allDiscounts) {
    if (!appliedIds.includes(d.id)) continue

    const catExcluded = d.includeCategories.length > 0
      ? items.filter(i => !d.includeCategories.includes(i.project.category)).map(i => i.project)
      : []
    const idExcludedProjs = items.filter(i => d.excludeIds.includes(i.project.id)).map(i => i.project)

    const allExcludedSet = new Set([...catExcluded.map(p => p.id), ...idExcludedProjs.map(p => p.id)])
    const allExcludedProjs = items.filter(i => allExcludedSet.has(i.project.id)).map(i => i.project)
    const applicableProjs = items.filter(i => !allExcludedSet.has(i.project.id)).map(i => i.project)

    if (allExcludedProjs.length > 0) excluded.push({ discount: d, projects: allExcludedProjs })

    const applicableCategory = d.includeCategories.length === 0 ||
      items.some(i => d.includeCategories.includes(i.project.category))
    const applicableProjects = applicableProjs.length > 0 || items.length === 0
    const applicable = applicableCategory && applicableProjects
    const confirmed = d.needApproval ? confirmedIds.includes(d.id) : true

    let reason = ''
    if (items.length === 0) {
      reason = '暂无项目，请添加后核验'
    } else if (!applicableCategory && d.includeCategories.length > 0) {
      reason = `仅限${d.includeCategories.join('、')}类项目使用，当前项目不在适用范围`
    } else if (applicableProjects && applicableProjs.length === items.length) {
      reason = `当前项目（${applicableProjs.map(p => p.name).join('、')}）符合该优惠使用条件`
    } else if (applicableProjects) {
      reason = `部分项目不适用：${[...new Set(allExcludedProjs.map(p => p.name))].join('、')}（其余可用）`
    } else {
      reason = `所有项目均不适用：${[...new Set(allExcludedProjs.map(p => p.name))].join('、')}`
    }

    if (d.needApproval) {
      reason = confirmed
        ? `✓ 主管已确认 · ${reason}`
        : `⟳ 待主管确认 · ${reason}`
    }

    verificationItems.push({
      discountId: d.id,
      discountName: d.name,
      applicable,
      applicableCategory,
      applicableProjects,
      confirmed,
      reason,
      needApproval: d.needApproval,
    })
  }

  const makeCalcSave = (d: Discount) => {
    const catFiltered = d.includeCategories.length > 0
      ? items.filter(i => d.includeCategories.includes(i.project.category))
      : items
    const applicableItems = catFiltered.filter(i => !d.excludeIds.includes(i.project.id))
    if (applicableItems.length === 0) return 0
    const applicableTotal = applicableItems.reduce((s, i) => s + i.project.activityPrice * i.quantity, 0)
    if (d.type === 'percentage') return applicableTotal * (1 - d.discountValue / 10)
    if (d.type === 'fixed') return d.discountValue
    return 0
  }

  const filterApplicableActive = (list: Discount[]) => list.filter(d => {
    if (items.length === 0) return true
    const catOK = d.includeCategories.length === 0 ||
      items.some(i => d.includeCategories.includes(i.project.category))
    if (!catOK) return false
    const allExcludedSet = new Set([
      ...(d.includeCategories.length > 0
        ? items.filter(i => !d.includeCategories.includes(i.project.category)).map(i => i.project.id)
        : []),
      ...items.filter(i => d.excludeIds.includes(i.project.id)).map(i => i.project.id)
    ])
    return !items.every(i => allExcludedSet.has(i.project.id))
  })

  const applicableActive = filterApplicableActive(active)
  const confirmedActive = applicableActive.filter(d => !d.needApproval || confirmedIds.includes(d.id))

  const solve = (candidates: Discount[]) => {
    const nonStackable = candidates.filter(d => !d.canStack)
    const stackable = candidates.filter(d => d.canStack)
    const conflicts: string[][] = []
    let effective: Discount[] = []
    let savings = 0

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
      let bestSave = makeCalcSave(allCandidates[0])
      for (const d of allCandidates) {
        const save = makeCalcSave(d)
        if (save > bestSave) { bestSave = save; best = d }
      }
      effective = [best]
      savings = bestSave
    } else {
      effective = [...stackable]
      for (const d of effective) savings += makeCalcSave(d)
    }
    return { effective, savings, conflicts }
  }

  const { effective: applied, savings, conflicts } = solve(applicableActive)
  const { effective: confirmedApplied, savings: confirmedSavings } = solve(confirmedActive)

  return {
    applied,
    confirmedApplied,
    conflicts,
    excluded,
    savings,
    confirmedSavings,
    allDisabledDueToExclusive: applicableActive.some(d => !d.canStack),
    verificationItems,
  }
}

function computeQuotationDiff(
  oldQ: Quotation | null,
  newItems: { project: Project; quantity: number }[],
  newDiscounts: Discount[],
  newConfirmedDiscounts: Discount[],
  allProjects: Project[],
  allDiscounts: Discount[],
  newActivityTotal: number,
  newConfirmedFinal: number,
  newFinal: number
): (QuotationDiff & { confirmedPriceDifference: number; finalPriceDifference: number }) | null {
  if (!oldQ) return null
  const oldQtyMap: Record<string, number> = {}
  if (oldQ.projectQuantities) {
    for (const pq of oldQ.projectQuantities) oldQtyMap[pq.projectId] = pq.quantity
  } else {
    for (const pid of oldQ.projectIds) oldQtyMap[pid] = 1
  }
  const newQtyMap: Record<string, number> = {}
  for (const item of newItems) newQtyMap[item.project.id] = item.quantity

  const allProjIds = new Set([...Object.keys(oldQtyMap), ...Object.keys(newQtyMap)])
  const addedProjects: { project: Project; quantity: number }[] = []
  const removedProjects: { project: Project; quantity: number }[] = []
  const changedProjects: { project: Project; oldQty: number; newQty: number }[] = []

  for (const pid of allProjIds) {
    const p = allProjects.find(x => x.id === pid)
    if (!p) continue
    const old = oldQtyMap[pid] ?? 0
    const ne = newQtyMap[pid] ?? 0
    if (old === 0 && ne > 0) addedProjects.push({ project: p, quantity: ne })
    else if (old > 0 && ne === 0) removedProjects.push({ project: p, quantity: old })
    else if (old !== ne) changedProjects.push({ project: p, oldQty: old, newQty: ne })
  }

  const oldDiscSet = new Set(oldQ.discountIds)
  const newDiscSet = new Set(newDiscounts.map(d => d.id))
  const addedDiscounts = allDiscounts.filter(d => newDiscSet.has(d.id) && !oldDiscSet.has(d.id))
  const removedDiscounts = allDiscounts.filter(d => oldDiscSet.has(d.id) && !newDiscSet.has(d.id))

  const oldActivityTotal = (() => {
    let s = 0
    for (const pid of oldQ.projectIds) {
      const p = allProjects.find(x => x.id === pid)
      if (!p) continue
      const qty = oldQtyMap[pid] ?? 1
      s += p.activityPrice * qty
    }
    return s
  })()

  const activityDiff = newActivityTotal - oldActivityTotal
  const confirmedPriceDifference = newConfirmedFinal - (oldQ.totalPrice ?? oldActivityTotal)
  const finalPriceDifference = newFinal - (oldQ.finalPrice ?? oldQ.totalPrice ?? oldActivityTotal)

  const priceDifference = confirmedPriceDifference

  return { addedProjects, removedProjects, changedProjects, addedDiscounts, removedDiscounts, priceDifference, confirmedPriceDifference, finalPriceDifference }
}

export default function Quotation() {
  const {
    projects, quotationItems, removeQuotationItem, updateQuotationItemQuantity,
    discounts, appliedDiscounts, toggleDiscount,
    confirmedDiscounts, confirmDiscount,
    hesitationReason, setHesitationReason, memberLevel, saveQuotation,
    savedQuotations, activeSavedQuotationId, parentQuotationId, rootQuotationId,
    loadSavedQuotation, deleteSavedQuotation, updateSavedQuotation,
    updateQuotationFollowStatus, currentCustomer, customers, setCurrentCustomer,
    getNextVersionNumber,
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
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [diffQuotationId, setDiffQuotationId] = useState<string | null>(null)
  const [followFilter, setFollowFilter] = useState<FollowStatus | 'all'>('all')
  const [quotationRemark, setQuotationRemark] = useState('')
  const quotationRef = useRef<HTMLDivElement>(null)

  const today = new Date().toISOString().split('T')[0]
  const nonExpiredDiscounts = discounts.filter(d => !isExpired(d.validUntil))

  const {
    effectiveApplied, confirmedApplied, conflicts, excluded,
    discountAmount, confirmedDiscountAmount, exclusiveLock, verificationItems
  } = useMemo(() => {
    const res = computeEffectiveDiscounts(quotationItems, appliedDiscounts, confirmedDiscounts, discounts)
    return {
      effectiveApplied: res.applied,
      confirmedApplied: res.confirmedApplied,
      conflicts: res.conflicts,
      excluded: res.excluded,
      discountAmount: res.savings,
      confirmedDiscountAmount: res.confirmedSavings,
      exclusiveLock: res.allDisabledDueToExclusive,
      verificationItems: res.verificationItems,
    }
  }, [quotationItems, appliedDiscounts, confirmedDiscounts, discounts])

  const { originalTotal, activityTotal, floorTotal, finalTotal, confirmedFinalTotal } = useMemo(() => {
    const orig = quotationItems.reduce((s, i) => s + i.project.standardPrice * i.quantity, 0)
    const act = quotationItems.reduce((s, i) => s + i.project.activityPrice * i.quantity, 0)
    const floor = quotationItems.reduce((s, i) => s + i.project.lowestPrice * i.quantity, 0)
    return {
      originalTotal: orig,
      activityTotal: act,
      floorTotal: floor,
      finalTotal: Math.max(act - discountAmount, floor),
      confirmedFinalTotal: Math.max(act - confirmedDiscountAmount, floor),
    }
  }, [quotationItems, discountAmount, confirmedDiscountAmount])

  const groupedDiscounts = useMemo(() => {
    const applicable: Discount[] = []
    const needApproval: Discount[] = []
    const notApplicable: Discount[] = []

    for (const d of nonExpiredDiscounts) {
      const catOK = d.includeCategories.length === 0 ||
        quotationItems.some(i => d.includeCategories.includes(i.project.category))
      if (!catOK && quotationItems.length > 0) {
        notApplicable.push(d)
        continue
      }
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

  const filteredCustomerHistory = useMemo(() => {
    if (followFilter === 'all') return customerQuotationHistory
    return customerQuotationHistory.filter(q => (q.followStatus ?? '草稿') === followFilter)
  }, [customerQuotationHistory, followFilter])

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

  const versionChain = useMemo(() => {
    const root = rootQuotationId ?? activeSavedQuotationId
    if (!root) return []
    return savedQuotations
      .filter(q => q.rootQuotationId === root || q.id === root || q.parentQuotationId === root)
      .sort((a, b) => a.versionNumber - b.versionNumber)
  }, [savedQuotations, rootQuotationId, activeSavedQuotationId])

  const diff = useMemo(() => {
    if (!diffQuotationId) return null
    const old = savedQuotations.find(q => q.id === diffQuotationId) ?? null
    return computeQuotationDiff(
      old, quotationItems, effectiveApplied, confirmedApplied,
      projects, discounts, activityTotal, confirmedFinalTotal, finalTotal
    )
  }, [diffQuotationId, savedQuotations, quotationItems, effectiveApplied, projects, discounts])

  useEffect(() => {
    for (const d of appliedDiscounts) {
      const disc = discounts.find(x => x.id === d)
      if (!disc) continue
      const catOK = disc.includeCategories.length === 0 ||
        quotationItems.some(i => disc.includeCategories.includes(i.project.category))
      const allExcluded = quotationItems.length > 0 &&
        quotationItems.every(i => disc.excludeIds.includes(i.project.id))
      if ((!catOK || allExcluded) && quotationItems.length > 0) {
        toggleDiscount(d)
      }
    }
  }, [quotationItems, appliedDiscounts, discounts, toggleDiscount])

  useEffect(() => { setHasChanges(true) },
    [quotationItems, appliedDiscounts, hesitationReason, currentCustomer, confirmedDiscounts])
  useEffect(() => { setHasChanges(false) },
    [activeSavedQuotationId, parentQuotationId])

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

  const buildQuotation = (mode: 'new-root' | 'new-child' | 'update'): Quotation => {
    const projectQuantities: ProjectQuantity[] = quotationItems.map(i => ({
      projectId: i.project.id,
      quantity: i.quantity,
    }))
    const parent = activeSavedQuotationId ?? parentQuotationId
    const root = rootQuotationId ?? (activeSavedQuotationId ? savedQuotations.find(q => q.id === activeSavedQuotationId)?.rootQuotationId : null)

    let versionNumber = 1
    let versionLabel: VersionLabel = '原始版'
    if (mode !== 'new-root') {
      versionNumber = getNextVersionNumber(root ?? null, parent ?? null)
      versionLabel = versionNumber === 1 ? '原始版' : '调整版'
    }

    const approvalNeeded = effectiveApplied.filter(d => d.needApproval)
    const approvalNotConfirmed = approvalNeeded.filter(d => !confirmedDiscounts.includes(d.id))
    let verificationNote = ''
    if (effectiveApplied.length === 0) {
      verificationNote = '未使用优惠 · 按活动价成交'
    } else if (approvalNotConfirmed.length > 0) {
      verificationNote = `核验通过 · 待主管确认 · 未确认：${approvalNotConfirmed.map(d => d.name).join('、')}`
    } else if (approvalNeeded.length > 0) {
      verificationNote = `核验通过 · 主管已确认 · 已确认：${approvalNeeded.map(d => d.name).join('、')}`
    } else {
      verificationNote = '核验通过 · 可直接成交'
    }

    const existing = (mode === 'update' && activeSavedQuotationId)
      ? savedQuotations.find(q => q.id === activeSavedQuotationId)
      : null

    return {
      id: mode === 'update' ? (activeSavedQuotationId ?? `q_${Date.now()}`) : `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      customerId: currentCustomer?.id ?? '',
      customerName: currentCustomer?.name ?? '',
      memberLevel: (currentCustomer?.memberLevel ?? memberLevel ?? '普通') as MemberLevel,
      projectIds: quotationItems.map(i => i.project.id),
      projectQuantities,
      discountIds: effectiveApplied.map(d => d.id),
      confirmedDiscountIds: confirmedDiscounts.filter(id => effectiveApplied.some(d => d.id === id)),
      totalPrice: Math.round(confirmedFinalTotal),
      finalPrice: Math.round(finalTotal),
      hesitationReason: hesitationReason as HesitationReason,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: '草稿',
      followStatus: existing?.followStatus ?? '草稿',
      versionNumber,
      versionLabel,
      parentQuotationId: mode === 'update' ? (existing?.parentQuotationId ?? null) : (parent ?? null),
      rootQuotationId: mode === 'update'
        ? (existing?.rootQuotationId ?? null)
        : (root ?? (parent ? parent : null)),
      verificationNote,
      verificationItems,
      remark: quotationRemark,
    }
  }

  const handleSave = () => {
    if (quotationItems.length === 0) return
    let mode: 'new-root' | 'new-child' | 'update'
    if (activeSavedQuotationId && parentQuotationId === null && rootQuotationId === null) {
      mode = 'new-child'
    } else if (activeSavedQuotationId && !hasChanges) {
      mode = 'update'
    } else if (activeSavedQuotationId && hasChanges) {
      mode = 'new-child'
    } else if (parentQuotationId) {
      mode = 'new-child'
    } else {
      mode = 'new-root'
    }
    const q = buildQuotation(mode)
    if (mode === 'update') {
      updateSavedQuotation(q)
      setToastMsg('报价已更新')
    } else {
      saveQuotation(q)
      setToastMsg(mode === 'new-root' ? '原始版报价已保存' : `v${q.versionNumber} ${q.versionLabel} 已保存（未覆盖原记录）`)
    }
    setToastType('success')
    setShowSaveToast(true)
    setHasChanges(false)
  }

  const handleUpdateFollow = (quotationId: string, status: FollowStatus) => {
    let versionLabel: VersionLabel | undefined
    if (status === '已成交') versionLabel = '最终成交版'
    updateQuotationFollowStatus(quotationId, status, versionLabel)
    setToastMsg(versionLabel ? `已标记为「${status}」· 自动升级为最终成交版` : `已更新跟进状态`)
    setToastType('success')
    setShowSaveToast(true)
  }

  const handleCopyId = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(text)
      setTimeout(() => setCopiedId(null), 1500)
    } catch { /* ignore */ }
  }

  const appliedVerificationItems = verificationItems.filter(v => appliedDiscounts.includes(v.discountId))
  const approvalNeededItems = appliedVerificationItems.filter(v => v.needApproval && v.applicable)
  const approvalNotConfirmed = approvalNeededItems.filter(v => !v.confirmed)
  const approvalConfirmed = approvalNeededItems.filter(v => v.confirmed)
  const appliedEffectiveIds = effectiveApplied.map(d => d.id)

  const conclusionText = useMemo(() => {
    if (effectiveApplied.length === 0) return '未使用优惠 · 按活动价成交'
    if (approvalNotConfirmed.length > 0) return `核验通过 · ${approvalNotConfirmed.length}个优惠待主管确认`
    if (approvalConfirmed.length > 0) return `核验通过 · 主管已确认 · 可成交`
    return '核验通过 · 可直接成交'
  }, [effectiveApplied, approvalNotConfirmed, approvalConfirmed])

  const memberLevelColor = (level: string) => {
    switch (level) {
      case '钻石': return 'bg-purple-50 text-purple-600 border-purple-200'
      case '金卡': return 'bg-amber-50 text-amber-700 border-amber-200'
      case '银卡': return 'bg-slate-50 text-slate-600 border-slate-200'
      default: return 'bg-warm-50 text-warm-600 border-warm-200'
    }
  }

  const followStatusColor = (status: FollowStatus) =>
    FOLLOW_STATUS_OPTS.find(o => o.value === status)?.color ?? FOLLOW_STATUS_OPTS[0].color

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
    const [searchText, setSearchText] = useState('')
    const filteredCustomers = customers.filter(c =>
      !searchText || c.name.includes(searchText) || c.phone.includes(searchText)
    )
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={onClose} />
        <div className="absolute top-0 right-0 bottom-0 w-[88%] max-w-sm bg-warm-50 overflow-y-auto" style={{ animation: 'slideInRight 0.3s ease-out' }}>
          <div className="sticky top-0 z-10 bg-warm-50 px-4 py-3 border-b border-warm-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-warm-900">顾客资料</h3>
              <button onClick={onClose}><X className="w-5 h-5 text-warm-400" /></button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-warm-200">
              <Search className="w-3.5 h-3.5 text-warm-400 shrink-0" />
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="搜索姓名或电话"
                className="flex-1 bg-transparent text-xs text-warm-800 outline-none placeholder-warm-300"
              />
            </div>
          </div>

          <div className="p-4 space-y-4 pb-24">
            <div>
              <p className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                <UserCircle2 className="w-3.5 h-3.5" />顾客列表
              </p>
              <div className="space-y-2">
                {filteredCustomers.map(c => {
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
                <div className="bg-white rounded-2xl p-4 shadow-card">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      'w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-semibold',
                      currentCustomer.memberLevel === '钻石' ? 'bg-purple-500' :
                      currentCustomer.memberLevel === '金卡' ? 'bg-amber-500' :
                      currentCustomer.memberLevel === '银卡' ? 'bg-slate-400' : 'bg-warm-400'
                    )}>
                      {currentCustomer.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
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

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-warm-500 flex items-center gap-1">
                      <History className="w-3.5 h-3.5" />历史报价 ({filteredCustomerHistory.length}/{customerQuotationHistory.length})
                    </p>
                    <div className="flex items-center gap-1">
                      <Filter className="w-3 h-3 text-warm-400" />
                      <select
                        value={followFilter}
                        onChange={(e) => setFollowFilter(e.target.value as FollowStatus | 'all')}
                        className="bg-white text-[10px] text-warm-700 px-1.5 py-0.5 rounded-lg border border-warm-200 outline-none"
                      >
                        <option value="all">全部状态</option>
                        {FOLLOW_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  {customerQuotationHistory.length === 0 ? (
                    <p className="text-xs text-warm-300 text-center py-4 bg-white rounded-xl">暂无历史报价</p>
                  ) : filteredCustomerHistory.length === 0 ? (
                    <p className="text-xs text-warm-300 text-center py-4 bg-white rounded-xl">当前筛选无结果</p>
                  ) : (
                    <div className="space-y-2">
                      {[...filteredCustomerHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(q => {
                        const statusOpt = FOLLOW_STATUS_OPTS.find(o => o.value === (q.followStatus ?? '草稿'))
                        const confirmedCount = (q.confirmedDiscountIds ?? []).length
                        const appliedCount = q.discountIds.length
                        const pendingCount = appliedCount - confirmedCount
                        return (
                          <div key={q.id} className="bg-white rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border font-medium',
                                  q.versionLabel === '原始版' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                  q.versionLabel === '最终成交版' ? 'bg-green-50 text-green-700 border-green-200' :
                                  'bg-amber-50 text-amber-700 border-amber-200'
                                )}>
                                  v{q.versionNumber} {q.versionLabel}
                                </span>
                                {statusOpt && (
                                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border', statusOpt.color)}>
                                    {statusOpt.label}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-rose-gold">¥{q.totalPrice.toLocaleString()}</span>
                                {pendingCount > 0 && (
                                  <span className="text-[9px] text-amber-600">+¥{Math.round((q.finalPrice ?? q.totalPrice) - q.totalPrice).toLocaleString()} 待批</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] text-warm-400 flex items-center gap-0.5">
                                <Calendar className="w-2.5 h-2.5" />{formatDateShort(q.createdAt)}
                              </span>
                              {q.parentQuotationId && (
                                <button
                                  onClick={() => handleCopyId(q.parentQuotationId!)}
                                  className="text-[10px] text-warm-400 hover:text-warm-600"
                                  title="点击复制源报价ID"
                                >
                                  源自: {copiedId === q.parentQuotationId ? '已复制' : formatDateShort(savedQuotations.find(s => s.id === q.parentQuotationId)?.createdAt ?? '')}
                                </button>
                              )}
                            </div>
                            <p className="text-[11px] text-warm-500 truncate mb-1">
                              <ShoppingBag className="w-3 h-3 inline mr-1 -mt-0.5" />
                              {q.projectIds.length}项 · {q.projectIds.map(id => getProjectById(id)?.name).filter(Boolean).slice(0, 2).join('、')}{q.projectIds.length > 2 ? '...' : ''}
                            </p>
                            {(confirmedCount > 0 || pendingCount > 0) && (
                              <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                                {confirmedCount > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                                    ✓ 已确认 {confirmedCount}
                                  </span>
                                )}
                                {pendingCount > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    ⚠ 待批 {pendingCount}
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="grid grid-cols-4 gap-1 mt-1.5">
                              <button
                                onClick={() => { loadSavedQuotation(q.id, true); onClose() }}
                                className="py-1.5 bg-rose-gold text-white text-[10px] rounded-lg font-medium flex items-center justify-center gap-0.5"
                                title="打开即生成新版本，不覆盖原记录"
                              >
                                <FileEdit className="w-3 h-3" />打开
                              </button>
                              <button
                                onClick={() => { setDiffQuotationId(q.id); onClose() }}
                                className="py-1.5 bg-blue-50 text-blue-600 text-[10px] rounded-lg font-medium flex items-center justify-center gap-0.5"
                              >
                                <GitCompare className="w-3 h-3" />对比
                              </button>
                              <select
                                value={q.followStatus ?? '草稿'}
                                onChange={(e) => handleUpdateFollow(q.id, e.target.value as FollowStatus)}
                                className="py-1.5 bg-warm-50 text-warm-700 text-[10px] rounded-lg outline-none text-center px-0"
                              >
                                {FOLLOW_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                              <button
                                onClick={() => { deleteSavedQuotation(q.id) }}
                                className="py-1.5 bg-warm-100 text-warm-500 text-[10px] rounded-lg font-medium flex items-center justify-center"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs text-warm-500 mb-2 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" />常做项目 Top 3
                  </p>
                  {frequentProjects.length === 0 ? (
                    <p className="text-xs text-warm-300 text-center py-4 bg-white rounded-xl">暂无数据</p>
                  ) : (
                    <div className="space-y-2">
                      {frequentProjects.map(({ project, count }, idx) => (
                        <div key={project.id} className="bg-white rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn(
                              'w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0',
                              idx === 0 ? 'bg-amber-400 text-white' :
                              idx === 1 ? 'bg-slate-300 text-white' :
                              'bg-amber-200 text-amber-800'
                            )}>
                              {idx + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-warm-800 truncate">{project.name}</p>
                              <p className="text-[10px] text-warm-400">{project.category} · {project.brand}</p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-rose-gold shrink-0 ml-2">x{count}次</span>
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
    <div className="max-w-md mx-auto min-h-screen bg-warm-50 pb-32">
      <div className="sticky top-0 z-40 bg-warm-50 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-lg font-semibold text-warm-900 flex items-center gap-2">
              顾客报价单
              {(activeSavedQuotationId || parentQuotationId) && (
                <span className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-0.5',
                  activeSavedQuotationId && !parentQuotationId
                    ? 'bg-blue-50 text-blue-600 border-blue-200'
                    : 'bg-cyan-50 text-cyan-600 border-cyan-200'
                )}>
                  {activeSavedQuotationId && !parentQuotationId ? <FileEdit className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                  {activeSavedQuotationId && !parentQuotationId ? '打开历史 · 默认保存为新版本' : '另存草稿'}
                </span>
              )}
            </h1>
            <p className="text-[11px] text-warm-400 mt-0.5">{today} · 修改后保存默认生成新版本</p>
          </div>
          <button
            onClick={() => setShowCustomerDrawer(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-warm-600 text-xs shadow-card"
          >
            {currentCustomer ? (
              <>
                <span className={cn(
                  'w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-semibold',
                  currentCustomer.memberLevel === '钻石' ? 'bg-purple-500' :
                  currentCustomer.memberLevel === '金卡' ? 'bg-amber-500' :
                  currentCustomer.memberLevel === '银卡' ? 'bg-slate-400' : 'bg-warm-400'
                )}>
                  {currentCustomer.name.charAt(0)}
                </span>
                {currentCustomer.name}
              </>
            ) : (
              <><User className="w-3.5 h-3.5" />选择顾客</>
            )}
          </button>
        </div>

        {versionChain.length > 1 && (
          <div className="bg-white rounded-xl p-2.5 border border-warm-100 mb-1">
            <div className="flex items-center gap-1.5 mb-2">
              <Flag className="w-3 h-3 text-warm-500" />
              <p className="text-[11px] text-warm-600 font-medium">版本链（共{versionChain.length}个版本）</p>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {versionChain.map(q => {
                const confirmedCount = (q.confirmedDiscountIds ?? []).length
                const pendingCount = q.discountIds.length - confirmedCount
                return (
                  <button
                    key={q.id}
                    onClick={() => { loadSavedQuotation(q.id, true) }}
                    className={cn(
                      'shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] border flex flex-col items-start',
                      activeSavedQuotationId === q.id
                        ? 'bg-rose-gold50 border-rose-goldLight text-rose-gold'
                        : 'bg-warm-50 border-warm-200 text-warm-600'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      <span className="font-semibold">v{q.versionNumber} {q.versionLabel}</span>
                      {pendingCount > 0 && (
                        <span className="text-[9px] text-amber-600 bg-amber-50 rounded px-1">⚠{pendingCount}</span>
                      )}
                      {confirmedCount > 0 && pendingCount === 0 && (
                        <span className="text-[9px] text-green-700 bg-green-50 rounded px-1">✓</span>
                      )}
                    </div>
                    <span className="opacity-75">{formatDateShort(q.createdAt)} · ¥{q.totalPrice.toLocaleString()}</span>
                    {(q.followStatus && q.followStatus !== '草稿') && (
                      <span className={cn('mt-0.5 px-1 py-0 rounded text-[9px]', followStatusColor(q.followStatus ?? '草稿'))}>
                        {q.followStatus}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 space-y-4">
        {currentCustomer && (
          <div className="bg-white rounded-2xl p-3 shadow-card flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold',
                currentCustomer.memberLevel === '钻石' ? 'bg-purple-500' :
                currentCustomer.memberLevel === '金卡' ? 'bg-amber-500' :
                currentCustomer.memberLevel === '银卡' ? 'bg-slate-400' : 'bg-warm-400'
              )}>
                {currentCustomer.name.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-semibold text-warm-900">{currentCustomer.name}</p>
                <p className="text-[11px] text-warm-400 flex items-center gap-1">
                  <Award className="w-2.5 h-2.5" />{currentCustomer.memberLevel}会员 · {currentCustomer.phone}
                </p>
              </div>
            </div>
            <span className="text-[11px] text-warm-400">自动带入报价</span>
          </div>
        )}

        {diff && (() => {
          const old = savedQuotations.find(q => q.id === diffQuotationId)
          const pendingCount = approvalNotConfirmed.length
          return (
            <div className="bg-blue-50/70 rounded-2xl p-3 border border-blue-100">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5">
                  <GitCompare className="w-3.5 h-3.5 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-800">与 v{old?.versionNumber} {old?.versionLabel} 对比</p>
                  <span className="text-[10px] text-blue-500">({formatDateShort(old?.createdAt ?? '')})</span>
                </div>
                <button
                  onClick={() => setDiffQuotationId(null)}
                  className="text-blue-500 text-[11px] hover:text-blue-700"
                >
                  关闭对比
                </button>
              </div>
              <div className="space-y-2 text-[11px]">
                {diff.addedProjects.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <Plus className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-green-700">新增项目：{diff.addedProjects.map(p => `${p.project.name}×${p.quantity}`).join('、')}</p>
                  </div>
                )}
                {diff.removedProjects.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <Minus className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-red-600">减少项目：{diff.removedProjects.map(p => `${p.project.name}×${p.quantity}`).join('、')}</p>
                  </div>
                )}
                {diff.changedProjects.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <GitCompare className="w-3 h-3 text-amber-600 mt-0.5 shrink-0" />
                    <p className="text-amber-700">数量变更：{diff.changedProjects.map(p => `${p.project.name} ${p.oldQty}→${p.newQty}`).join('、')}</p>
                  </div>
                )}
                {diff.addedDiscounts.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <Plus className="w-3 h-3 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-green-700">新增优惠：{diff.addedDiscounts.map(d => d.name).join('、')}</p>
                  </div>
                )}
                {diff.removedDiscounts.length > 0 && (
                  <div className="flex items-start gap-1.5">
                    <Minus className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />
                    <p className="text-red-600">取消优惠：{diff.removedDiscounts.map(d => d.name).join('、')}</p>
                  </div>
                )}
                <div className="pt-1.5 border-t border-blue-100 mt-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-600 flex items-center gap-0.5">
                      <CircleCheck className="w-3 h-3" />已确认成交价差额
                    </span>
                    <span className={cn(
                      'text-sm font-bold',
                      diff.confirmedPriceDifference > 0 ? 'text-red-600' :
                      diff.confirmedPriceDifference < 0 ? 'text-green-600' : 'text-warm-600'
                    )}>
                      {diff.confirmedPriceDifference > 0 ? '+' : ''}¥{Math.round(diff.confirmedPriceDifference).toLocaleString()}
                    </span>
                  </div>
                  {pendingCount > 0 && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-amber-600 flex items-center gap-0.5">
                        <CircleAlert className="w-3 h-3" />含 {pendingCount} 项待批优惠（未计入）
                      </span>
                      <span className={cn(
                        'font-semibold',
                        diff.finalPriceDifference < diff.confirmedPriceDifference ? 'text-green-600' :
                        diff.finalPriceDifference > diff.confirmedPriceDifference ? 'text-red-600' : 'text-warm-600'
                      )}>
                        若全部确认：{diff.finalPriceDifference > 0 ? '+' : ''}¥{Math.round(diff.finalPriceDifference).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        <section>
          <h2 className="text-sm font-semibold text-warm-800 mb-2 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4" />项目明细
          </h2>
          <div className="space-y-2">
            {quotationItems.map(item => {
              const expanded = expandedItem === item.project.id
              return (
                <div key={item.project.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                  <div className="p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-medium text-warm-900">{item.project.name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-100 text-warm-600">{item.project.category}</span>
                        </div>
                        <p className="text-[11px] text-warm-400 mt-0.5">{item.project.brand} · {item.project.spec}</p>
                      </div>
                      <p className="text-sm font-bold text-rose-gold shrink-0">¥{(item.project.activityPrice * item.quantity).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-warm-100 rounded-lg">
                          <button
                            onClick={() => {
                              if (item.quantity <= 1) removeQuotationItem(item.project.id)
                              else updateQuotationItemQuantity(item.project.id, item.quantity - 1)
                            }}
                            className="w-7 h-7 flex items-center justify-center text-warm-500 active:bg-warm-200 rounded-lg"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center text-sm font-medium text-warm-800">{item.quantity}</span>
                          <button
                            onClick={() => updateQuotationItemQuantity(item.project.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center text-warm-500 active:bg-warm-200 rounded-lg"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[10px] text-warm-400">
                          标准 ¥{item.project.standardPrice.toLocaleString()} <span className="line-through opacity-60" /> · 活动 ¥{item.project.activityPrice.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setExpandedItem(expanded ? null : item.project.id)}
                          className="w-7 h-7 flex items-center justify-center text-warm-400 active:bg-warm-100 rounded-lg"
                        >
                          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => removeQuotationItem(item.project.id)}
                          className="w-7 h-7 flex items-center justify-center text-warm-300 active:bg-warm-100 active:text-red-500 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-3 pb-3 pt-1 bg-warm-50 border-t border-warm-100 text-[11px] space-y-1">
                      <div className="flex justify-between text-warm-500"><span>部位</span><span className="text-warm-700">{item.project.bodyPart}</span></div>
                      <div className="flex justify-between text-warm-500"><span>疗程</span><span className="text-warm-700">{item.project.sessions}次 · 单次¥{item.project.sessionPrice.toLocaleString()}</span></div>
                      <div className="flex justify-between text-warm-500"><span>最低成交</span><span className="text-amber-700 font-medium">¥{item.project.lowestPrice.toLocaleString()}</span></div>
                      {!item.project.canStack && (
                        <div className="flex justify-between items-start text-warm-500 gap-2">
                          <span className="flex items-center gap-0.5 shrink-0"><ShieldAlert className="w-3 h-3 mt-0.5" />限制</span>
                          <span className="text-warm-600 whitespace-pre-wrap break-words text-right">{item.project.stackNote}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
            {quotationItems.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-warm-200">
                <ShoppingBag className="w-10 h-10 text-warm-200 mx-auto mb-2" />
                <p className="text-warm-400 text-sm">尚未选择项目</p>
                <p className="text-warm-300 text-xs mt-1">从今日价格页面添加</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-warm-800 mb-2 flex items-center gap-1.5">
            <Tag className="w-4 h-4" />优惠核验清单
          </h2>
          {conflicts.length > 0 && (
            <div className="mb-2.5 p-2.5 bg-amber-50 rounded-xl text-[11px] text-amber-700 flex items-start gap-1.5 border border-amber-100">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium mb-0.5">存在互斥冲突，系统自动选取优惠力度最大的单条</p>
                {conflicts.map((c, i) => (
                  <p key={i} className="text-amber-600">· {c[0]} 与 {c[1]} 不可同时使用</p>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2.5">
            {groupedDiscounts.applicable.length > 0 && (
              <DiscountGroup title="✓ 适用优惠" icon={CircleCheck} iconClass="text-green-500" count={groupedDiscounts.applicable.length}>
                {groupedDiscounts.applicable.map(d => (
                  <DiscountCard
                    key={d.id}
                    d={d}
                    variant="applicable"
                    expanded={expandedDiscount === d.id}
                    onToggleExpand={() => setExpandedDiscount(expandedDiscount === d.id ? null : d.id)}
                    excluded={excluded.find(e => e.discount.id === d.id)}
                    applied={appliedDiscounts.includes(d.id)}
                    effectiveNow={appliedEffectiveIds.includes(d.id)}
                    exclusiveLock={exclusiveLock}
                    confirmed={true}
                    onToggleApply={() => toggleDiscount(d.id)}
                  />
                ))}
              </DiscountGroup>
            )}
            {groupedDiscounts.needApproval.length > 0 && (
              <DiscountGroup title="⚠ 需主管确认" icon={CircleAlert} iconClass="text-amber-500" count={groupedDiscounts.needApproval.length}>
                {groupedDiscounts.needApproval.map(d => {
                  const isConfirmed = confirmedDiscounts.includes(d.id)
                  return (
                    <div key={d.id}>
                      <DiscountCard
                        d={d}
                        variant="approval"
                        expanded={expandedDiscount === d.id}
                        onToggleExpand={() => setExpandedDiscount(expandedDiscount === d.id ? null : d.id)}
                        excluded={excluded.find(e => e.discount.id === d.id)}
                        applied={appliedDiscounts.includes(d.id)}
                        effectiveNow={appliedEffectiveIds.includes(d.id)}
                        exclusiveLock={exclusiveLock}
                        confirmed={isConfirmed}
                        onToggleApply={() => toggleDiscount(d.id)}
                      />
                      {appliedDiscounts.includes(d.id) && (
                        <div className="mt-1.5 mb-2 ml-2 p-2.5 bg-amber-50 rounded-xl border border-amber-100">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <BadgeCheck className={cn('w-3.5 h-3.5', isConfirmed ? 'text-green-600' : 'text-amber-600')} />
                              <p className="text-[11px] text-amber-800 font-medium">
                                {isConfirmed ? '主管已确认' : '待主管签字确认'}
                              </p>
                            </div>
                            <button
                              onClick={() => confirmDiscount(d.id, !isConfirmed)}
                              className={cn(
                                'text-[11px] px-2.5 py-1 rounded-lg font-medium',
                                isConfirmed
                                  ? 'bg-green-100 text-green-700 active:bg-green-200'
                                  : 'bg-amber-100 text-amber-700 active:bg-amber-200'
                              )}
                            >
                              {isConfirmed ? '✓ 已确认 · 点击取消' : '标记为已确认'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </DiscountGroup>
            )}
            {groupedDiscounts.notApplicable.length > 0 && (
              <DiscountGroup title="⊘ 不适用" icon={CircleX} iconClass="text-warm-400" count={groupedDiscounts.notApplicable.length} muted>
                {groupedDiscounts.notApplicable.map(d => (
                  <DiscountCard
                    key={d.id}
                    d={d}
                    variant="not-applicable"
                    expanded={expandedDiscount === d.id}
                    onToggleExpand={() => setExpandedDiscount(expandedDiscount === d.id ? null : d.id)}
                    excluded={excluded.find(e => e.discount.id === d.id)}
                    applied={false}
                    effectiveNow={false}
                    exclusiveLock={false}
                    confirmed={false}
                    disabled
                    onToggleApply={() => { }}
                  />
                ))}
              </DiscountGroup>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-3 shadow-card">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-sm font-semibold text-warm-800 flex items-center gap-1.5">
              <CheckCircle2 className={cn(
                'w-4 h-4',
                approvalNotConfirmed.length > 0 ? 'text-amber-500' : effectiveApplied.length > 0 ? 'text-green-500' : 'text-warm-400'
              )} />
              核验结论
            </h3>
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-medium',
              approvalNotConfirmed.length > 0 ? 'bg-amber-50 text-amber-700' :
              effectiveApplied.length > 0 ? 'bg-green-50 text-green-700' : 'bg-warm-100 text-warm-600'
            )}>
              {conclusionText}
            </span>
          </div>
          <div className="space-y-1.5">
            {appliedVerificationItems.length === 0 ? (
              <p className="text-[11px] text-warm-400">未选择优惠</p>
            ) : (
              appliedVerificationItems.map(v => {
                const disc = discounts.find(d => d.id === v.discountId)
                return (
                  <div key={v.discountId} className="flex items-start gap-1.5 p-2 bg-warm-50 rounded-lg">
                    {v.needApproval && !v.confirmed ? (
                      <CircleAlert className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                    ) : v.applicable ? (
                      <CircleCheck className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                    ) : (
                      <CircleX className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-warm-800 flex items-center gap-1">
                        {v.discountName}
                        {disc?.needApproval && (
                          <span className={cn(
                            'text-[9px] px-1 py-0 rounded',
                            v.confirmed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                          )}>
                            {v.confirmed ? '✓已确认' : '待确认'}
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-warm-500 whitespace-pre-wrap break-words">{v.reason}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

        <section className="bg-gradient-to-br from-warm-50 to-rose-gold50 rounded-2xl p-4 shadow-card border border-warm-100">
          <h2 className="text-sm font-semibold text-warm-800 mb-3 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4" />价格汇总
          </h2>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between items-center text-warm-600">
              <span className="text-[11px]">标准价</span>
              <span className="line-through text-warm-400 text-xs">¥{Math.round(originalTotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-warm-700">
              <span className="text-[11px]">活动价合计</span>
              <span className="text-xs">¥{Math.round(activityTotal).toLocaleString()}</span>
            </div>
            {confirmedDiscountAmount > 0 && (
              <div className="flex justify-between items-center text-rose-gold">
                <span className="text-[11px] flex items-center gap-0.5">
                  <CircleCheck className="w-3 h-3" />已确认优惠减免
                </span>
                <span className="text-xs">-¥{Math.round(confirmedDiscountAmount).toLocaleString()}</span>
              </div>
            )}
            {approvalNotConfirmed.length > 0 && (
              <div className="flex justify-between items-center text-amber-600">
                <span className="text-[11px] flex items-center gap-0.5">
                  <CircleAlert className="w-3 h-3" />待批优惠减免（待主管确认）
                </span>
                <span className="text-xs">-¥{Math.round(discountAmount - confirmedDiscountAmount).toLocaleString()}（待生效）</span>
              </div>
            )}
            <div className="flex justify-between items-center text-warm-500 pt-1 border-t border-dashed border-warm-200">
              <span className="text-[11px]">成交底线（合计）</span>
              <span className="text-xs">¥{Math.round(floorTotal).toLocaleString()}</span>
            </div>
            <div className="pt-2.5 mt-1 border-t border-warm-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-warm-700 font-medium">实际成交价（已确认）</span>
                <span className="text-xl font-bold text-rose-gold">¥{Math.round(confirmedFinalTotal).toLocaleString()}</span>
              </div>
              {approvalNotConfirmed.length > 0 && (
                <p className="mt-1.5 text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-100 flex items-start gap-1">
                  <Info className="w-3 h-3 shrink-0 mt-0.5" />
                  <span>
                    待批优惠：{approvalNotConfirmed.map(v => v.discountName).join('、')}，
                    若主管全部确认，最终可成交 <span className="font-semibold text-amber-800">¥{Math.round(finalTotal).toLocaleString()}</span>
                    （再减 ¥{Math.round(discountAmount - confirmedDiscountAmount).toLocaleString()}）
                  </span>
                </p>
              )}
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-warm-600 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" />备注
            </h3>
          </div>
          <textarea
            value={quotationRemark}
            onChange={(e) => setQuotationRemark(e.target.value)}
            placeholder="面谈记录、客户特殊要求、犹豫点……"
            className="w-full bg-white rounded-xl p-3 text-xs text-warm-800 placeholder-warm-300 border border-warm-200 focus:outline-none focus:border-rose-gold transition-colors"
            rows={2}
          />
        </section>
      </div>

      <div ref={quotationRef} className="sr-only">
        <QuotationImage
          items={quotationItems}
          totalPrice={Math.round(confirmedFinalTotal)}
          customerName={currentCustomer?.name ?? ''}
          memberLevel={(currentCustomer?.memberLevel ?? memberLevel) as MemberLevel}
          confirmedDiscounts={confirmedApplied}
          pendingDiscounts={effectiveApplied.filter(d => d.needApproval && !confirmedDiscounts.includes(d.id))}
          verificationNote={verificationItems.length > 0 ? conclusionText : ''}
          remark={quotationRemark}
        />
      </div>

      <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto px-4 py-3 bg-gradient-to-t from-warm-50 via-warm-50 to-warm-50/80 z-40">
        {showHistory && (
          <HistoryPanel
            onClose={() => setShowHistory(false)}
            onOpen={(id, asNew) => { loadSavedQuotation(id, asNew); setShowHistory(false) }}
            onDiff={(id) => { setDiffQuotationId(id); setShowHistory(false) }}
            onUpdateFollow={handleUpdateFollow}
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(s => !s)}
            className="flex-1 py-3.5 rounded-2xl bg-white text-warm-700 text-sm font-medium flex items-center justify-center gap-1.5 shadow-card border border-warm-100"
          >
            <History className="w-4 h-4" />历史{savedQuotations.length > 0 && <span className="text-[10px] bg-warm-100 px-1.5 rounded-full">{savedQuotations.length}</span>}
          </button>
          <button
            onClick={handleGenerateImage}
            className="flex-1 py-3.5 rounded-2xl bg-warm-100 text-warm-700 text-sm font-medium flex items-center justify-center gap-1.5"
          >
            <Image className="w-4 h-4" />生成图片
          </button>
          <button
            onClick={handleSave}
            disabled={quotationItems.length === 0}
            className="flex-[1.6] py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-1.5 shadow-cta disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #D4A574 0%, #C9956C 100%)' }}
          >
            <Save className="w-4 h-4" />
            {(activeSavedQuotationId && hasChanges) || parentQuotationId ? '保存为新版本' : '保存报价'}
          </button>
        </div>
      </div>

      {showHesitation && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowHesitation(false)} />
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl p-5 animate-slide-up" style={{ animation: 'slideUp 0.3s ease-out' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-warm-900">记录犹豫原因</h3>
              <button onClick={() => setShowHesitation(false)}><X className="w-5 h-5 text-warm-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {HESITATION_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setHesitationReason(hesitationReason === opt.value ? '' : opt.value); setShowHesitation(false) }}
                  className={cn(
                    'p-3 rounded-xl border-2 text-left transition-colors',
                    hesitationReason === opt.value
                      ? 'border-rose-gold bg-rose-gold50 text-rose-gold'
                      : 'border-warm-100 text-warm-700 hover:border-warm-200'
                  )}
                >
                  <opt.icon className="w-5 h-5 mb-1" />
                  <p className="text-sm font-medium">{opt.label}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <Toast open={showSaveToast} onClose={() => setShowSaveToast(false)} message={toastMsg} type={toastType} />
      {showCustomerDrawer && <CustomerDrawer onClose={() => setShowCustomerDrawer(false)} />}
    </div>
  )
}

function DiscountGroup({
  title, icon: Icon, iconClass, count, muted, children
}: {
  title: string
  icon: React.ElementType
  iconClass: string
  count: number
  muted?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={cn('bg-white rounded-2xl p-3 shadow-card', muted && 'opacity-80')}>
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon className={cn('w-3.5 h-3.5', iconClass)} />
        <p className={cn('text-xs font-semibold', muted ? 'text-warm-500' : 'text-warm-800')}>{title}</p>
        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full', muted ? 'bg-warm-100 text-warm-400' : 'bg-warm-100 text-warm-600')}>{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DiscountCard({
  d, variant, expanded, onToggleExpand, excluded, applied, effectiveNow, exclusiveLock, confirmed, disabled, onToggleApply
}: {
  d: Discount
  variant: 'applicable' | 'approval' | 'not-applicable'
  expanded: boolean
  onToggleExpand: () => void
  excluded?: { discount: Discount; projects: Project[] }
  applied: boolean
  effectiveNow: boolean
  exclusiveLock: boolean
  confirmed: boolean
  disabled?: boolean
  onToggleApply: () => void
}) {
  const iconClass = variant === 'applicable' ? 'text-green-500' : variant === 'approval' ? 'text-amber-500' : 'text-warm-400'
  const Icon = variant === 'applicable' ? CircleCheck : variant === 'approval' ? CircleAlert : CircleX
  const ex = excluded

  const applicableItems = (isApplied: boolean) => {
    if (d.needApproval && isApplied) return confirmed ? '✓ 主管已确认' : '⟳ 待主管确认'
    if (variant === 'not-applicable') {
      if (d.includeCategories.length > 0) return `仅限${d.includeCategories.join('、')}类使用，当前项目不适用`
      return `所有项目均在排除范围内：${ex?.projects.map(p => p.name).join('、') ?? ''}`
    }
    if (ex && ex.projects.length > 0) return `部分不适用：${[...new Set(ex.projects.map(p => p.name))].join('、')}（其余可用）`
    if (d.includeCategories.length > 0) return `仅限${d.includeCategories.join('、')}类项目 · 当前符合条件`
    return '当前项目符合该优惠使用条件'
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleExpand}
          className={cn(
            'flex-1 flex items-center gap-2 p-2 rounded-xl text-left transition-colors',
            disabled ? 'opacity-60' : 'active:bg-warm-50'
          )}
        >
          <Icon className={cn('w-4 h-4 shrink-0', iconClass)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className={cn(
                'text-sm font-medium truncate',
                variant === 'not-applicable' ? 'text-warm-400 line-through' : 'text-warm-800'
              )}>
                {d.name}
              </p>
              {d.includeCategories.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {d.includeCategories.join('·')}专用
                </span>
              )}
              {!d.canStack && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 border border-red-100 flex items-center gap-0.5">
                  <Ban className="w-2 h-2" />不可叠加
                </span>
              )}
            </div>
          </div>
          <span className="shrink-0 text-xs text-warm-400 mx-1">
            {d.type === 'percentage' ? `${d.discountValue}折` : d.type === 'fixed' ? `-¥${d.discountValue}` : '赠送'}
          </span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-warm-400 shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-warm-400 shrink-0" />}
        </button>
        <div className="ml-1 shrink-0">
          <button
            onClick={onToggleApply}
            disabled={disabled}
            className={cn(
              'w-10 h-6 rounded-full transition-colors relative',
              disabled ? 'bg-warm-200 cursor-not-allowed' :
              applied ? (variant === 'approval' ? (confirmed ? 'bg-green-500' : 'bg-amber-500') : 'bg-rose-gold') : 'bg-warm-200'
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
        <div className="mt-1 mb-2 ml-2 p-2.5 bg-warm-50 rounded-xl text-[11px] text-warm-600 flex items-start gap-1.5 border border-warm-100">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warm-400" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-warm-700 mb-0.5">适用原因</p>
            <p className="whitespace-pre-wrap break-words">{applicableItems(applied)}</p>
            <p className="mt-1 pt-1 border-t border-warm-200 text-warm-500">{d.description}</p>
          </div>
        </div>
      )}
      {applied && !effectiveNow && !expanded && (
        <p className="text-[11px] text-amber-600 mt-0.5 mb-1.5 flex items-start gap-1 px-1">
          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
          <span>{exclusiveLock ? '与其他不可叠加优惠冲突，系统将自动选择优惠力度最大的' : '已选中但暂未生效'}</span>
        </p>
      )}
    </div>
  )
}

function HistoryPanel({
  onClose, onOpen, onDiff, onUpdateFollow
}: {
  onClose: () => void
  onOpen: (id: string, asNew: boolean) => void
  onDiff: (id: string) => void
  onUpdateFollow: (id: string, status: FollowStatus) => void
}) {
  const { savedQuotations, projects } = useAppStore()
  const getProjectById = (id: string) => projects.find(p => p.id === id)

  if (savedQuotations.length === 0) {
    return (
      <div className="mb-3 bg-white rounded-2xl p-5 shadow-card text-center">
        <History className="w-8 h-8 text-warm-200 mx-auto mb-2" />
        <p className="text-sm text-warm-400">暂无历史报价</p>
        <button onClick={onClose} className="mt-3 text-xs text-rose-gold">关闭</button>
      </div>
    )
  }

  return (
    <div className="mb-3 bg-white rounded-2xl p-3 shadow-card max-h-[55vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-warm-900">历史报价（{savedQuotations.length}）</h3>
        <button onClick={onClose} className="text-xs text-warm-400">收起</button>
      </div>
      <div className="space-y-2">
        {[...savedQuotations].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(q => {
          const statusOpt = FOLLOW_STATUS_OPTS.find(o => o.value === (q.followStatus ?? '草稿'))
          const confirmedCount = (q.confirmedDiscountIds ?? []).length
          const appliedCount = q.discountIds.length
          const pendingCount = appliedCount - confirmedCount
          return (
            <div key={q.id} className="p-3 border border-warm-100 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    'text-[9px] px-1.5 py-0.5 rounded-full border font-medium',
                    q.versionLabel === '原始版' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    q.versionLabel === '最终成交版' ? 'bg-green-50 text-green-700 border-green-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  )}>v{q.versionNumber} {q.versionLabel}</span>
                  {statusOpt && (
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full border flex items-center gap-0.5', statusOpt.color)}>
                      <statusOpt.icon className="w-2 h-2" />{statusOpt.label}
                    </span>
                  )}
                  {q.customerName && <span className="text-[9px] text-warm-400">{q.customerName}</span>}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-sm font-bold text-rose-gold">¥{q.totalPrice.toLocaleString()}</span>
                  {pendingCount > 0 && (
                    <span className="text-[9px] text-amber-600">+¥{Math.round((q.finalPrice ?? q.totalPrice) - q.totalPrice).toLocaleString()} 待批</span>
                  )}
                </div>
              </div>
              <p className="text-[10px] text-warm-400 mb-1 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />{formatDate(q.createdAt)}
                {q.parentQuotationId && <span className="text-warm-300">· 源自 v{(savedQuotations.find(s => s.id === q.parentQuotationId)?.versionNumber ?? '?')}</span>}
              </p>
              <p className="text-[11px] text-warm-600 truncate mb-1">
                {q.projectIds.length}项 · {q.projectIds.map(id => getProjectById(id)?.name).filter(Boolean).slice(0, 3).join('、')}{q.projectIds.length > 3 ? '...' : ''}
              </p>
              {(confirmedCount > 0 || pendingCount > 0) && (
                <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                  {confirmedCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">
                      ✓ 已确认优惠 {confirmedCount}
                    </span>
                  )}
                  {pendingCount > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      ⚠ 待批优惠 {pendingCount}
                    </span>
                  )}
                </div>
              )}
              {q.verificationNote && (
                <p className={cn(
                  'text-[10px] rounded-lg px-2 py-1 mb-2 whitespace-pre-wrap break-words',
                  pendingCount > 0 ? 'text-amber-700 bg-amber-50 border border-amber-100' :
                  confirmedCount > 0 ? 'text-green-700 bg-green-50 border border-green-100' :
                  'text-warm-500 bg-warm-50'
                )}>
                  核验：{q.verificationNote}
                </p>
              )}
              <div className="grid grid-cols-5 gap-1">
                <button onClick={() => onOpen(q.id, true)} className="py-1.5 bg-rose-gold text-white text-[10px] rounded-lg font-medium">打开</button>
                <button onClick={() => onDiff(q.id)} className="py-1.5 bg-blue-50 text-blue-600 text-[10px] rounded-lg font-medium">对比</button>
                <select
                  value={q.followStatus ?? '草稿'}
                  onChange={(e) => onUpdateFollow(q.id, e.target.value as FollowStatus)}
                  className="py-1.5 bg-warm-50 text-warm-700 text-[10px] rounded-lg outline-none text-center"
                >
                  {FOLLOW_STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <button onClick={() => onOpen(q.id, true)} className="py-1.5 bg-warm-50 text-warm-700 text-[10px] rounded-lg font-medium">另存</button>
                <button onClick={onClose} className="py-1.5 bg-warm-50 text-warm-400 text-[10px] rounded-lg">收起</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
