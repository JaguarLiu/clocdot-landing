import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useSWR from 'swr'
import {
  Building2, MapPin, Plus, Pencil, Trash2, Check, X, Inbox, AlertTriangle, Clock, CalendarHeart, Sparkles, CalendarCheck, Repeat, Wifi,
} from 'lucide-react'
import {
  fetcher,
  updateCompany,
  getMyIp,
  createCompanyLocation,
  updateCompanyLocation,
  deleteCompanyLocation,
  updateLeavePolicies,
} from '../services/api.js'
import PaperPiece from '../components/PaperPiece.jsx'
import PaperToast from '../components/PaperToast.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import MarkerButton from '../components/MarkerButton.jsx'
import { LEAVE_TYPES, LEAVE_TYPE_MAP, DEFAULT_LEAVE_DEDUCT_RATE, minutesToDays, daysToMinutes } from '../utils/leaveTypes.js'
import { tr, useT } from '../i18n/index.jsx'

const EMPTY_LOC_FORM = { name: '', address: '', radius: 100 }

function formatCoord(n) {
  return typeof n === 'number' ? n.toFixed(6) : '--'
}

function SectionHeader({ icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-sky-500 shadow-sm" style={{ transform: 'rotate(-3deg)' }}>
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-zh text-slate-800">{title}</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>
      {action}
    </div>
  )
}

function CompanyCard({ onToast }) {
  const { t } = useT()
  const { data: company, mutate } = useSWR('/admin/company', fetcher)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: '', breakMinutes: 60,
    leavePolicyYearReset: 'anniversary', flexibleOvertime: false, approvalLevels: 1,
    workHourType: 'flexible', lateDeductMode: 'per_minute',
  })
  const [saving, setSaving] = useState(false)

  function openEdit() {
    setForm({
      name: company?.name ?? '',
      breakMinutes: company?.breakMinutes ?? 60,
      leavePolicyYearReset: company?.leavePolicyYearReset ?? 'anniversary',
      flexibleOvertime: company?.flexibleOvertime ?? false,
      approvalLevels: company?.approvalLevels ?? 1,
      workHourType: company?.workHourType ?? 'flexible',
      lateDeductMode: company?.lateDeductMode ?? 'per_minute',
    })
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
  }

  async function save(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      onToast({ variant: 'error', message: t('settings.companyNameRequired') })
      return
    }
    setSaving(true)
    try {
      const breakMin = Number(form.breakMinutes)
      if (!Number.isInteger(breakMin) || breakMin < 0 || breakMin > 480) {
        onToast({ variant: 'error', message: t('shifts.breakRange') })
        setSaving(false)
        return
      }
      await updateCompany({
        name: form.name.trim(),
        breakMinutes: breakMin,
        leavePolicyYearReset: form.leavePolicyYearReset,
        flexibleOvertime: form.flexibleOvertime,
        approvalLevels: Number(form.approvalLevels) || 1,
        workHourType: form.workHourType,
        lateDeductMode: form.lateDeductMode,
      })
      mutate()
      setEditing(false)
      onToast({ variant: 'success', message: t('settings.companyUpdated') })
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || t('common.updateFailed') })
    } finally {
      setSaving(false)
    }
  }

  const editBtn = !editing && company && (
    <MarkerButton color="#0ea5e9" rotate="0.5deg" fontSize={12} onClick={openEdit}>
      <Pencil size={12} strokeWidth={3} />
      {t('common.edit')}
    </MarkerButton>
  )

  return (
    <section className="mb-10">
      <SectionHeader
        icon={<Building2 size={18} className="text-white" strokeWidth={2.5} />}
        title={t('settings.companyInfo')}
        subtitle="Company Profile"
        action={editBtn}
      />

      <PaperPiece color="white" rotate="-0.2deg" variant="card" className="p-6">
        {!company ? (
          <p className="font-zh text-sm text-slate-400">{t('ui.loading')}</p>
        ) : editing ? (
          <form onSubmit={save} className="space-y-4">
            <label className="block">
              <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.companyName')}</span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('seed.companyFullName')}
                className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-zh text-sm text-slate-700"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.breakMinutes')}</span>
                <input
                  type="number"
                  min={0}
                  max={480}
                  step={5}
                  value={form.breakMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, breakMinutes: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-mono tabular-nums text-sm text-slate-700"
                />
              </label>
            </div>

            <label className="block">
              <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.leaveYearReset')}</span>
              <select
                value={form.leavePolicyYearReset}
                onChange={(e) => setForm((f) => ({ ...f, leavePolicyYearReset: e.target.value }))}
                className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-zh text-sm text-slate-700"
              >
                <option value="anniversary">{t('ui.resetAnniversary')}</option>
                <option value="calendar">{t('ui.resetCalendar')}</option>
              </select>
            </label>

            <label className="block">
              <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.approvalLevels')}</span>
              <input
                type="number"
                min={1}
                max={10}
                value={form.approvalLevels}
                onChange={(e) => setForm((f) => ({ ...f, approvalLevels: e.target.value }))}
                className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-mono tabular-nums text-sm text-slate-700"
              />
            </label>

            <label className="block">
              <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.workTimeType')}</span>
              <select
                value={form.workHourType}
                onChange={(e) => setForm((f) => ({ ...f, workHourType: e.target.value }))}
                className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-zh text-sm text-slate-700"
              >
                <option value="flexible">{t('ui.variableType')}</option>
                <option value="fixed">{t('ui.fixedType')}</option>
              </select>
            </label>

            {form.workHourType === 'fixed' && (
              <label className="block">
                <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.deductionMethod')}</span>
                <select
                  value={form.lateDeductMode}
                  onChange={(e) => setForm((f) => ({ ...f, lateDeductMode: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-zh text-sm text-slate-700"
                >
                  <option value="per_minute">{t('ui.deductByMinute')}</option>
                  <option value="per_hour">{t('ui.deductByHour')}</option>
                </select>
              </label>
            )}

            <div className="flex items-start gap-3 select-none">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, flexibleOvertime: !f.flexibleOvertime }))}
                aria-pressed={form.flexibleOvertime}
                aria-label={t('settings.flexTime')}
                className="mt-0.5 shrink-0 w-5 h-5 border-2 flex items-center justify-center active:scale-95 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                style={{
                  borderColor: form.flexibleOvertime ? '#10b981' : '#cbd5e1',
                  background: form.flexibleOvertime ? '#10b981' : 'transparent',
                }}
              >
                {form.flexibleOvertime && <Check size={13} strokeWidth={4} className="text-white" />}
              </button>
              <span>
                <span className="font-zh text-sm text-slate-700">{t('ui.flexVariable')}</span>
                <span className="font-zh text-xs text-slate-400 block mt-0.5">{t('ui.flexHelp')}</span>
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <MarkerButton as="button" type="submit" color="#10b981" rotate="-0.5deg" disabled={saving}>
                <Check size={14} strokeWidth={3} />
                {saving ? t('common.saving') : t('common.save')}
              </MarkerButton>
              <MarkerButton color="#94a3b8" rotate="0.5deg" onClick={cancel} disabled={saving}>
                <X size={14} strokeWidth={3} />
                {t('common.cancel')}
              </MarkerButton>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap gap-8 items-center">
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Name</p>
              <p className="font-zh text-base text-slate-700">{company.name}</p>
            </div>
            <div className="pl-8 border-l border-dashed border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <Clock size={10} strokeWidth={3} />
                Work Hours
              </p>
              <Link to="/schedule" className="font-zh text-sm text-emerald-600 underline decoration-dashed underline-offset-4 hover:text-emerald-700">{t('ui.manageShiftsInSchedule')}</Link>
            </div>
            <div className="pl-8 border-l border-dashed border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Break</p>
              <p className="font-mono font-black text-base text-slate-700 tabular-nums">
                {company.breakMinutes ?? 60}
                <span className="text-slate-400 text-xs font-zh ml-1">{t('ui.minutes')}</span>
              </p>
            </div>
            <div className="pl-8 border-l border-dashed border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Year Reset</p>
              <p className="font-zh text-base text-slate-700">
                {company.leavePolicyYearReset === 'calendar' ? t('settings.calendarYear') : t('settings.anniversary')}
              </p>
            </div>
            <div className="pl-8 border-l border-dashed border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">OT Cap</p>
              <p className="font-zh text-base text-slate-700">
                {company.flexibleOvertime ? t('settings.variable54h') : '46h'}
              </p>
            </div>
            <div className="pl-8 border-l border-dashed border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Work Hour Type</p>
              <p className="font-zh text-base text-slate-700">
                {company.workHourType === 'fixed'
                  ? t('fmt.fixedMode', { mode: company.lateDeductMode === 'per_hour' ? t('payroll.byHourRoundUp') : t('payroll.byMinuteRatio') })
                  : t('settings.variableHours')}
              </p>
            </div>
          </div>
        )}
      </PaperPiece>
    </section>
  )
}

function LocationsSection({ onToast }) {
  const { t } = useT()
  const { data, mutate, isLoading } = useSWR('/admin/company-locations', fetcher)
  const [editing, setEditing] = useState(null) // null | 'new' | location.id
  const [form, setForm] = useState(EMPTY_LOC_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const list = data ?? []

  function openNew() {
    setEditing('new')
    setForm(EMPTY_LOC_FORM)
  }
  function openEdit(loc) {
    setEditing(loc.id)
    setForm({ name: loc.name, address: loc.address, radius: loc.radius })
  }
  function closeForm() {
    setEditing(null)
    setForm(EMPTY_LOC_FORM)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.address.trim()) {
      onToast({ variant: 'error', message: t('settings.locationRequired') })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim(),
        radius: Number(form.radius) || 100,
      }
      const saved = editing === 'new'
        ? await createCompanyLocation(payload)
        : await updateCompanyLocation(editing, payload)
      mutate()
      closeForm()
      if (saved?.lat == null || saved?.lng == null) {
        onToast({ variant: 'error', message: t('settings.geocodeFailed') })
      } else {
        onToast({ variant: 'success', message: editing === 'new' ? t('settings.locationAdded') : t('settings.locationUpdated') })
      }
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || t('common.actionFailed') })
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      await deleteCompanyLocation(confirmTarget.id)
      mutate()
      onToast({ variant: 'success', message: t('settings.locationDeleted') })
      setConfirmTarget(null)
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || t('common.deleteFailed') })
    } finally {
      setDeleting(false)
    }
  }

  const addBtn = editing === null && (
    <MarkerButton color="#0ea5e9" rotate="-0.5deg" onClick={openNew}>
      <Plus size={15} strokeWidth={3} />{t('ui.addLocation')}</MarkerButton>
  )

  return (
    <section class="mb-10">
      <SectionHeader
        icon={<MapPin size={18} className="text-white" strokeWidth={2.5} />}
        title={t('settings.locations')}
        subtitle="Office Locations"
        action={addBtn}
      />

      <ConfirmDialog
        open={confirmTarget !== null}
        variant="danger"
        title={t('settings.deleteLocation')}
        message={confirmTarget && t('fmt.confirmDeleteGeneric', { name: confirmTarget.name })}
        confirmLabel={t('common.del')}
        cancelLabel={t('common.cancel')}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setConfirmTarget(null)}
      />


      {editing !== null && (
        <div className="mb-10">
        <PaperPiece color="white" rotate="-0.2deg" variant="card" className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
              {editing === 'new' ? 'New Location' : 'Edit Location'}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.locationName')}</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('seed.locationsExample')}
                  className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-zh text-sm text-slate-700"
                />
              </label>
              <label className="block">
                <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.radiusMeters')}</span>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={form.radius}
                  onChange={(e) => setForm((f) => ({ ...f, radius: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-mono tabular-nums text-sm text-slate-700"
                />
              </label>
            </div>

            <label className="block">
              <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.addressField')}</span>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder={t('seed.hqAddress')}
                className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-zh text-sm text-slate-700"
              />
            </label>

            <div className="flex items-center gap-3 pt-1">
              <MarkerButton as="button" type="submit" color="#10b981" rotate="-0.5deg" disabled={submitting}>
                <Check size={14} strokeWidth={3} />
                {submitting ? t('common.saving') : t('common.save')}
              </MarkerButton>
              <MarkerButton color="#94a3b8" rotate="0.5deg" onClick={closeForm} disabled={submitting}>
                <X size={14} strokeWidth={3} />
                {t('common.cancel')}
              </MarkerButton>
            </div>
          </form>
        </PaperPiece>
        </div>
      )}

      {isLoading ? (
        <p className="font-zh text-sm text-slate-400 py-10 text-center">{t('ui.loading')}</p>
      ) : list.length === 0 ? (
        <div className="text-center py-20 opacity-40 flex flex-col items-center gap-3">
          <Inbox size={48} className="text-slate-300" />
          <p className="font-zh text-sm text-slate-400">{t('ui.noLocationsYet')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((loc, index) => {
            const rotate = index % 2 === 0 ? '-0.3deg' : '0.25deg'
            const hasCoord = typeof loc.lat === 'number' && typeof loc.lng === 'number'
            return (
              <PaperPiece
                key={loc.id}
                color="white"
                rotate={rotate}
                variant="card"
                className="p-5"
              >
                <div className="flex items-center gap-5 flex-wrap lg:flex-nowrap">
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <div className="w-10 h-10 rounded-full bg-sky-100 border-2 border-sky-50 flex items-center justify-center shrink-0">
                      <MapPin size={16} className="text-sky-500" strokeWidth={2.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-zh text-sm text-slate-700 truncate">{loc.name}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Radius {loc.radius}m
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[220px] pl-5 border-l border-dashed border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Address</p>
                    <p className="font-zh text-sm text-slate-600 line-clamp-2">{loc.address}</p>
                  </div>

                  <div className="pl-5 border-l border-dashed border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Lat / Lng</p>
                    {hasCoord ? (
                      <p className="font-mono font-black text-sm text-slate-700 tabular-nums whitespace-nowrap">
                        {formatCoord(loc.lat)}, {formatCoord(loc.lng)}
                      </p>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500 border-2 border-dashed border-red-300 px-2 py-1"
                        style={{ transform: 'rotate(-2deg)', borderRadius: '6px 2px 8px 3px/3px 8px 2px 6px' }}
                      >
                        <AlertTriangle size={11} strokeWidth={3} />
                        Geocode failed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <MarkerButton color="#0ea5e9" rotate="-0.5deg" fontSize={12} onClick={() => openEdit(loc)}>
                      <Pencil size={12} strokeWidth={3} />
                      {t('common.edit')}
                    </MarkerButton>
                    <MarkerButton color="#ef4444" rotate="0.5deg" fontSize={12} onClick={() => setConfirmTarget(loc)}>
                      <Trash2 size={12} strokeWidth={3} />
                      {t('common.del')}
                    </MarkerButton>
                  </div>
                </div>
              </PaperPiece>
            )
          })}
        </div>
      )}
    </section>
  )
}

function LeavePolicySection({ onToast }) {
  const { t } = useT()
  const { data, mutate, isLoading } = useSWR('/admin/leave-policies', fetcher)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({}) // leaveType -> days string ('' = 不設限)
  const [rateForm, setRateForm] = useState({}) // leaveType -> 扣薪% string ('' = 用系統預設)
  const [saving, setSaving] = useState(false)

  // 第一次設定 = 公司還沒任何假別有額度 (全為 null)
  const isFirstSetup = !!data && data.every((p) => p.annualQuotaMinutes == null)

  function buildFormFrom(rows, { useStatutoryDefault }) {
    const init = {}
    for (const p of rows || []) {
      const meta = LEAVE_TYPE_MAP[p.leaveType]
      if (p.annualQuotaMinutes != null) {
        init[p.leaveType] = String(minutesToDays(p.annualQuotaMinutes))
      } else if (useStatutoryDefault && meta?.autofillOnFirstSetup && meta.statutoryDays > 0) {
        init[p.leaveType] = String(meta.statutoryDays)
      } else {
        init[p.leaveType] = ''
      }
    }
    return init
  }

  function openEdit() {
    // 第一次設定：自動把法定預設帶入；之後再次編輯則維持公司目前值
    setForm(buildFormFrom(data, { useStatutoryDefault: isFirstSetup }))
    const rates = {}
    for (const p of data || []) {
      rates[p.leaveType] = p.deductRate != null ? String(Math.round(p.deductRate * 100)) : ''
    }
    setRateForm(rates)
    setEditing(true)
  }

  function applyStatutoryDefaults() {
    setForm(buildFormFrom(data, { useStatutoryDefault: true }))
  }

  async function save(e) {
    e.preventDefault()
    const policies = []
    for (const p of data || []) {
      const raw = form[p.leaveType]
      // 扣薪比例：'' = 用系統預設(null)，否則 0~100% → 0~1
      const rateRaw = rateForm[p.leaveType]
      let deductRate = null
      if (rateRaw !== '' && rateRaw !== undefined) {
        const pct = Number(rateRaw)
        if (Number.isNaN(pct) || pct < 0 || pct > 100) {
          onToast({ variant: 'error', message: t('fmt.deductPctInvalid', { label: p.label }) })
          return
        }
        deductRate = pct / 100
      }
      if (raw === '' || raw === undefined) {
        // 無年度額度 → server 會刪除該政策列，扣薪比例需搭配額度才能保存
        policies.push({ leaveType: p.leaveType, annualQuotaMinutes: null })
        continue
      }
      const days = Number(raw)
      if (Number.isNaN(days) || days < 0) {
        onToast({ variant: 'error', message: t('fmt.daysInvalid', { label: p.label }) })
        return
      }
      policies.push({ leaveType: p.leaveType, annualQuotaMinutes: daysToMinutes(days), deductRate })
    }
    setSaving(true)
    try {
      await updateLeavePolicies(policies)
      mutate()
      setEditing(false)
      onToast({ variant: 'success', message: t('settings.leavePolicyUpdated') })
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || t('common.updateFailed') })
    } finally {
      setSaving(false)
    }
  }

  const editBtn = !editing && (
    <MarkerButton
      color={isFirstSetup ? '#f59e0b' : '#0ea5e9'}
      rotate="-0.5deg"
      fontSize={12}
      onClick={openEdit}
    >
      {isFirstSetup ? <Sparkles size={12} strokeWidth={3} /> : <Pencil size={12} strokeWidth={3} />}
      {isFirstSetup ? t('settings.applyStatutoryDefaults') : t('common.edit')}
    </MarkerButton>
  )

  return (
    <section className="mb-10">
      <SectionHeader
        icon={<CalendarHeart size={18} className="text-white" strokeWidth={2.5} />}
        title={t('settings.leavePolicy')}
        subtitle="Leave Policies"
        action={editBtn}
      />
      <p className="font-zh text-xs text-slate-500 mb-3 pl-1">{t('ui.quotaHelp')}<span className="ml-1 text-slate-400">{t('ui.annualProrataHelp')}</span>
      </p>

      <PaperPiece color="white" rotate="-0.25deg" variant="card" className="p-6">
        {isLoading ? (
          <p className="font-zh text-sm text-slate-400">{t('ui.loading')}</p>
        ) : editing ? (
          <form onSubmit={save} className="space-y-4">
            {isFirstSetup && (
              <div
                className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-dashed border-amber-300"
                style={{ transform: 'rotate(-0.3deg)', borderRadius: '8px 3px 10px 4px/4px 10px 3px 8px' }}
              >
                <Sparkles size={16} className="text-amber-600 mt-0.5 shrink-0" strokeWidth={2.5} />
                <div className="flex-1 min-w-0">
                  <p className="font-zh text-sm text-amber-900">{t('ui.statutoryLoaded')}</p>
                  <p className="font-zh text-xs text-amber-700 mt-0.5">
                    <b>{t('ui.specialLeaves')}</b>{t('ui.specialLeavesHelp')}</p>
                </div>
                <button
                  type="button"
                  onClick={applyStatutoryDefaults}
                  className="font-zh text-xs px-3 py-1.5 bg-white border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors shrink-0"
                >{t('ui.reloadDefaults')}</button>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {LEAVE_TYPES.map((t) => (
                <label key={t.value} className="block" title={t.note || ''}>
                  <span className="font-zh text-xs text-slate-500 mb-1.5 flex items-center gap-1">
                    {t.label}
                    <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t.en}</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={form[t.value] ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [t.value]: e.target.value }))}
                      placeholder="—"
                      className="w-full px-2 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-mono tabular-nums text-sm text-slate-700"
                    />
                    <span className="text-[10px] font-black text-slate-400 uppercase">{t('ui.days')}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={5}
                      value={rateForm[t.value] ?? ''}
                      onChange={(e) => setRateForm((f) => ({ ...f, [t.value]: e.target.value }))}
                      placeholder={String(Math.round((DEFAULT_LEAVE_DEDUCT_RATE[t.value] ?? 0) * 100))}
                      className="w-full px-2 py-1.5 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-mono tabular-nums text-xs text-slate-700"
                    />
                    <span className="text-[10px] font-black text-slate-400 uppercase">{t('ui.dailyDeductPct')}</span>
                  </div>
                  {t.note && (
                    <p className="font-zh text-[10px] text-slate-400 mt-1 leading-tight">{t.note}</p>
                  )}
                </label>
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <MarkerButton as="button" type="submit" color="#10b981" rotate="-0.5deg" disabled={saving}>
                <Check size={14} strokeWidth={3} />
                {saving ? t('common.saving') : t('common.save')}
              </MarkerButton>
              <MarkerButton color="#94a3b8" rotate="0.5deg" onClick={() => setEditing(false)} disabled={saving}>
                <X size={14} strokeWidth={3} />
                {t('common.cancel')}
              </MarkerButton>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-y-3 gap-x-6">
            {(data || []).map((p) => (
              <div key={p.leaveType} className="flex flex-col">
                <p className="font-zh text-xs text-slate-500">{p.label}</p>
                <p className="font-mono font-black tabular-nums text-base mt-0.5">
                  {p.annualQuotaMinutes == null ? (
                    <span className="text-slate-300">—</span>
                  ) : (
                    <>
                      <span className="text-slate-700">{minutesToDays(p.annualQuotaMinutes)}</span>
                      <span className="text-slate-400 text-xs font-zh ml-1">{t('ui.days')}</span>
                    </>
                  )}
                </p>
                <p className="font-zh text-[10px] text-slate-400 mt-0.5">
                  {t('fmt.dailyDeduct', { n: Math.round((p.deductRate ?? DEFAULT_LEAVE_DEDUCT_RATE[p.leaveType] ?? 0) * 100) })}
                  {p.deductRate == null && <span className="text-slate-300">{t('ui.isDefault')}</span>}
                </p>
              </div>
            ))}
          </div>
        )}
      </PaperPiece>
    </section>
  )
}

// ISO weekday: 1=Mon..7=Sun
const WEEKDAY_LABELS = [
  { iso: 1, zh: tr('weekdays.short.1'), en: 'MON' },
  { iso: 2, zh: tr('weekdays.short.2'), en: 'TUE' },
  { iso: 3, zh: tr('weekdays.short.3'), en: 'WED' },
  { iso: 4, zh: tr('weekdays.short.4'), en: 'THU' },
  { iso: 5, zh: tr('weekdays.short.5'), en: 'FRI' },
  { iso: 6, zh: tr('weekdays.short.6'), en: 'SAT' },
  { iso: 7, zh: tr('common.day'), en: 'SUN' },
]

function toDateInputValue(d) {
  if (!d) return ''
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Tailwind JIT 看不到動態 class 字串 — accent 對應表用靜態字面量
const CHIP_ACTIVE_CLASS = {
  emerald: 'bg-emerald-500 text-white border-emerald-700 shadow-[2px_2px_0_0] shadow-emerald-700',
  sky: 'bg-sky-500 text-white border-sky-700 shadow-[2px_2px_0_0] shadow-sky-700',
  orange: 'bg-orange-500 text-white border-orange-700 shadow-[2px_2px_0_0] shadow-orange-700',
}

function ChipBox({ active, accent = 'emerald', rotate = '0deg', children, onClick, disabled }) {
  // 直角 — 遵守 admin 風格鐵則 (DESIGN.md §3.4)
  const activeClass = active
    ? (CHIP_ACTIVE_CLASS[accent] ?? CHIP_ACTIVE_CLASS.emerald)
    : 'bg-white text-slate-500 border-slate-200 border-dashed hover:border-slate-300'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ transform: active ? rotate : '0deg' }}
      className={`relative px-0 py-0 border-2 transition-all active:scale-[0.94] disabled:opacity-50 disabled:pointer-events-none ${activeClass}`}
    >
      {children}
    </button>
  )
}

function OnsiteScheduleSection({ onToast }) {
  const { t } = useT()
  const { data: company, mutate } = useSWR('/admin/company', fetcher)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    onsiteCycleWeeks: 1,
    onsiteWeekdaysByCycle: [[]],
    onsiteMonthDays: [],
    scheduleAnchorDate: '',
  })
  const [saving, setSaving] = useState(false)

  function readFromCompany(c) {
    const cycle = c?.onsiteCycleWeeks ?? 1
    let weekdays = Array.isArray(c?.onsiteWeekdaysByCycle) ? c.onsiteWeekdaysByCycle : []
    // 確保長度等於 cycle
    weekdays = Array.from({ length: cycle }, (_, i) => Array.isArray(weekdays[i]) ? [...weekdays[i]] : [])
    return {
      onsiteCycleWeeks: cycle,
      onsiteWeekdaysByCycle: weekdays,
      onsiteMonthDays: Array.isArray(c?.onsiteMonthDays) ? [...c.onsiteMonthDays] : [],
      scheduleAnchorDate: toDateInputValue(c?.scheduleAnchorDate),
    }
  }

  function openEdit() {
    setForm(readFromCompany(company))
    setEditing(true)
  }

  function changeCycle(n) {
    setForm((f) => {
      const next = Array.from({ length: n }, (_, i) => f.onsiteWeekdaysByCycle[i] ?? [])
      return { ...f, onsiteCycleWeeks: n, onsiteWeekdaysByCycle: next }
    })
  }

  function toggleWeekday(cycleIdx, iso) {
    setForm((f) => {
      const next = f.onsiteWeekdaysByCycle.map((row, i) => {
        if (i !== cycleIdx) return row
        return row.includes(iso) ? row.filter((d) => d !== iso) : [...row, iso].sort((a, b) => a - b)
      })
      return { ...f, onsiteWeekdaysByCycle: next }
    })
  }

  function toggleMonthDay(d) {
    setForm((f) => ({
      ...f,
      onsiteMonthDays: f.onsiteMonthDays.includes(d)
        ? f.onsiteMonthDays.filter((x) => x !== d)
        : [...f.onsiteMonthDays, d].sort((a, b) => a - b),
    }))
  }

  async function save(e) {
    e.preventDefault()
    if (form.onsiteCycleWeeks > 1 && !form.scheduleAnchorDate) {
      onToast({ variant: 'error', message: t('shifts.cycleNeedsAnchor') })
      return
    }
    setSaving(true)
    try {
      await updateCompany({
        onsiteCycleWeeks: form.onsiteCycleWeeks,
        onsiteWeekdaysByCycle: form.onsiteWeekdaysByCycle,
        onsiteMonthDays: form.onsiteMonthDays,
        scheduleAnchorDate: form.onsiteCycleWeeks > 1 ? form.scheduleAnchorDate : null,
      })
      mutate()
      setEditing(false)
      onToast({ variant: 'success', message: t('settings.onsiteUpdated') })
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || t('common.updateFailed') })
    } finally {
      setSaving(false)
    }
  }

  // 顯示用 (非 editing)
  const display = readFromCompany(company)
  const totalConfigured = display.onsiteWeekdaysByCycle.flat().length + display.onsiteMonthDays.length
  const isUnset = totalConfigured === 0

  const editBtn = !editing && company && (
    <MarkerButton color="#0ea5e9" rotate="0.5deg" fontSize={12} onClick={openEdit}>
      <Pencil size={12} strokeWidth={3} />
      {t('common.edit')}
    </MarkerButton>
  )

  return (
    <section className="mb-10">
      <SectionHeader
        icon={<CalendarCheck size={18} className="text-white" strokeWidth={2.5} />}
        title={t('settings.onsiteDays')}
        subtitle="Onsite Schedule"
        action={editBtn}
      />
      <p className="font-zh text-xs text-slate-500 mb-3 pl-1">{t('ui.onsiteHelp')}<span className="ml-1 text-slate-400">{t('ui.onsiteHelp2')}</span>
      </p>

      <PaperPiece color="white" rotate="-0.25deg" variant="card" className="p-6">
        {!company ? (
          <p className="font-zh text-sm text-slate-400">{t('ui.loading')}</p>
        ) : editing ? (
          <form onSubmit={save} className="space-y-6">
            {/* 循環長度 */}
            <div className="flex items-center gap-3 flex-wrap">
              <Repeat size={14} className="text-slate-400" strokeWidth={3} />
              <span className="font-zh text-xs text-slate-500">{t('ui.cycleLength')}</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((n) => (
                  <ChipBox
                    key={n}
                    active={form.onsiteCycleWeeks === n}
                    accent="sky"
                    rotate="-0.5deg"
                    onClick={() => changeCycle(n)}
                  >
                    <span className="block w-12 py-1.5 text-xs font-mono font-black tabular-nums">
                      {n}{n === 1 ? t('common.week') : t('common.week')}
                    </span>
                  </ChipBox>
                ))}
              </div>
              {form.onsiteCycleWeeks > 1 && (
                <span className="font-zh text-[11px] text-slate-400 ml-1">{t('ui.cycleWeeksHint')}</span>
              )}
            </div>

            {/* 每週固定 (cycle rows) */}
            <div className="space-y-3">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
                Weekly Onsite Days
              </p>
              {form.onsiteWeekdaysByCycle.map((row, cycleIdx) => (
                <div key={cycleIdx} className="flex items-center gap-3 flex-wrap">
                  {form.onsiteCycleWeeks > 1 && (
                    <span className="font-zh text-xs text-slate-500 w-12 shrink-0">
                      {t('fmt.weekLetter', { letter: String.fromCharCode(65 + cycleIdx) })}
                    </span>
                  )}
                  <div className="flex gap-1.5 flex-wrap">
                    {WEEKDAY_LABELS.map((w, i) => {
                      const active = row.includes(w.iso)
                      return (
                        <ChipBox
                          key={w.iso}
                          active={active}
                          accent="emerald"
                          rotate={i % 2 === 0 ? '-0.6deg' : '0.5deg'}
                          onClick={() => toggleWeekday(cycleIdx, w.iso)}
                        >
                          <span className="block w-14 py-2 text-center">
                            <span className="font-zh text-sm leading-none">{w.zh}</span>
                            <span className="block text-[8px] font-black uppercase tracking-widest opacity-70 mt-0.5">
                              {w.en}
                            </span>
                          </span>
                        </ChipBox>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* 起算日 */}
            {form.onsiteCycleWeeks > 1 && (
              <label className="block max-w-xs">
                <span className="font-zh text-xs text-slate-500 mb-1.5 block">{t('ui.weekAStart')}<span className="text-slate-400">{t('ui.pickMonday')}</span>
                </span>
                <input
                  type="date"
                  value={form.scheduleAnchorDate}
                  onChange={(e) => setForm((f) => ({ ...f, scheduleAnchorDate: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-mono tabular-nums text-sm text-slate-700"
                />
              </label>
            )}

            {/* 每月固定日 */}
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
                Monthly Onsite Days
              </p>
              <div className="grid grid-cols-7 sm:grid-cols-10 md:grid-cols-[repeat(16,minmax(0,1fr))] gap-1.5">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                  const active = form.onsiteMonthDays.includes(d)
                  return (
                    <ChipBox
                      key={d}
                      active={active}
                      accent="orange"
                      rotate={d % 2 === 0 ? '0.6deg' : '-0.5deg'}
                      onClick={() => toggleMonthDay(d)}
                    >
                      <span className="block py-1.5 text-xs font-mono font-black tabular-nums">
                        {d}
                      </span>
                    </ChipBox>
                  )
                })}
              </div>
              <p className="font-zh text-[11px] text-slate-400">{t('ui.unionHint')}</p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <MarkerButton as="button" type="submit" color="#10b981" rotate="-0.5deg" disabled={saving}>
                <Check size={14} strokeWidth={3} />
                {saving ? t('common.saving') : t('common.save')}
              </MarkerButton>
              <MarkerButton color="#94a3b8" rotate="0.5deg" onClick={() => setEditing(false)} disabled={saving}>
                <X size={14} strokeWidth={3} />
                {t('common.cancel')}
              </MarkerButton>
            </div>
          </form>
        ) : isUnset ? (
          <div
            className="inline-flex items-center gap-2 border-2 border-dashed border-slate-300 px-4 py-2"
            style={{ transform: 'rotate(-1deg)', borderRadius: '8px 2px 10px 3px/3px 10px 2px 8px' }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400">Unset</p>
            <p className="font-zh text-xs text-slate-500">{t('ui.noOnsiteConfigured')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cycle</p>
              <p className="font-mono font-black text-base text-slate-700 tabular-nums">
                {display.onsiteCycleWeeks}<span className="text-slate-400 text-xs font-zh ml-1">{t('ui.weekCycle')}</span>
              </p>
              {display.scheduleAnchorDate && display.onsiteCycleWeeks > 1 && (
                <p className="font-zh text-xs text-slate-400">{t('ui.weekAAnchor')}<span className="font-mono tabular-nums">{display.scheduleAnchorDate}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              {display.onsiteWeekdaysByCycle.map((row, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {display.onsiteCycleWeeks > 1 && (
                    <span className="font-zh text-xs text-slate-500 w-10 shrink-0">
                      {t('fmt.weekLetter', { letter: String.fromCharCode(65 + idx) })}
                    </span>
                  )}
                  {row.length === 0 ? (
                    <span className="font-zh text-xs text-slate-300">{t('ui.allRemote')}</span>
                  ) : (
                    <div className="flex gap-1 flex-wrap">
                      {WEEKDAY_LABELS.filter((w) => row.includes(w.iso)).map((w) => (
                        <span
                          key={w.iso}
                          className="px-2 py-1 bg-emerald-100 text-emerald-700 font-zh text-xs border border-emerald-200"
                        >
                          {w.zh}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {display.onsiteMonthDays.length > 0 && (
              <div className="flex items-start gap-3 pt-2 border-t border-dashed border-slate-200">
                <span className="font-zh text-xs text-slate-500 mt-1 shrink-0">{t('ui.perMonth')}</span>
                <div className="flex gap-1 flex-wrap">
                  {display.onsiteMonthDays.map((d) => (
                    <span
                      key={d}
                      className="px-2 py-1 bg-orange-100 text-orange-700 font-mono font-black tabular-nums text-xs border border-orange-200"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </PaperPiece>
    </section>
  )
}


function WifiCheckinSection({ onToast }) {
  const { t } = useT()
  const { data: company, mutate } = useSWR('/admin/company', fetcher)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [ips, setIps] = useState([])
  const [draft, setDraft] = useState('')

  // 單一 IP 或 CIDR 的寬鬆前端檢查（後端 ipMatch 才是權威驗證）
  const looksLikeIpOrCidr = (s) =>
    /^[0-9a-fA-F:.]+(\/\d{1,3})?$/.test(s.trim()) && s.trim().length >= 2

  function openEdit() {
    setEnabled(Boolean(company?.wifiCheckinEnabled))
    setIps(Array.isArray(company?.allowedIps) ? [...company.allowedIps] : [])
    setDraft('')
    setEditing(true)
  }

  function addDraft() {
    const s = draft.trim()
    if (!s) return
    if (!looksLikeIpOrCidr(s)) {
      onToast({ variant: 'error', message: t('settings.ipInvalid') })
      return
    }
    if (ips.includes(s)) {
      onToast({ variant: 'error', message: t('settings.ipDuplicate') })
      return
    }
    setIps((list) => [...list, s])
    setDraft('')
  }

  async function fillMyIp() {
    try {
      const { ip } = await getMyIp()
      setDraft(ip)
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || t('settings.ipUnavailable') })
    }
  }

  async function save(e) {
    e.preventDefault()
    if (enabled && ips.length === 0) {
      onToast({ variant: 'error', message: t('settings.wifiNeedsIp') })
      return
    }
    setSaving(true)
    try {
      await updateCompany({ wifiCheckinEnabled: enabled, allowedIps: ips })
      mutate()
      setEditing(false)
      onToast({ variant: 'success', message: t('settings.wifiUpdated') })
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || t('common.updateFailed') })
    } finally {
      setSaving(false)
    }
  }

  const editBtn = !editing && company && (
    <MarkerButton color="#0ea5e9" rotate="0.5deg" fontSize={12} onClick={openEdit}>
      <Pencil size={12} strokeWidth={3} />
      {t('common.edit')}
    </MarkerButton>
  )

  return (
    <section className="mb-10">
      <SectionHeader
        icon={<Wifi size={18} className="text-white" strokeWidth={2.5} />}
        title={t('settings.wifiPunch')}
        subtitle="WiFi Check-in"
        action={editBtn}
      />
      <p className="font-zh text-xs text-slate-500 mb-3 pl-1">{t('ui.wifiHelp')}<span className="ml-1 text-slate-400">{t('ui.wifiHelp2')}</span>
      </p>

      <PaperPiece color="white" rotate="0.25deg" variant="card" className="p-6">
        {!company ? (
          <p className="font-zh text-sm text-slate-400">{t('ui.loading')}</p>
        ) : editing ? (
          <form onSubmit={save} className="space-y-5">
            {/* 啟用開關 */}
            <div className="flex items-center gap-2">
              <ChipBox active={!enabled} accent="emerald" rotate="-0.5deg" onClick={() => setEnabled(false)}>
                <span className="block px-3 py-1.5 font-zh text-sm">{t('common.disable')}</span>
              </ChipBox>
              <ChipBox active={enabled} accent="sky" rotate="0.5deg" onClick={() => setEnabled(true)}>
                <span className="block px-3 py-1.5 font-zh text-sm">{t('ui.enable')}</span>
              </ChipBox>
              {enabled && ips.length === 0 && (
                <span className="font-zh text-[11px] text-red-500 ml-1">{t('ui.wifiNeedIpToSave')}</span>
              )}
            </div>

            {/* IP 清單 */}
            <div className="space-y-2">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
                Allowed IP / CIDR
              </p>
              {ips.length === 0 ? (
                <p className="font-zh text-xs text-slate-400">{t('ui.noIpsYet')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {ips.map((ip) => (
                    <li key={ip} className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-sky-50 text-sky-700 font-mono font-black text-xs border border-sky-200">
                        {ip}
                      </span>
                      <button
                        type="button"
                        onClick={() => setIps((list) => list.filter((x) => x !== ip))}
                        className="text-slate-300 hover:text-red-500 transition-colors active:scale-95"
                        aria-label={t('fmt.deleteIp', { ip })}
                      >
                        <Trash2 size={14} strokeWidth={2.5} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addDraft() }
                  }}
                  placeholder={t('settings.ipPlaceholder')}
                  className="w-56 px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-sky-400 outline-none font-mono text-sm text-slate-700"
                />
                <MarkerButton color="#0ea5e9" rotate="-0.5deg" fontSize={12} onClick={addDraft}>
                  <Plus size={12} strokeWidth={3} />{t('ui.addIp')}</MarkerButton>
                <MarkerButton color="#94a3b8" rotate="0.5deg" fontSize={12} onClick={fillMyIp}>{t('ui.useMyIp')}</MarkerButton>
              </div>
              <p className="font-zh text-[11px] text-slate-400">{t('ui.useMyIpHelp')}</p>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <MarkerButton as="button" type="submit" color="#10b981" rotate="-0.5deg" disabled={saving}>
                <Check size={14} strokeWidth={3} />
                {saving ? t('common.saving') : t('common.save')}
              </MarkerButton>
              <MarkerButton color="#94a3b8" rotate="0.5deg" onClick={() => setEditing(false)} disabled={saving}>
                <X size={14} strokeWidth={3} />
                {t('common.cancel')}
              </MarkerButton>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">Status</span>
              <span
                className={`px-2 py-0.5 font-zh text-xs border ${
                  company.wifiCheckinEnabled
                    ? 'bg-sky-50 text-sky-700 border-sky-200'
                    : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}
              >
                {company.wifiCheckinEnabled ? t('common.enabled') : t('common.disabled')}
              </span>
            </div>
            {(company.allowedIps ?? []).length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {company.allowedIps.map((ip) => (
                  <span key={ip} className="px-2 py-1 bg-sky-50 text-sky-700 font-mono font-black text-xs border border-sky-200">
                    {ip}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </PaperPiece>
    </section>
  )
}


export default function Settings() {
  const { t } = useT()
  const [toast, setToast] = useState(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <div className="animate-in fade-in duration-300">
      {toast && <PaperToast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} />}

      <div className="flex items-center gap-3 mb-10">
        <div className="p-2.5 rounded-lg bg-sky-500 shadow-sm" style={{ transform: 'rotate(-3deg)' }}>
          <Building2 size={22} className="text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-3xl font-zh text-slate-800">{t('nav.settings')}</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">
            Company Settings
          </p>
        </div>
      </div>

      <CompanyCard onToast={setToast} />
      <OnsiteScheduleSection onToast={setToast} />
      <WifiCheckinSection onToast={setToast} />
      <LeavePolicySection onToast={setToast} />
      <LocationsSection onToast={setToast} />
    </div>
  )
}
