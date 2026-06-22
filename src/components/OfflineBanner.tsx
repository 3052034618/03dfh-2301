import { WifiOff } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export default function OfflineBanner() {
  const isOffline = useAppStore((s) => s.isOffline)

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-xs py-1.5 text-center flex items-center justify-center gap-1.5">
      <WifiOff size={14} />
      <span>当前为离线数据，价格可能有变动</span>
    </div>
  )
}
