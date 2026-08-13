import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarPlus, Send, AlertCircle, Inbox, ChevronDown, X, Users, ChevronLeft, ChevronRight, Ban, Clock } from 'lucide-react'
import useSWR from 'swr'
import PaperPiece from '../components/PaperPiece.jsx'
import PaperToast from '../components/PaperToast.jsx'
import MarkerButton from '../components/MarkerButton.jsx'
import StatusStamp from '../components/StatusStamp.jsx'
import { submitLeaveRequest, cancelLeaveRequest, requestLeaveCancellation, getLeaveCalendar, getHolidays, fetcher } from '../services/api.js'
import { formatLeaveDuration } from '../utils/time.js'
import { LEAVE_TYPES, LEAVE_TYPE_MAP } from '../utils/leaveTypes.js'
import { useT, tr } from '../i18n/index.jsx'

const LIST_ROTATIONS = ['-0.6deg', '0.5deg', '-0.4deg', '0.7deg', '-0.3deg']

function buildMonthOptions() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = tr('common.monthLabel', { y: d.getFullYear(), m: d.getMonth() + 1 })
    return { value, label }
  })
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function formatDateFull(dateStr) {
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function todayLocalISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Get the first/last day of a year-month string like '2026-05' */
function monthBounds(ym) {
  const [y, m] = ym.split('-').map(Number)
  const first = `${ym}-01`
  const last = new Date(y, m, 0)
  const lastStr = `${y}-${String(m).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`
  return { first, last: lastStr, daysInMonth: last.getDate(), startDow: new Date(y, m - 1, 1).getDay() }
}

const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '18:00'

export default function LeaveRequest() {
  const { t } = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'list' ? 'list' : 'apply'

  function switchTab(tab) {
    setSearchParams(tab === 'apply' ? {} : { tab })
  }

  return (
    <main className="w-full relative z-10 px-4 mt-4 animate-in slide-in-from-bottom-4 duration-300 pb-20">
      <div className="flex items-center gap-2 mb-6 px-2">
        <CalendarPlus size={24} className="text-sky-500" aria-hidden="true" />
        <h3 className="font-zh text-2xl text-slate-700">{t('leave.heading')}</h3>
      </div>

      {/* 子頁籤 */}
      <div
        className="flex mb-8 bg-slate-200/40 p-1 border border-slate-200"
        role="tablist"
        aria-label={t('leave.tabsLabel')}
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'apply'}
          onClick={() => switchTab('apply')}
          className={`flex-1 py-2.5 font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'apply' ? 'bg-white text-sky-500 shadow-sm' : 'text-slate-500'
          }`}
        >
          {t('common.submit')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'list'}
          onClick={() => switchTab('list')}
          className={`flex-1 py-2.5 font-black text-xs uppercase tracking-widest transition-all ${
            activeTab === 'list' ? 'bg-white text-sky-500 shadow-sm' : 'text-slate-500'
          }`}
        >
          {t('correction.tabRecords')}
        </button>
      </div>

      {activeTab === 'apply' ? <LeaveApplyForm /> : <LeaveList />}
    </main>
  )
}

// ------- 提交申請 -------

function LeaveApplyForm() {
  const { t } = useT()
  const [leaveType, setLeaveType] = useState('annual')
  const [startDate, setStartDate] = useState(todayLocalISO)
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME)
  const [endDate, setEndDate] = useState(todayLocalISO)
  const [endTime, setEndTime] = useState(DEFAULT_END_TIME)
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  // Feature 3: overlap warning (non-blocking, shown after successful submit)
  const [overlapWarning, setOverlapWarning] = useState(null)

  const { data: balanceData, mutate: refreshBalance } = useSWR('/leave-balances', fetcher)
  const balances = balanceData?.balances ?? []
  const currentBalance = balances.find((b) => b.leaveType === leaveType)

  async function handleSubmit() {
    if (!startDate || !startTime || !endDate || !endTime) {
      setToast({ variant: 'error', message: t('leave.needDates') })
      return
    }
    setIsSubmitting(true)
    setOverlapWarning(null)
    try {
      const result = await submitLeaveRequest({ leaveType, startDate, startTime, endDate, endTime, reason })
      setToast({ variant: 'success', message: t('leave.sent') })
      // Feature 3: non-blocking overlap warning
      if (result?.overlaps?.length > 0) {
        setOverlapWarning(result.overlaps.length)
      }
      setStartDate(todayLocalISO())
      setStartTime(DEFAULT_START_TIME)
      setEndDate(todayLocalISO())
      setEndTime(DEFAULT_END_TIME)
      setReason('')
      refreshBalance()
    } catch (err) {
      setToast({ variant: 'error', message: err?.message || t('common.submitFailed') })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Current calendar month for the company calendar
  const [calendarYM, setCalendarYM] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  function prevMonth() {
    const [y, m] = calendarYM.split('-').map(Number)
    const d = new Date(y, m - 2, 1)
    setCalendarYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  function nextMonth() {
    const [y, m] = calendarYM.split('-').map(Number)
    const d = new Date(y, m, 1)
    setCalendarYM(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="animate-in fade-in duration-300">
      {toast && (
        <PaperToast
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Feature 3: Overlap warning — non-blocking sky info notice */}
      {overlapWarning && (
        <div className="mb-4 bg-sky-50 p-3 border-l-4 border-sky-400 flex items-start gap-3">
          <AlertCircle size={16} className="text-sky-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-sky-600 leading-relaxed font-zh">
              {t('leave.overlapWarning', { n: overlapWarning })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOverlapWarning(null)}
            aria-label={t('leave.dismissHint')}
            className="shrink-0 text-sky-400 hover:text-sky-600 active:scale-95 transition-all"
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      )}

      <PaperPiece color="white" rotate="1deg" className="p-8 mb-8">
        <div className="space-y-6">
          <div>
            <div className="flex items-baseline justify-between mb-1 ml-1">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('leave.selectType')}</label>
              {currentBalance && (
                <span className="text-[10px] font-black tabular-nums">
                  <span className="text-slate-400 uppercase tracking-widest mr-1">Remaining</span>
                  <span className={currentBalance.remainingMinutes > 0 ? 'text-emerald-600' : 'text-red-500'}>
                    {(currentBalance.remainingMinutes / 60 / 8).toFixed(1)}
                  </span>
                  <span className="text-slate-400 ml-0.5">{t('leave.quotaDays', { n: (currentBalance.quotaMinutes / 60 / 8).toFixed(1) })}</span>
                </span>
              )}
            </div>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="w-full bg-slate-50 border-b-2 border-slate-200 p-2 font-zh text-slate-700 rounded-none focus:outline-none focus:border-sky-400 transition-colors appearance-none"
            >
              {LEAVE_TYPES.map((lt) => (
                <option key={lt.value} value={lt.value}>{t(`leaveType.${lt.value}`)} ({lt.en})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{t('leave.startTime')}</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 min-w-0 bg-slate-50 border-b-2 border-slate-200 px-1.5 py-2 font-mono font-black text-sm text-slate-700 rounded-none focus:outline-none focus:border-sky-400 transition-colors"
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 min-w-0 bg-slate-50 border-b-2 border-slate-200 px-1.5 py-2 font-mono font-black text-sm text-slate-700 rounded-none focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{t('leave.endTime')}</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 min-w-0 bg-slate-50 border-b-2 border-slate-200 px-1.5 py-2 font-mono font-black text-sm text-slate-700 rounded-none focus:outline-none focus:border-sky-400 transition-colors"
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 min-w-0 bg-slate-50 border-b-2 border-slate-200 px-1.5 py-2 font-mono font-black text-sm text-slate-700 rounded-none focus:outline-none focus:border-sky-400 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 ml-1">{t('leave.reason')}</label>
            <textarea
              rows="3"
              placeholder={t('leave.reasonPlaceholder')}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-slate-50 border-b-2 border-slate-200 p-3 font-zh text-slate-600 rounded-none focus:outline-none focus:border-sky-400 transition-colors resize-none"
            />
          </div>

          <MarkerButton
            color="#0ea5e9"
            rotate="1deg"
            fontSize={17}
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            style={{ width: '100%' }}
          >
            <Send size={20} aria-hidden="true" />
            <span>{isSubmitting ? t('common.submitting') : t('common.submit')}</span>
          </MarkerButton>
        </div>
      </PaperPiece>

      {/* Feature 4: Company leave calendar — always shown, washi-tape labelled */}
      <CompanyCalendar
        ym={calendarYM}
        onPrev={prevMonth}
        onNext={nextMonth}
      />
    </div>
  )
}

// ------- 申請紀錄 -------

function LeaveList() {
  const { t } = useT()
  const monthOptions = useMemo(() => buildMonthOptions(), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value)
  const [statusFilter, setStatusFilter] = useState('all')
  const [cancelingId, setCancelingId] = useState(null)
  const [toast, setToast] = useState(null)
  // Feature 1: cancel-request state per card
  const [cancelRequestingId, setCancelRequestingId] = useState(null)
  const [cancelReasonMap, setCancelReasonMap] = useState({}) // id -> reason text
  const [cancelSubmittingId, setCancelSubmittingId] = useState(null)

  const { data, isLoading, mutate } = useSWR('/leave-requests', fetcher)

  // 衍生狀態：直接在 render 階段算，不用 useEffect
  const filtered = useMemo(() => {
    if (!data) return []
    return data.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      const start = typeof r.startDate === 'string' ? r.startDate.slice(0, 7) : ''
      return start === selectedMonth
    })
  }, [data, selectedMonth, statusFilter])

  async function handleCancel(id) {
    setCancelingId(id)
    try {
      await cancelLeaveRequest(id)
      // 樂觀更新：本地先移除，再 revalidate
      mutate((prev) => (prev ?? []).filter((r) => r.id !== id), { revalidate: true })
      setToast({ variant: 'success', message: t('leave.withdrawn') })
    } catch (err) {
      setToast({ variant: 'error', message: err?.message || t('leave.withdrawFailed') })
    } finally {
      setCancelingId(null)
    }
  }

  // Feature 1: submit cancellation request for approved leave
  async function handleCancelRequest(id) {
    const reason = cancelReasonMap[id] || ''
    setCancelSubmittingId(id)
    try {
      await requestLeaveCancellation(id, reason)
      mutate()
      setCancelRequestingId(null)
      setCancelReasonMap((prev) => { const n = { ...prev }; delete n[id]; return n })
      setToast({ variant: 'success', message: t('leave.cancelSent') })
    } catch (err) {
      setToast({ variant: 'error', message: err?.message || t('common.submitFailed') })
    } finally {
      setCancelSubmittingId(null)
    }
  }

  function toggleCancelRequest(id) {
    setCancelRequestingId((prev) => prev === id ? null : id)
  }

  function setCancelReason(id, val) {
    setCancelReasonMap((prev) => ({ ...prev, [id]: val }))
  }

  return (
    <div className="animate-in fade-in duration-300 pb-10">
      {toast && (
        <PaperToast
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Toolbar：月份 + 狀態篩選 */}
      <div className="flex items-center justify-between gap-2 mb-5 px-1">
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
        <MonthSelect value={selectedMonth} options={monthOptions} onChange={setSelectedMonth} />
      </div>

      {isLoading ? (
        <p className="text-center text-slate-500 text-xs py-20 font-zh">{t('common.loading')}</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 opacity-40 flex flex-col items-center gap-2">
          <Inbox size={40} className="text-slate-400" aria-hidden="true" />
          <p className="font-zh text-xs text-slate-500">{t('common.noRecordsThisMonth')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req, index) => (
            <LeaveCard
              key={req.id}
              req={req}
              rotate={LIST_ROTATIONS[index % LIST_ROTATIONS.length]}
              onCancel={handleCancel}
              isCanceling={cancelingId === req.id}
              // Feature 1 & 2 props
              cancelRequestOpen={cancelRequestingId === req.id}
              cancelReason={cancelReasonMap[req.id] || ''}
              onToggleCancelRequest={() => toggleCancelRequest(req.id)}
              onCancelReasonChange={(val) => setCancelReason(req.id, val)}
              onSubmitCancelRequest={() => handleCancelRequest(req.id)}
              isCancelSubmitting={cancelSubmittingId === req.id}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function StatusFilter({ value, onChange }) {
  const { t } = useT()
  const options = [
    { key: 'all',      label: t('common.all') },
    { key: 'pending',  label: t('common.pending') },
    { key: 'approved', label: t('common.approved') },
    { key: 'rejected', label: t('common.rejected') },
  ]
  return (
    <div className="flex items-center gap-1" role="tablist" aria-label={t('common.statusFilter')}>
      {options.map((opt) => {
        const active = value === opt.key
        return (
          <button
            type="button"
            key={opt.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.key)}
            className={`font-zh text-[11px] px-2.5 py-1 border transition-colors
              ${active
                ? 'bg-white text-sky-600 border-sky-200 shadow-sm'
                : 'bg-transparent text-slate-500 border-transparent hover:text-slate-700'}`}
            style={{ borderRadius: '8px 2px 10px 3px/3px 10px 2px 8px' }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function MonthSelect({ value, options, onChange }) {
  const { t } = useT()
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={t('common.selectMonth')}
        className="appearance-none bg-white px-3 py-1.5 pr-7 border border-slate-200 shadow-sm text-[11px] font-black text-slate-500 tracking-tight focus:outline-none rounded-full"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
    </div>
  )
}

function LeaveCard({
  req, rotate, onCancel, isCanceling,
  // Feature 1 & 2
  cancelRequestOpen, cancelReason, onToggleCancelRequest,
  onCancelReasonChange, onSubmitCancelRequest, isCancelSubmitting,
}) {
  const { t } = useT()
  const typeInfo = LEAVE_TYPE_MAP[req.leaveType] || { en: '—' }

  const dateRange = req.startDate === req.endDate
    ? formatDateFull(req.startDate)
    : `${formatDate(req.startDate)} → ${formatDate(req.endDate)}`

  const duration = formatLeaveDuration(req.startDate, req.startTime, req.endDate, req.endTime)
  const canCancel = req.status === 'pending'

  // Feature 1: approved + not yet cancelRequested → show 申請取消 button
  const canRequestCancel = req.status === 'approved' && !req.cancelRequested
  // Feature 2: cancelRequested → show amber badge instead of action
  const cancelPending = req.cancelRequested
  // Feature 2: cancelled → muted badge
  const isCancelled = req.status === 'cancelled'

  // Determine stamp status to pass to StatusStamp
  // Only pass statuses the component knows: approved|rejected|pending
  // For cancelled we render our own badge instead
  const stampStatus = isCancelled ? null : (req.status in { approved: 1, rejected: 1, pending: 1 } ? req.status : null)

  return (
    <PaperPiece color="white" rotate={rotate} className="relative p-4">
      {/* 撤回 — 紙膠帶蓋在右上角，按下去撤回此申請 (pending only) */}
      {canCancel && (
        <button
          type="button"
          onClick={() => onCancel(req.id)}
          disabled={isCanceling}
          aria-label={t('leave.withdraw')}
          className="absolute -top-2 -right-2 z-10 group active:scale-90 transition-transform disabled:opacity-60 disabled:pointer-events-none"
          style={{ transform: 'rotate(12deg)' }}
        >
          <span
            className="inline-flex items-center justify-center w-9 h-7 bg-white/40 border border-white/20 backdrop-blur-[1px] text-red-500 group-hover:bg-white/60 transition-colors"
            style={{ boxShadow: '1px 1px 2px rgba(0,0,0,0.02)' }}
          >
            <X size={14} strokeWidth={3} aria-hidden="true" />
          </span>
        </button>
      )}

      <div className="flex items-start gap-3">
        {/* 假別 badge */}
        <div
          className="shrink-0 flex flex-col items-center justify-center w-14 py-2 bg-sky-50 border border-sky-100"
          style={{ borderRadius: '10px 3px 12px 4px/4px 12px 3px 10px' }}
        >
          <span className="font-zh text-[13px] text-sky-600 leading-tight">{t(`leaveType.${req.leaveType}`)}</span>
          <span className="font-black text-[8px] text-sky-400 uppercase tracking-widest mt-0.5">
            {typeInfo.en}
          </span>
        </div>

        {/* 主要資訊 */}
        <div className="flex-1 min-w-0 border-l border-dashed border-slate-200 pl-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="font-mono font-black text-sm text-slate-700 tabular-nums">
              {dateRange}
            </span>
            <span className="font-mono text-[11px] text-slate-400 tabular-nums">
              {req.startTime} – {req.endTime}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {duration && (
              <span className="inline-flex items-center gap-1 font-mono font-black text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded tabular-nums">
                {duration}
              </span>
            )}
            {req.reason ? (
              <p className="font-zh text-[12px] text-slate-500 line-clamp-1 flex-1 min-w-0">
                {req.reason}
              </p>
            ) : (
              <p className="font-zh text-[11px] text-slate-400 italic">{t('leave.noReason')}</p>
            )}
          </div>

          {/* Feature 2: rejection reviewNote in red */}
          {req.status === 'rejected' && req.reviewNote && (
            <div className="mt-2 flex items-start gap-1.5">
              <AlertCircle size={12} className="text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="font-zh text-[11px] text-red-500 leading-snug">
                {req.reviewNote}
              </p>
            </div>
          )}
        </div>

        {/* 狀態蓋章 / 徽章 */}
        <div className="shrink-0 flex flex-col items-center gap-1.5">
          {/* Feature 2: cancelled muted badge */}
          {isCancelled && (
            <span
              className="inline-flex flex-col items-center justify-center rounded-full border-2 border-slate-300 outline outline-2 outline-slate-200 bg-slate-50/70 w-[70px] h-[70px] font-black select-none"
              style={{ transform: 'rotate(-4deg)', outlineOffset: '-5px' }}
              aria-label={t('common.cancelled')}
            >
              <Ban size={11} strokeWidth={3} className="text-slate-400" aria-hidden="true" />
              <span className="font-zh text-xs text-slate-400 leading-none mt-0.5">{t('common.cancelled')}</span>
              <span className="uppercase tracking-[0.15em] leading-none mt-0.5 opacity-70 text-[7px] text-slate-400">
                CANCELLED
              </span>
            </span>
          )}

          {/* Feature 2: cancelRequested amber badge */}
          {cancelPending && !isCancelled && (
            <span
              className="inline-flex flex-col items-center justify-center rounded-full border-2 border-amber-500 outline outline-2 outline-amber-500 bg-amber-50/70 w-[70px] h-[70px] font-black select-none"
              style={{ transform: 'rotate(-5deg)', outlineOffset: '-5px' }}
              aria-label={t('leave.cancelPending')}
            >
              <Clock size={11} strokeWidth={3} className="text-amber-600" aria-hidden="true" />
              <span className="font-zh text-[10px] text-amber-600 leading-tight mt-0.5 text-center px-1">{t('leave.cancelPending')}</span>
              <span className="uppercase tracking-[0.12em] leading-none mt-0.5 opacity-70 text-[6px] text-amber-500">
                CANCEL REQ
              </span>
            </span>
          )}

          {/* Normal status stamp for non-special statuses */}
          {stampStatus && !cancelPending && (
            <StatusStamp status={stampStatus} />
          )}
        </div>
      </div>

      {/* Feature 1: 申請取消 inline action for approved leaves */}
      {canRequestCancel && (
        <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
          {!cancelRequestOpen ? (
            <button
              type="button"
              onClick={onToggleCancelRequest}
              className="flex items-center gap-1.5 text-[11px] font-black text-amber-600 uppercase tracking-widest active:scale-95 transition-transform hover:text-amber-700"
            >
              <Ban size={12} strokeWidth={3} aria-hidden="true" />
              {t('leave.requestCancel')}
            </button>
          ) : (
            <div className="space-y-2 animate-in fade-in duration-200">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('leave.cancelReason')}</label>
              <textarea
                rows="2"
                placeholder={t('leave.cancelPlaceholder')}
                value={cancelReason}
                onChange={(e) => onCancelReasonChange(e.target.value)}
                className="w-full bg-slate-50 border-b-2 border-slate-200 p-2 font-zh text-sm text-slate-600 rounded-none focus:outline-none focus:border-amber-400 transition-colors resize-none"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={onToggleCancelRequest}
                  className="text-[11px] font-black text-slate-400 uppercase tracking-widest active:scale-95 transition-transform px-3 py-1.5"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={onSubmitCancelRequest}
                  disabled={isCancelSubmitting}
                  className="inline-flex items-center gap-1.5 text-[11px] font-black text-white bg-amber-500 border-b-4 border-amber-700 px-3 py-1.5 active:border-b-0 active:translate-y-[2px] transition-all disabled:opacity-60 disabled:pointer-events-none"
                  style={{ borderRadius: '6px 2px 8px 2px/2px 8px 2px 6px' }}
                >
                  <Send size={11} aria-hidden="true" />
                  {isCancelSubmitting ? t('common.submitting') : t('common.send')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </PaperPiece>
  )
}

// ------- Feature 4: Company Calendar -------

function CompanyCalendar({ ym, onPrev, onNext }) {
  const { t } = useT()
  const { first, last, daysInMonth, startDow } = monthBounds(ym)
  const [ymLabel] = useMemo(() => {
    const [y, m] = ym.split('-').map(Number)
    return [tr('common.monthLabel', { y, m })]
  }, [ym])

  const { data: calendarData, isLoading } = useSWR(
    `/leave-calendar?from=${first}&to=${last}`,
    () => getLeaveCalendar(first, last),
  )
  const { data: holidays } = useSWR(
    `/holidays?from=${first}&to=${last}`,
    () => getHolidays(first, last),
  )

  // 國定假日：'YYYY-MM-DD' -> 假日名稱
  const holidayMap = useMemo(() => {
    const m = {}
    for (const h of holidays ?? []) m[h.date] = h.name
    return m
  }, [holidays])

  // Build a map: 'YYYY-MM-DD' -> [name, ...]
  const dayMap = useMemo(() => {
    if (!calendarData) return {}
    const m = {}
    calendarData.forEach(({ name, startDate, endDate }) => {
      const s = new Date(startDate.slice(0, 10))
      const e = new Date(endDate.slice(0, 10))
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (!m[key]) m[key] = []
        m[key].push(name)
      }
    })
    return m
  }, [calendarData])

  const DOW = [t('weekdays.short.0'), t('weekdays.short.1'), t('weekdays.short.2'), t('weekdays.short.3'), t('weekdays.short.4'), t('weekdays.short.5'), t('weekdays.short.6')]

  return (
    <div className="relative mb-4 mt-6">
      {/* 紙膠帶 — 標示「公司行事曆」，置中貼在下方行事曆卡片上 */}
      <div
        className="absolute -top-3.5 left-1/2 z-20 flex items-center gap-1.5 px-5 py-1.5 bg-white/55 border border-white/30 backdrop-blur-[1px]"
        style={{ transform: 'translateX(-50%) rotate(-2deg)', boxShadow: '1px 1px 2px rgba(0,0,0,0.04)' }}
      >
        <Users size={15} className="text-slate-400" aria-hidden="true" />
        <span className="font-zh text-[17px] font-bold text-slate-600">{t('leave.calendar')}</span>
      </div>

      <PaperPiece color="white" rotate="-0.8deg" className="p-4 pt-8">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={onPrev}
              aria-label={t('common.prevMonth')}
              className="p-1 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="font-zh text-xs font-bold text-slate-600">{ymLabel}</span>
            <button
              type="button"
              onClick={onNext}
              aria-label={t('common.nextMonth')}
              className="p-1 text-slate-400 hover:text-slate-600 active:scale-95 transition-all"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          {/* DOW headers */}
          <div className="grid grid-cols-7 mb-1">
            {DOW.map((d) => (
              <div key={d} className="text-center font-black text-[9px] text-slate-400 uppercase tracking-widest py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {isLoading ? (
            <p className="text-center font-zh text-xs text-slate-400 py-4">{t('common.loading')}</p>
          ) : (
            <div className="grid grid-cols-7 gap-y-0.5">
              {/* Empty cells before first day */}
              {Array.from({ length: startDow }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const key = `${ym}-${String(day).padStart(2, '0')}`
                const names = dayMap[key] || []
                const hasLeave = names.length > 0
                const holidayName = holidayMap[key]
                const isHol = !!holidayName
                return (
                  <div
                    key={key}
                    className="relative flex flex-col items-center py-1"
                    title={[isHol ? holidayName : null, hasLeave ? names.join('、') : null].filter(Boolean).join(' · ') || undefined}
                  >
                    <span
                      className={`font-mono font-black text-[11px] tabular-nums leading-none rounded-full w-6 h-6 flex items-center justify-center
                        ${isHol ? 'bg-red-100 text-red-600' : hasLeave ? 'bg-sky-100 text-sky-700' : 'text-slate-500'}`}
                    >
                      {day}
                    </span>
                    {isHol && (
                      <span className="font-zh text-[8px] text-red-500 leading-tight truncate max-w-[40px] mt-0.5">
                        {holidayName.length > 3 ? holidayName.slice(0, 3) : holidayName}
                      </span>
                    )}
                    {hasLeave && (
                      <div className="mt-0.5 flex flex-wrap justify-center gap-0.5 max-w-[36px]">
                        {names.slice(0, 2).map((n, ni) => (
                          <span
                            key={ni}
                            className="font-zh text-[8px] text-sky-500 leading-tight truncate max-w-[34px]"
                          >
                            {n.length > 2 ? n.slice(0, 2) : n}
                          </span>
                        ))}
                        {names.length > 2 && (
                          <span className="font-black text-[7px] text-sky-400">+{names.length - 2}</span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <p className="mt-3 font-zh text-[10px] text-slate-400 text-center">
            {t('leave.calendarNote')}
          </p>
      </PaperPiece>
    </div>
  )
}
