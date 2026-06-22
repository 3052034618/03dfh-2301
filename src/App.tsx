import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import TodayPrice from '@/pages/TodayPrice'
import Quotation from '@/pages/Quotation'
import Packages from '@/pages/Packages'
import Discount from '@/pages/Discount'
import Favorites from '@/pages/Favorites'
import Scripts from '@/pages/Scripts'
import TabBar from '@/components/TabBar'
import OfflineBanner from '@/components/OfflineBanner'
import { useAppStore } from '@/store/useAppStore'

export default function App() {
  const isOffline = useAppStore((s) => s.isOffline)
  const setOffline = useAppStore((s) => s.setOffline)
  const setLastSyncAt = useAppStore((s) => s.setLastSyncAt)

  useEffect(() => {
    const handleOnline = () => {
      setOffline(false)
      setLastSyncAt(new Date().toISOString())
    }
    const handleOffline = () => {
      setOffline(true)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    if (typeof navigator !== 'undefined') {
      setOffline(!navigator.onLine)
    }
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setOffline, setLastSyncAt])

  return (
    <Router>
      <div className="h-screen flex flex-col bg-warm-50">
        <OfflineBanner />
        <main
          className={`flex-1 overflow-y-auto ${isOffline ? 'pt-8' : ''}`}
          style={isOffline ? { paddingTop: '2.25rem' } : undefined}
        >
          <Routes>
            <Route path="/" element={<TodayPrice />} />
            <Route path="/quotation" element={<Quotation />} />
            <Route path="/packages" element={<Packages />} />
            <Route path="/discount" element={<Discount />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/scripts" element={<Scripts />} />
          </Routes>
        </main>
        <TabBar />
      </div>
    </Router>
  )
}
