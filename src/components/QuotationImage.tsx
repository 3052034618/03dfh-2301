import { forwardRef } from 'react'
import type { Project } from '@/types'

interface QuotationImageProps {
  items: { project: Project; quantity: number }[]
  totalPrice: number
  discountNames: string[]
  memberLevel: string
}

const QuotationImage = forwardRef<HTMLDivElement, QuotationImageProps>(
  ({ items, totalPrice, discountNames, memberLevel }, ref) => {
    const today = new Date().toLocaleDateString('zh-CN')

    return (
      <div
        ref={ref}
        className="bg-white text-warm-900 font-sans p-6 rounded-2xl"
        style={{ width: 360 }}
      >
        <div className="text-center mb-4">
          <h1 className="text-xl font-serif font-semibold">医美报价单</h1>
          <div className="w-12 h-0.5 bg-rose-gold mx-auto mt-2" />
        </div>

        <div className="space-y-2 mb-4">
          {items.map(({ project, quantity }) => (
            <div
              key={project.id}
              className="flex items-center justify-between text-sm py-1.5 border-b border-warm-100"
            >
              <span className="text-warm-800">
                {project.name}
                {project.sessions > 1 && (
                  <span className="text-warm-400 ml-1">
                    ({project.sessions}次 × {quantity})
                  </span>
                )}
              </span>
              <span className="font-medium">
                ¥{(project.activityPrice * quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {discountNames.length > 0 && (
          <div className="text-xs text-rose-gold mb-3">
            已应用优惠：{discountNames.join('、')}
          </div>
        )}

        <div className="border-t-2 border-warm-200 pt-3 flex items-end justify-between">
          <div className="text-xs text-warm-400">
            {memberLevel && <span>会员等级：{memberLevel}</span>}
          </div>
          <div className="text-right">
            <p className="text-xs text-warm-400">合计</p>
            <p className="text-2xl font-serif font-semibold text-rose-gold">
              ¥{totalPrice.toLocaleString()}
            </p>
          </div>
        </div>

        <p className="text-[10px] text-warm-300 text-center mt-4">
          报价日期：{today} · 价格以实际到店为准
        </p>
      </div>
    )
  }
)

QuotationImage.displayName = 'QuotationImage'

export default QuotationImage
