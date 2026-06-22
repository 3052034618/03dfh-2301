import { X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { cn } from '@/lib/utils'

const bodyParts = ['面部', '眼部', '鼻部', '唇部', '下颌', '颈部']
const doctors = ['张主任', '李主任', '王医生', '不限定']
const oldCustomerOptions = ['是', '否']

export default function FilterDrawer() {
  const {
    filterBodyPart, setFilterBodyPart,
    filterDoctor, setFilterDoctor,
    filterIsOldCustomer, setFilterIsOldCustomer,
    showFilter, setShowFilter,
  } = useAppStore()

  if (!showFilter) return null

  const handleReset = () => {
    setFilterBodyPart('')
    setFilterDoctor('')
    setFilterIsOldCustomer(false)
  }

  const handleApply = () => {
    setShowFilter(false)
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={() => setShowFilter(false)}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl animate-slide-up max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-warm-200">
          <h2 className="text-lg font-semibold text-warm-900">筛选条件</h2>
          <button onClick={() => setShowFilter(false)} className="p-1">
            <X size={20} className="text-warm-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div>
            <p className="text-sm font-medium text-warm-700 mb-2">部位</p>
            <div className="flex flex-wrap gap-2">
              {bodyParts.map((part) => (
                <button
                  key={part}
                  onClick={() => setFilterBodyPart(filterBodyPart === part ? '' : part)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm',
                    filterBodyPart === part
                      ? 'bg-rose-gold text-white'
                      : 'bg-warm-100 text-warm-600'
                  )}
                >
                  {part}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-warm-700 mb-2">医生</p>
            <div className="flex flex-wrap gap-2">
              {doctors.map((doc) => (
                <button
                  key={doc}
                  onClick={() => setFilterDoctor(filterDoctor === doc ? '' : doc)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm',
                    filterDoctor === doc
                      ? 'bg-rose-gold text-white'
                      : 'bg-warm-100 text-warm-600'
                  )}
                >
                  {doc}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-warm-700 mb-2">老客户</p>
            <div className="flex gap-2">
              {oldCustomerOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilterIsOldCustomer(opt === '是')}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm',
                    (opt === '是' && filterIsOldCustomer) || (opt === '否' && !filterIsOldCustomer)
                      ? 'bg-rose-gold text-white'
                      : 'bg-warm-100 text-warm-600'
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-warm-200">
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 rounded-xl border border-warm-200 text-sm text-warm-600 font-medium"
          >
            重置
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 rounded-xl bg-rose-gold text-white text-sm font-medium"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  )
}
