import { forwardRef } from 'react'
import type { Project, Discount } from '@/types'

interface QuotationImageProps {
  items: { project: Project; quantity: number }[]
  totalPrice: number
  customerName: string
  memberLevel: string
  confirmedDiscounts: Discount[]
  pendingDiscounts: Discount[]
  verificationNote?: string
  remark?: string
}

const QuotationImage = forwardRef<HTMLDivElement, QuotationImageProps>(
  ({ items, totalPrice, customerName, memberLevel, confirmedDiscounts, pendingDiscounts, verificationNote, remark }, ref) => {
    const today = new Date().toLocaleDateString('zh-CN')
    const hasPending = pendingDiscounts.length > 0
    const hasConfirmed = confirmedDiscounts.length > 0

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

        {(customerName || memberLevel) && (
          <div className="mb-4 p-3 bg-warm-50 rounded-xl text-xs flex items-center justify-between">
            <div>
              {customerName && <p className="font-medium text-warm-800">{customerName}</p>}
              {memberLevel && <p className="text-warm-500 mt-0.5">{memberLevel}会员</p>}
            </div>
            <p className="text-[10px] text-warm-400">{today}</p>
          </div>
        )}

        <div className="space-y-2 mb-4">
          {items.map(({ project, quantity }) => (
            <div
              key={project.id}
              className="flex items-start justify-between text-sm py-1.5 border-b border-warm-100 gap-2"
            >
              <div className="flex-1 min-w-0">
                <p className="text-warm-800">{project.name}</p>
                <p className="text-[10px] text-warm-400 mt-0.5">
                  {project.brand} · {project.spec}
                  {project.sessions > 1 && (
                    <span className="ml-1">（{project.sessions}次疗程 × {quantity}）</span>
                  )}
                </p>
              </div>
              <span className="font-medium shrink-0">
                ¥{(project.activityPrice * quantity).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {hasConfirmed && (
          <div className="mb-3 p-2.5 bg-rose-gold50 rounded-xl text-[11px] border border-rose-goldLight">
            <p className="font-medium text-rose-gold mb-1 flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 text-white text-center leading-3 text-[9px]">✓</span>
              已确认优惠（{confirmedDiscounts.length}）
            </p>
            <div className="space-y-0.5">
              {confirmedDiscounts.map(d => (
                <p key={d.id} className="text-warm-700 flex items-center justify-between">
                  <span>{d.name}</span>
                  <span className="text-rose-gold font-medium">
                    {d.type === 'percentage' ? `${d.discountValue}折` : d.type === 'fixed' ? `-¥${d.discountValue}` : '赠送'}
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}

        {hasPending && (
          <div className="mb-3 p-2.5 bg-amber-50 rounded-xl text-[11px] border border-amber-200">
            <p className="font-medium text-amber-700 mb-1 flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500 text-white text-center leading-3 text-[9px]">!</span>
              待主管确认优惠（{pendingDiscounts.length}）· 未计入成交价
            </p>
            <div className="space-y-0.5">
              {pendingDiscounts.map(d => (
                <p key={d.id} className="text-amber-700 flex items-center justify-between opacity-80">
                  <span className="italic">{d.name}</span>
                  <span className="font-medium">
                    {d.type === 'percentage' ? `${d.discountValue}折` : d.type === 'fixed' ? `-¥${d.discountValue}` : '赠送'}
                    <span className="ml-1 text-[9px]">(待批)</span>
                  </span>
                </p>
              ))}
            </div>
          </div>
        )}

        {verificationNote && (
          <div className={cn(
            'mb-3 p-2.5 rounded-xl text-[10px] border',
            hasPending
              ? 'bg-amber-50 text-amber-700 border-amber-100'
              : 'bg-green-50 text-green-700 border-green-100'
          )}>
            {hasPending ? '⚠ ' : '✓ '}{verificationNote}
          </div>
        )}

        {remark && (
          <div className="mb-3 p-2.5 bg-warm-50 rounded-xl text-[11px] text-warm-600 border border-warm-100">
            <p className="font-medium text-warm-700 mb-0.5">备注</p>
            <p className="whitespace-pre-wrap break-words">{remark}</p>
          </div>
        )}

        <div className="border-t-2 border-warm-200 pt-3 flex items-end justify-between">
          <div className="text-xs text-warm-400">
            {memberLevel && <span>{memberLevel}会员</span>}
            {hasPending && <span className="ml-2">· 成交价按已确认优惠计算</span>}
          </div>
          <div className="text-right">
            <p className="text-xs text-warm-400">实际成交价（已确认）</p>
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

function cn(...args: (string | undefined | false | null)[]): string {
  return args.filter(Boolean).join(' ')
}

QuotationImage.displayName = 'QuotationImage'

export default QuotationImage
