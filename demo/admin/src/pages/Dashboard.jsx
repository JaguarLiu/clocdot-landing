import { CalendarSearch, CheckCircle2, Users, Clock, AlertCircle, ArrowRight, CalendarCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'
import { fetcher } from '../services/api.js'
import PaperPiece from '../components/PaperPiece.jsx'
import MarkerButton from '../components/MarkerButton.jsx'
import CompanyLeaveCalendar from '../components/CompanyLeaveCalendar.jsx'
import ComplianceBadge from '../components/ComplianceBadge.jsx'

const accentMap = {
  emerald: { icon: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50' },
  sky:     { icon: 'bg-sky-500',     text: 'text-sky-700',     soft: 'bg-sky-50' },
  orange:  { icon: 'bg-orange-500',  text: 'text-orange-700',  soft: 'bg-orange-50' },
  amber:   { icon: 'bg-amber-500',   text: 'text-amber-700',   soft: 'bg-amber-50' },
  red:     { icon: 'bg-red-500',     text: 'text-red-700',     soft: 'bg-red-50' },
}

function StatCard({ icon:Icon, label, value, accent, rotate, onClick }) {
  const c = accentMap[accent]
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left w-full group active:scale-[0.98] transition-transform"
    >
      <PaperPiece color="white" rotate={rotate} variant="card" className="p-5">
        {/* 膠帶裝飾 */}
        <div
          className="absolute -top-2 left-6 w-10 h-4 bg-white/60 border border-white/30 backdrop-blur-[1px]"
          style={{ transform: 'rotate(-6deg)', boxShadow: '1px 1px 2px rgba(0,0,0,0.03)' }}
        />
        <div className="flex items-start gap-4">
          <div className={`p-2.5 ${c.icon} shadow-sm shrink-0`}>
            <Icon size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{label}</p>
            <p className={`text-3xl font-black font-mono tabular-nums mt-1 ${c.text}`}>{value}</p>
          </div>
        </div>
      </PaperPiece>
    </button>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { data: pendingCorrections } = useSWR('/admin/correction-requests?status=pending', fetcher)
  const { data: pendingLeaves } = useSWR('/admin/leave-requests?status=pending', fetcher)

  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const { data: attendance } = useSWR(`/admin/attendance?month=${currentMonth}`, fetcher)
  const { data: otCompliance } = useSWR(`/admin/compliance/overtime?month=${currentMonth}`, fetcher)
  const exceedList = (otCompliance ?? []).filter((r) => r.status === 'exceed')
  const warnList = (otCompliance ?? []).filter((r) => r.status === 'warn')
  const hasCompliance = exceedList.length + warnList.length > 0

  const totalEmployees = attendance?.length ?? 0
  const pendingCorrectionsCount = pendingCorrections?.length ?? 0
  const pendingLeavesCount = pendingLeaves?.length ?? 0
  const totalWorkHours = attendance
    ? (attendance.reduce((sum, r) => sum + (r.totalWorkDuration || 0), 0) / 60).toFixed(0)
    : 0
  const totalLateDays = attendance
    ? attendance.reduce((sum, r) => sum + (r.lateDays || 0), 0)
    : 0

  const pendingBanners = [
    pendingCorrectionsCount > 0 && {
      key: 'corrections',
      count: pendingCorrectionsCount,
      label: '筆補打卡申請等你審核',
      en: 'Pending correction requests',
      path: '/corrections',
      accent: 'orange',
    },
    pendingLeavesCount > 0 && {
      key: 'leaves',
      count: pendingLeavesCount,
      label: '筆請假申請等你審核',
      en: 'Pending leave requests',
      path: '/leaves',
      accent: 'amber',
    },
  ].filter(Boolean)

  return (
    <div className="animate-in fade-in duration-300">
      {/* 頁面標題 */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <h2 className="text-3xl font-zh text-slate-800">管理總覽</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
              {currentMonth} · Monthly Overview
            </p>
          </div>
        </div>
        {/* 時段印章 */}
        <div
          className="hidden sm:block border-2 border-dashed border-slate-300 px-4 py-2 text-slate-400"
          style={{ transform: 'rotate(3deg)', borderRadius: '8px 2px 10px 3px/3px 10px 2px 8px' }}
        >
          <p className="text-[9px] font-black uppercase tracking-[0.3em]">Updated</p>
          <p className="text-xs font-mono font-black text-slate-600 mt-0.5">
            {now.getHours().toString().padStart(2, '0')}:{now.getMinutes().toString().padStart(2, '0')}
          </p>
        </div>
      </div>

      {/* 統計卡片 — 每張不同旋轉角度 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-10">
        <StatCard icon={Users}          label="出勤員工"    value={totalEmployees}        accent="emerald" rotate="-0.8deg" onClick={() => navigate('/attendance')} />
        <StatCard icon={Clock}          label="總工時 (hr)" value={totalWorkHours}        accent="sky"     rotate="0.6deg"  onClick={() => navigate('/attendance')} />
        <StatCard icon={CalendarSearch} label="遲到天數"    value={totalLateDays}         accent="orange"  rotate="-0.5deg" onClick={() => navigate('/attendance')} />
        <StatCard icon={CheckCircle2}   label="待審核補卡"  value={pendingCorrectionsCount} accent="red"     rotate="0.9deg"  onClick={() => navigate('/corrections')} />
        <StatCard icon={CalendarCheck}  label="待審核請假"  value={pendingLeavesCount}    accent="amber"   rotate="-0.6deg" onClick={() => navigate('/leaves')} />
      </div>

      {/* 加班合規警示 — 本月接近/超標名單 */}
      {hasCompliance && (
        <PaperPiece
          color={exceedList.length ? '#fef2f2' : '#fffbea'}
          rotate="-0.3deg"
          variant="card"
          className="p-5 mb-3"
        >
          <div className="flex items-start gap-4">
            <div className={`shrink-0 w-10 h-10 rounded-full ${exceedList.length ? 'bg-red-500' : 'bg-amber-500'} flex items-center justify-center shadow-md`}>
              <AlertCircle size={20} className="text-white" strokeWidth={2.5} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-zh text-slate-700 text-[15px]">
                  本月加班
                  <span className="font-mono font-black mx-1 text-red-600">{exceedList.length}</span> 人超標、
                  <span className="font-mono font-black mx-1 text-amber-600">{warnList.length}</span> 人接近上限
                </p>
                <MarkerButton color="#0ea5e9" rotate="-0.6deg" onClick={() => navigate('/monthly-report')}>
                  查看報表
                  <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
                </MarkerButton>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                Overtime Compliance
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {[...exceedList, ...warnList].map((p) => (
                  <span
                    key={p.userId}
                    className="inline-flex items-center gap-1.5 bg-white/70 border border-dashed border-slate-200 px-2 py-1"
                  >
                    <span className="font-zh text-xs text-slate-600">{p.name || '--'}</span>
                    <ComplianceBadge status={p.status} />
                  </span>
                ))}
              </div>
            </div>
          </div>
        </PaperPiece>
      )}

      {/* 待審核提示 — 可能同時顯示補卡與請假兩條 */}
      {pendingBanners.length > 0 && (
        <div className="space-y-3">
          {pendingBanners.map((b) => {
            const iconBg = b.accent === 'orange' ? 'bg-orange-500' : 'bg-amber-500'
            const textColor = b.accent === 'orange' ? 'text-orange-600' : 'text-amber-600'
            const markerColor = b.accent === 'orange' ? '#f97316' : '#f59e0b'
            const paperBg = b.accent === 'orange' ? '#fff9ec' : '#fffbea'

            return (
              <PaperPiece key={b.key} color={paperBg} rotate="-0.4deg" variant="card" className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`shrink-0 w-10 h-10 rounded-full ${iconBg} flex items-center justify-center shadow-md`}>
                    <AlertCircle size={20} className="text-white" strokeWidth={2.5} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <p className="font-zh text-slate-700 text-[15px]">
                      有 <span className={`font-mono font-black mx-1 ${textColor}`}>{b.count}</span> {b.label}
                    </p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5">
                      {b.en}
                    </p>
                  </div>
                  <MarkerButton color={markerColor} rotate="-0.6deg" onClick={() => navigate(b.path)}>
                    前往審核
                    <ArrowRight size={14} strokeWidth={2.5} aria-hidden="true" />
                  </MarkerButton>
                </div>
              </PaperPiece>
            )
          })}
        </div>
      )}

      {/* 公司行事曆 */}
      <div className="mt-10">
        <CompanyLeaveCalendar />
      </div>
    </div>
  )
}
