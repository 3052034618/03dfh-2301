import { WifiOff, RefreshCw, Database } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

function formatTime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function OfflineBanner() {
  const { isOffline, lastSyncAt, setOffline, setLastSyncAt, projects } = useAppStore()

  const handleRefresh = () => {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      setOffline(false)
      setLastSyncAt(new Date().toISOString())
    }
  }

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs">
      <div className="max-w-md mx-auto px-3 py-1.5 flex items-center gap-2">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-1 flex-wrap">
          <span className="font-medium">离线模式</span>
          <span className="opacity-80">· 使用缓存价目表</span>
          {lastSyncAt && (
            <span className="flex items-center gap-0.5 opacity-75">
              <Database className="w-3 h-3" />
              {formatTime(lastSyncAt)}
            </span>
          )}
          {projects.length > 0 && (
            <span className="opacity-75">({projects.length}条)</span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          className="shrink-0 p-1 rounded-full bg-white/20 active:bg-white/30 flex items-center gap-0.5"
          title="检测连接"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  )
}
