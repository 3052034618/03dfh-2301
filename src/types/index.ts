export type ProjectCategory = '水光' | '光电' | '注射' | '手术' | '修复'

export type BodyPart = '面部' | '眼部' | '鼻部' | '唇部' | '下颌' | '颈部' | '胸部' | '腹部' | '大腿' | '手臂' | '全身'

export type MemberLevel = '普通' | '银卡' | '金卡' | '钻石'

export type DiscountType = 'percentage' | 'fixed' | 'gift'

export type DiscountScope = 'all' | 'category' | 'project'

export type QuotationStatus = '草稿' | '已发送' | '已成交' | '已作废'

export type HesitationReason = '价格' | '效果' | '恢复期' | '对比' | ''

export type ScriptCategory = '价格异议' | '效果疑虑' | '恢复期担忧' | '品牌对比' | '纠结犹豫'

export type FavoriteItemType = 'project' | 'package' | 'script'

export interface Project {
  id: string
  name: string
  category: ProjectCategory
  bodyPart: BodyPart
  brand: string
  spec: string
  standardPrice: number
  activityPrice: number
  lowestPrice: number
  canStack: boolean
  stackNote: string
  doctorId: string
  isExpired: boolean
  updatedAt: string
  sessions: number
  sessionPrice: number
}

export interface Package {
  id: string
  name: string
  description: string
  projectIds: string[]
  packagePrice: number
  originalPrice: number
  validUntil: string
}

export interface Discount {
  id: string
  name: string
  type: DiscountType
  scope: DiscountScope
  discountValue: number
  canStack: boolean
  excludeIds: string[]
  needApproval: boolean
  validUntil: string
  description: string
}

export interface ProjectQuantity {
  projectId: string
  quantity: number
}

export interface VerificationItem {
  discountId: string
  discountName: string
  applicable: boolean
  reason: string
  needApproval: boolean
}

export interface Quotation {
  id: string
  customerId: string
  customerName: string
  memberLevel: MemberLevel
  projectIds: string[]
  projectQuantities: ProjectQuantity[]
  discountIds: string[]
  totalPrice: number
  hesitationReason: HesitationReason
  createdAt: string
  updatedAt: string
  status: QuotationStatus
  parentQuotationId: string | null
  verificationNote: string
  verificationItems: VerificationItem[]
}

export interface Script {
  id: string
  category: ScriptCategory
  title: string
  opening: string
  corePoint: string
  closing: string
  isFavorite: boolean
}

export interface Favorite {
  id: string
  itemType: FavoriteItemType
  itemId: string
  createdAt: string
}

export interface Customer {
  id: string
  name: string
  memberLevel: MemberLevel
  phone: string
}
