import type { Package } from '../types'

export const packages: Package[] = [
  {
    id: 'pkg001',
    name: '水光焕颜套餐',
    description: '基础补水 + 进阶营养，三疗程叠加深层滋养，适合面部干燥暗沉人群',
    projectIds: ['p024', 'p001'],
    packagePrice: 9800,
    originalPrice: 13380,
    validUntil: '2026-12-31',
  },
  {
    id: 'pkg002',
    name: '抗衰紧致套餐',
    description: '热玛吉全脸紧致 + 水光深层营养，内外联合抗衰，适合30+轻熟肌',
    projectIds: ['p005', 'p002'],
    packagePrice: 26800,
    originalPrice: 29300,
    validUntil: '2026-12-31',
  },
  {
    id: 'pkg003',
    name: '眼周年轻化套餐',
    description: '眼部热玛吉 + 嗨体眼周修复 + 润致趴趴针，三重眼部抗衰方案',
    projectIds: ['p006', 'p020', 'p004'],
    packagePrice: 19800,
    originalPrice: 23180,
    validUntil: '2026-12-31',
  },
  {
    id: 'pkg004',
    name: '光电美肤套餐',
    description: '皮秒祛斑 + 点阵换肤，双光电联合改善色斑与肤质，适合色素沉着肌肤',
    projectIds: ['p008', 'p009'],
    packagePrice: 9800,
    originalPrice: 12000,
    validUntil: '2026-09-30',
  },
]
