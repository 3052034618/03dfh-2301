import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Project, Package, Discount, Script, Favorite, Quotation, Customer } from '@/types'
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
  toggleDiscount: (discountId: string) => void
  currentCustomer: Customer | null
  setCurrentCustomer: (customer: Customer | null) => void
  memberLevel: string
  setMemberLevel: (level: string) => void
  favorites: Favorite[]
  toggleFavorite: (itemType: 'project' | 'package' | 'script', itemId: string) => void
  isFavorite: (itemType: string, itemId: string) => boolean
  savedQuotations: Quotation[]
  saveQuotation: (quotation: Quotation) => void
  hesitationReason: string
  setHesitationReason: (reason: string) => void
  isOffline: boolean
  setOffline: (offline: boolean) => void
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
            item.project.id === projectId ? { ...item, quantity } : item
          ),
        })),
      clearQuotation: () => set({ quotationItems: [], appliedDiscounts: [] }),
      appliedDiscounts: [],
      toggleDiscount: (discountId) =>
        set((state) => ({
          appliedDiscounts: state.appliedDiscounts.includes(discountId)
            ? state.appliedDiscounts.filter((id) => id !== discountId)
            : [...state.appliedDiscounts, discountId],
        })),
      currentCustomer: null,
      setCurrentCustomer: (customer) => set({ currentCustomer: customer }),
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
        })),
      hesitationReason: '',
      setHesitationReason: (reason) => set({ hesitationReason: reason }),
      isOffline: false,
      setOffline: (offline) => set({ isOffline: offline }),
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
      }),
    }
  )
)
