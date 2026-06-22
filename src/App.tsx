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

  return (
    <Router>
      <div className="h-screen flex flex-col">
        {isOffline && <OfflineBanner />}
        <main className="flex-1 overflow-y-auto">
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
