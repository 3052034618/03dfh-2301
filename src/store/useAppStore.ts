import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Package, Discount, Script, Favorite, Quotation, Customer, ProjectQuantity, FollowStatus, VersionLabel } from '@/types'
import { projects } from '@/data/projects'
import { packages } from '@/data/packages'
import { discounts } from '@/data/discounts'
import { scripts } from '@/data/scripts'
import { customers } from '@/data/customers'

interface AppState {
  projects: Project[]
  packages: Package[]
  discounts: Discount[]
  scripts: Script[]
  customers: Customer[]
  quotationItems: { project: Project; quantity: number }[]
  addQuotationItem: (project: Project) => void
  removeQuotationItem: (projectId: string) => void
  updateQuotationItemQuantity: (projectId: string, quantity: number) => void
  clearQuotation: () => void
  appliedDiscounts: string[]
  confirmedDiscounts: string[]
  toggleDiscount: (discountId: string) => void
  confirmDiscount: (discountId: string, confirmed: boolean) => void
  clearConfirmedDiscounts: () => void
  currentCustomer: Customer | null
  customerId: string
  setCurrentCustomer: (customer: Customer | null) => void
  memberLevel: string
  setMemberLevel: (level: string) => void
  favorites: Favorite[]
  toggleFavorite: (itemType: 'project' | 'package' | 'script', itemId: string) => void
  isFavorite: (itemType: string, itemId: string) => boolean
  savedQuotations: Quotation[]
  saveQuotation: (quotation: Quotation) => void
  updateSavedQuotation: (quotation: Quotation) => void
  deleteSavedQuotation: (quotationId: string) => void
  updateQuotationFollowStatus: (quotationId: string, status: FollowStatus, versionLabel?: VersionLabel) => void
  activeSavedQuotationId: string | null
  parentQuotationId: string | null
  rootQuotationId: string | null
  loadSavedQuotation: (quotationId: string | null, asNewCopy?: boolean) => void
  getNextVersionNumber: (rootId: string | null, parentId: string | null) => number
  hesitationReason: string
  setHesitationReason: (reason: string) => void
  isOffline: boolean
  setOffline: (offline: boolean) => void
  lastSyncAt: string
  setLastSyncAt: (time: string) => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  filterBodyPart: string
  setFilterBodyPart: (part: string) => void
  filterDoctor: string
  setFilterDoctor: (doctor: string) => void
  filterIsOldCustomer: boolean
  setFilterIsOldCustomer: (isOld: boolean) => void
  showFilter: boolean
  setShowFilter: (show: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      projects,
      packages,
      discounts,
      scripts,
      customers,
      quotationItems: [],
      addQuotationItem: (project) =>
        set((state) => {
          const existing = state.quotationItems.find(
            (item) => item.project.id === project.id
          )
          if (existing) {
            return {
              quotationItems: state.quotationItems.map((item) =>
                item.project.id === project.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            }
          }
          return { quotationItems: [...state.quotationItems, { project, quantity: 1 }] }
        }),
      removeQuotationItem: (projectId) =>
        set((state) => ({
          quotationItems: state.quotationItems.filter(
            (item) => item.project.id !== projectId
          ),
        })),
      updateQuotationItemQuantity: (projectId, quantity) =>
        set((state) => ({
          quotationItems: state.quotationItems.map((item) =>
            item.project.id === projectId ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        })),
      clearQuotation: () => set({
        quotationItems: [],
        appliedDiscounts: [],
        confirmedDiscounts: [],
        activeSavedQuotationId: null,
        parentQuotationId: null,
        rootQuotationId: null,
        hesitationReason: '',
      }),
      appliedDiscounts: [],
      confirmedDiscounts: [],
      toggleDiscount: (discountId) =>
        set((state) => {
          const wasApplied = state.appliedDiscounts.includes(discountId)
          return {
            appliedDiscounts: wasApplied
              ? state.appliedDiscounts.filter((id) => id !== discountId)
              : [...state.appliedDiscounts, discountId],
            confirmedDiscounts: wasApplied
              ? state.confirmedDiscounts.filter((id) => id !== discountId)
              : state.confirmedDiscounts,
          }
        }),
      confirmDiscount: (discountId, confirmed) =>
        set((state) => {
          const disc = state.discounts.find((d) => d.id === discountId)
          if (!disc || !disc.needApproval) return {}
          return {
            confirmedDiscounts: confirmed
              ? [...new Set([...state.confirmedDiscounts, discountId])]
              : state.confirmedDiscounts.filter((id) => id !== discountId),
          }
        }),
      clearConfirmedDiscounts: () => set({ confirmedDiscounts: [] }),
      currentCustomer: null,
      customerId: '',
      setCurrentCustomer: (customer) => set({
        currentCustomer: customer,
        customerId: customer?.id ?? '',
        memberLevel: customer?.memberLevel ?? '',
      }),
      memberLevel: '',
      setMemberLevel: (level) => set({ memberLevel: level }),
      favorites: [],
      toggleFavorite: (itemType, itemId) =>
        set((state) => {
          const index = state.favorites.findIndex(
            (f) => f.itemType === itemType && f.itemId === itemId
          )
          if (index >= 0) {
            return { favorites: state.favorites.filter((_, i) => i !== index) }
          }
          return { favorites: [...state.favorites, { id: `fav_${Date.now()}`, itemType, itemId, createdAt: new Date().toISOString() }] }
        }),
      isFavorite: (itemType, itemId) =>
        get().favorites.some((f) => f.itemType === itemType && f.itemId === itemId),
      savedQuotations: [],
      saveQuotation: (quotation) =>
        set((state) => ({
          savedQuotations: [...state.savedQuotations, quotation],
          activeSavedQuotationId: quotation.id,
          parentQuotationId: null,
        })),
      updateSavedQuotation: (quotation) =>
        set((state) => ({
          savedQuotations: state.savedQuotations.map((q) =>
            q.id === quotation.id ? quotation : q
          ),
        })),
      deleteSavedQuotation: (quotationId) =>
        set((state) => ({
          savedQuotations: state.savedQuotations.filter((q) => q.id !== quotationId),
          activeSavedQuotationId: state.activeSavedQuotationId === quotationId ? null : state.activeSavedQuotationId,
          parentQuotationId: state.parentQuotationId === quotationId ? null : state.parentQuotationId,
          rootQuotationId: state.rootQuotationId === quotationId ? null : state.rootQuotationId,
        })),
      updateQuotationFollowStatus: (quotationId, status, versionLabel) =>
        set((state) => ({
          savedQuotations: state.savedQuotations.map((q) =>
            q.id === quotationId
              ? { ...q, followStatus: status, updatedAt: new Date().toISOString(), ...(versionLabel && { versionLabel }) }
              : q
          ),
        })),
      activeSavedQuotationId: null,
      parentQuotationId: null,
      rootQuotationId: null,
      getNextVersionNumber: (rootId, parentId) => {
        const { savedQuotations } = get()
        if (!rootId && !parentId) return 1
        const related = savedQuotations.filter(
          (q) => (rootId && (q.rootQuotationId === rootId || q.id === rootId)) ||
            (parentId && (q.parentQuotationId === parentId || q.id === parentId))
        )
        return related.length + 1
      },
      loadSavedQuotation: (quotationId, asNewCopy = false) => {
        if (!quotationId) {
          set({
            activeSavedQuotationId: null,
            parentQuotationId: null,
            rootQuotationId: null,
            quotationItems: [],
            appliedDiscounts: [],
            confirmedDiscounts: [],
            hesitationReason: '',
          })
          return
        }
        const q = get().savedQuotations.find((s) => s.id === quotationId)
        if (!q) return
        const qtyMap: Record<string, number> = {}
        if (q.projectQuantities && q.projectQuantities.length > 0) {
          for (const pq of q.projectQuantities) qtyMap[pq.projectId] = pq.quantity
        }
        const items = q.projectIds
          .map((pid) => {
            const project = get().projects.find((p) => p.id === pid)
            if (!project) return null
            return { project, quantity: qtyMap[pid] ?? 1 }
          })
          .filter(Boolean) as { project: Project; quantity: number }[]
        const customer = get().customers.find((c) => c.id === q.customerId) ?? null
        if (asNewCopy) {
          set({
            activeSavedQuotationId: null,
            parentQuotationId: q.id,
            rootQuotationId: q.rootQuotationId ?? q.id,
            quotationItems: items,
            appliedDiscounts: q.discountIds,
            confirmedDiscounts: q.confirmedDiscountIds ?? [],
            memberLevel: q.memberLevel,
            hesitationReason: q.hesitationReason,
            currentCustomer: customer,
            customerId: q.customerId,
          })
        } else {
          set({
            activeSavedQuotationId: q.id,
            parentQuotationId: q.parentQuotationId,
            rootQuotationId: q.rootQuotationId,
            quotationItems: items,
            appliedDiscounts: q.discountIds,
            confirmedDiscounts: q.confirmedDiscountIds ?? [],
            memberLevel: q.memberLevel,
            hesitationReason: q.hesitationReason,
            currentCustomer: customer,
            customerId: q.customerId,
          })
        }
      },
      hesitationReason: '',
      setHesitationReason: (reason) => set({ hesitationReason: reason }),
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
      setOffline: (offline) => set({ isOffline: offline }),
      lastSyncAt: new Date().toISOString(),
      setLastSyncAt: (time) => set({ lastSyncAt: time }),
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      selectedCategory: '',
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      filterBodyPart: '',
      setFilterBodyPart: (part) => set({ filterBodyPart: part }),
      filterDoctor: '',
      setFilterDoctor: (doctor) => set({ filterDoctor: doctor }),
      filterIsOldCustomer: false,
      setFilterIsOldCustomer: (isOld) => set({ filterIsOldCustomer: isOld }),
      showFilter: false,
      setShowFilter: (show) => set({ showFilter: show }),
    }),
    {
      name: 'aesthetics-app-store',
      partialize: (state) => ({
        favorites: state.favorites,
        savedQuotations: state.savedQuotations,
        memberLevel: state.memberLevel,
        customerId: state.customerId,
        projects: state.projects,
        packages: state.packages,
        discounts: state.discounts,
        lastSyncAt: state.lastSyncAt,
        confirmedDiscounts: state.confirmedDiscounts,
      }),
    }
  )
)
