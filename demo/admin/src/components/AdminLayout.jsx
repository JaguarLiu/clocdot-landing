import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function AdminLayout() {
  return (
    <div className="flex h-screen bg-[#f3f0e6] text-slate-900 overflow-hidden relative">
      {/* 背景裝飾色塊 — 與 client 同系列但位置偏桌面版 */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-25">
        <div className="absolute top-[-10%] left-[15%] w-[30%] h-64 bg-emerald-100 -rotate-3" style={{ borderRadius: '40%' }} />
        <div className="absolute top-[20%] right-[-5%] w-[25%] h-80 bg-sky-100 rotate-6" style={{ borderRadius: '30%' }} />
        <div className="absolute bottom-[-10%] left-[30%] w-[35%] h-64 bg-orange-50 -rotate-6" style={{ borderRadius: '45%' }} />
      </div>

      <Sidebar />
      <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="px-10 py-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
