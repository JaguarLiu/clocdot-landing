import { useState } from 'react'
import { Timer, Check, X, Inbox, User } from 'lucide-react'
import useSWR from 'swr'
import { fetcher, reviewOvertimeRequest } from '../services/api.js'
import PaperPiece from '../components/PaperPiece.jsx'
import PaperToast from '../components/PaperToast.jsx'
import StatusStamp from '../components/StatusStamp.jsx'
import MarkerButton from '../components/MarkerButton.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'

const TABS = [
  { key: 'pending',  label: '待審核', accent: 'orange' },
  { key: 'approved', label: '已通過', accent: 'emerald' },
  { key: 'rejected', label: '已駁回', accent: 'red' },
]

const TAB_ACCENT = {
  orange:  'text-orange-600 bg-white shadow-md',
  emerald: 'text-emerald-600 bg-white shadow-md',
  red:     'text-red-600 bg-white shadow-md',
}

const DAY_TYPE_LABEL = {
  workday: '平日',
  restday: '休息日',
  national_holiday: '國定假日',
  regular_leave: '例假',
}

const RATE_LABEL = {
  '1.34': '×1.34', '1.67': '×1.67', '2.67': '×2.67',
  holiday: '假日加倍', regular_leave: '例假',
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function toHours(minutes) {
  return (minutes / 60).toFixed(1)
}

export default function OvertimeReviews() {
  const [tab, setTab] = useState('pending')
  const { data: requests, mutate } = useSWR(`/admin/overtime-requests?status=${tab}`, fetcher)
  const [processing, setProcessing] = useState(null)
  const [toast, setToast] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null) // { id, compliance }

  async function handleReview(id, status) {
    setProcessing(id)
    try {
      await reviewOvertimeRequest(id, status)
      mutate()
      setToast({ variant: 'success', message: status === 'approved' ? '已通過加班申請' : '已駁回加班申請' })
    } catch (err) {
      if (err?.status === 409 && err?.info?.compliance) {
        // 核准會超月上限 → 改開確認對話框，由主管二次確認
        setConfirmTarget({ id, compliance: err.info.compliance })
      } else {
        setToast({ variant: 'error', message: err?.message || '操作失敗' })
      }
    } finally {
      setProcessing(null)
    }
  }

  async function handleConfirmApprove() {
    if (!confirmTarget) return
    const { id } = confirmTarget
    setProcessing(id)
    try {
      await reviewOvertimeRequest(id, 'approved', true)
      mutate()
      setToast({ variant: 'success', message: '已通過加班申請' })
      setConfirmTarget(null)
    } catch (err) {
      setToast({ variant: 'error', message: err?.message || '操作失敗' })
    } finally {
      setProcessing(null)
    }
  }

  const list = requests ?? []

  return (
    <div className="animate-in fade-in duration-300">
      {toast && <PaperToast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} />}
      <ConfirmDialog
        open={!!confirmTarget}
        variant="warning"
        title="加班時數恐超標"
        message={confirmTarget?.compliance?.reasons?.map((r) => r.detail).join('；')}
        confirmLabel="我已知悉，仍要核准"
        cancelLabel="先不要"
        onConfirm={handleConfirmApprove}
        onCancel={() => setConfirmTarget(null)}
        loading={processing === confirmTarget?.id}
      />

      <div className="flex items-center gap-3 mb-10">
        <div className="p-2.5 rounded-lg bg-amber-500 shadow-sm" style={{ transform: 'rotate(-3deg)' }}>
          <Timer size={22} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-3xl font-zh text-slate-800">加班審核</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">
            Overtime Requests Review
          </p>
        </div>
      </div>

      <div className="flex items-end gap-1 mb-6 border-b-2 border-slate-200/60">
        {TABS.map((t, idx) => {
          const isActive = tab === t.key
          const rotate = isActive ? '0deg' : `${idx % 2 === 0 ? '-0.5' : '0.5'}deg`
          return (
            <button
              type="button"
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 font-zh text-sm transition-all relative
                ${isActive ? TAB_ACCENT[t.accent] : 'text-slate-400 bg-white/40 hover:bg-white/70 hover:text-slate-600'}`}
              style={{
                transform: `rotate(${rotate})`,
                borderRadius: '10px 10px 0 0',
                border: '1px solid rgba(0,0,0,0.06)',
                borderBottom: isActive ? 'none' : '1px solid rgba(0,0,0,0.06)',
                marginBottom: isActive ? '-2px' : '0',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <div className="text-center py-24 opacity-40 flex flex-col items-center gap-3">
          <Inbox size={48} className="text-slate-300" />
          <p className="font-zh text-sm text-slate-400">
            {tab === 'pending' ? '目前沒有待審核的加班' : '沒有相關紀錄'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((req, index) => {
            const userName = req.user?.name || req.user?.email || '--'
            const isProcessing = processing === req.id
            const rotate = index % 2 === 0 ? '-0.3deg' : '0.25deg'
            const tiers = Array.isArray(req.tiers) ? req.tiers : []

            return (
              <PaperPiece key={req.id} color="white" rotate={rotate} variant="card" className="p-5">
                <div className="flex items-center gap-5 flex-wrap lg:flex-nowrap">
                  <div className="flex items-center gap-3 min-w-[180px]">
                    <div className="w-10 h-10 rounded-full bg-sky-100 border-2 border-sky-50 flex items-center justify-center overflow-hidden shrink-0">
                      {req.user?.avatar ? (
                        <img src={req.user.avatar} alt={userName} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} className="text-sky-500" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-zh text-sm text-slate-700 truncate">{userName}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">
                        {req.user?.email}
                      </p>
                    </div>
                  </div>

                  <div className="pl-5 border-l border-dashed border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Date</p>
                    <p className="font-mono font-black text-sm text-slate-700 tabular-nums">{formatDate(req.workDate)}</p>
                    <p className="font-zh text-[11px] text-amber-600 mt-0.5">{DAY_TYPE_LABEL[req.dayType] || req.dayType}</p>
                  </div>

                  <div className="pl-5 border-l border-dashed border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hours</p>
                    <p className="font-mono font-black text-sm text-slate-700 tabular-nums">{toHours(req.requestedMinutes)} 小時</p>
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {tiers.map((t, i) => (
                        <span key={i} className="inline-flex font-mono font-black text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded tabular-nums">
                          {RATE_LABEL[t.rate] || t.rate}·{toHours(t.minutes)}h
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex-1 min-w-[160px] pl-5 border-l border-dashed border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reason</p>
                    <p className="font-zh text-sm text-slate-600 line-clamp-2">{req.reason || '—'}</p>
                  </div>

                  {tab === 'pending' ? (
                    <div className="flex items-center gap-3 shrink-0">
                      <MarkerButton color="#10b981" rotate="-0.5deg" fontSize={13} onClick={() => handleReview(req.id, 'approved')} disabled={isProcessing}>
                        <Check size={13} strokeWidth={3} />
                        通過
                      </MarkerButton>
                      <MarkerButton color="#ef4444" rotate="0.5deg" fontSize={13} onClick={() => handleReview(req.id, 'rejected')} disabled={isProcessing}>
                        <X size={13} strokeWidth={3} />
                        駁回
                      </MarkerButton>
                    </div>
                  ) : (
                    <div className="shrink-0 pl-2">
                      <StatusStamp status={req.status} />
                    </div>
                  )}
                </div>
              </PaperPiece>
            )
          })}
        </div>
      )}
    </div>
  )
}
