import { useLocation, useNavigate } from 'react-router-dom'
import { DollarSign, FileText, Package, Ticket, Heart, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { label: '今日价格', icon: DollarSign, path: '/' },
  { label: '顾客报价单', icon: FileText, path: '/quotation' },
  { label: '套餐组合', icon: Package, path: '/packages' },
  { label: '优惠核验', icon: Ticket, path: '/discount' },
  { label: '收藏常用', icon: Heart, path: '/favorites' },
  { label: '话术提示', icon: MessageSquare, path: '/scripts' },
]

export default function TabBar() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white/90 backdrop-blur border-t border-warm-200 z-50">
      <div className="flex items-center justify-around h-full max-w-lg mx-auto px-1">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path
          const Icon = tab.icon
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1',
                isActive ? 'text-rose-gold' : 'text-warm-400'
              )}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2.5 : 1.5}
                fill={isActive ? 'currentColor' : 'none'}
              />
              <span className="text-[10px] leading-tight truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
