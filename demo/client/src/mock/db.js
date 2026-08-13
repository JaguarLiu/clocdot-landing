import { tr } from '../i18n/index.jsx'
// Demo 假資料庫 — 全部存 localStorage，無任何後端。
// 種子資料以「今天」為基準動態生成，讓 demo 永遠看起來是當期的。
// 清除方式：主控台執行 window.__resetDemo() 或清掉此 key 後重整。

const KEY = 'clocdot.demo.db.v1'

const pad = (n) => String(n).padStart(2, '0')
const dateStrOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
// 以「本地無時區」ISO 字串存時間，確保畫面顯示的 HH:mm 與種子一致（不受瀏覽器時區影響）
const naive = (dateStr, hh = 0, mm = 0) => `${dateStr}T${pad(hh)}:${pad(mm)}:00`
export const localNaiveNow = () => {
  const d = new Date()
  return naive(dateStrOf(d), d.getHours(), d.getMinutes())
}
const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return dateStrOf(new Date(y, m - 1, d + n))
}
const minutesBetween = (aIso, bIso) => Math.round((new Date(aIso) - new Date(bIso)) / 60000)

const DEFAULT_SHIFT = { name: tr('seed.shiftName'), startTime: '09:00', endTime: '18:00' }
const DAYS = 8 * 60 // 一天工時分鐘（8h）
const days = (n) => n * DAYS

function buildSeed() {
  const now = new Date()
  const y = now.getFullYear()
  const mo = now.getMonth() // 0-based
  const todayD = now.getDate()
  const todayStr = dateStrOf(now)

  // 本月已過的工作日 → 種出勤紀錄（今天留空，讓 demo 可打卡）
  const attendance = []
  for (let d = 1; d < todayD; d++) {
    const dt = new Date(y, mo, d)
    const dow = dt.getDay()
    if (dow === 0 || dow === 6) continue
    const ds = dateStrOf(dt)
    const late = d % 7 === 3
    const early = d % 9 === 0
    const punchIn = naive(ds, 9, late ? 12 : 0)
    const punchOut = naive(ds, early ? 17 : 18, early ? 30 : 4)
    attendance.push({
      id: `att-${ds}`,
      dateStr: ds,
      workDate: naive(ds, 0, 0),
      punchIn,
      punchOut,
      isLate: late,
      isEarlyLeave: early,
      workDuration: minutesBetween(punchOut, punchIn) - 60,
      punchInLocationType: 'office',
      punchOutLocationType: 'office',
    })
  }

  const recentWorkday = (back) => {
    let ds = todayStr
    let count = 0
    while (count < back) {
      ds = addDays(ds, -1)
      const [yy, mm, dd] = ds.split('-').map(Number)
      const dow = new Date(yy, mm - 1, dd).getDay()
      if (dow !== 0 && dow !== 6) count += 1
    }
    return ds
  }

  const prevMonth = mo === 0 ? `${y - 1}-12` : `${y}-${pad(mo)}`
  const prev2Month = mo <= 1 ? `${y - 1}-${pad(mo + 11)}` : `${y}-${pad(mo - 1)}`

  const monthlyPayslip = (base, otAmount) => ({
    meta: { payType: 'monthly' },
    earnings: {
      baseSalary: base,
      allowances: [{ name: tr('seed.allowanceMeal'), amount: 2400 }],
      overtime: { tiers: otAmount ? [{ rate: '1.34', minutes: 120, amount: otAmount }] : [] },
      grossPay: base + 2400 + otAmount,
    },
    deductions: {
      laborInsurance: 1050, healthInsurance: 705, pensionVoluntary: 0,
      incomeTax: 0, attendanceDeduction: 0, leaveDeduction: 0, total: 1755,
    },
  })
  const makeSlip = (month, base, otAmount) => {
    const p = monthlyPayslip(base, otAmount)
    const grossPay = p.earnings.grossPay
    const totalDeductions = p.deductions.total
    return {
      month, lockedAt: naive(`${month}-05`, 18, 0),
      payslip: p, adjustments: [], adjustmentsTotal: 0,
      grossPay, totalDeductions, netPay: grossPay - totalDeductions,
    }
  }

  return {
    user: {
      id: 'demo-user', email: 'demo@clocdot.app', name: tr('seed.userName'), empNo: 1001,
      avatar: null, employmentType: 'operation', timezone: 'Asia/Taipei', companyId: 'demo-co',
    },
    company: { id: 'demo-co', timezone: 'Asia/Taipei', wifiCheckinEnabled: false },
    attendance,
    leaveRequests: [
      {
        id: 'lv-1', leaveType: 'annual',
        startDate: recentWorkday(3), endDate: recentWorkday(2),
        startTime: '09:00', endTime: '18:00', reason: tr('seed.reasonTrip'),
        status: 'approved', cancelRequested: false, reviewNote: null,
      },
      {
        id: 'lv-2', leaveType: 'personal',
        startDate: addDays(todayStr, 4), endDate: addDays(todayStr, 4),
        startTime: '14:00', endTime: '18:00', reason: tr('seed.reasonDocs'),
        status: 'pending', cancelRequested: false, reviewNote: null,
      },
      {
        id: 'lv-3', leaveType: 'sick',
        startDate: recentWorkday(8), endDate: recentWorkday(8),
        startTime: '09:00', endTime: '18:00', reason: tr('seed.reasonSick'),
        status: 'rejected', cancelRequested: false, reviewNote: tr('seed.reviewNoteSick'),
      },
    ],
    leaveBalances: [
      { leaveType: 'annual', quotaMinutes: days(15), usedMinutes: days(2), remainingMinutes: days(13) },
      { leaveType: 'personal', quotaMinutes: days(14), usedMinutes: days(1), remainingMinutes: days(13) },
      { leaveType: 'sick', quotaMinutes: days(30), usedMinutes: 0, remainingMinutes: days(30) },
    ],
    overtimePending: [
      { workDate: recentWorkday(1), dayType: 'workday', derivedMinutes: 120, tiers: [{ rate: '1.34', minutes: 120 }] },
      { workDate: recentWorkday(4), dayType: 'restday', derivedMinutes: 180, tiers: [{ rate: '1.34', minutes: 120 }, { rate: '1.67', minutes: 60 }] },
    ],
    overtimeRequests: [
      {
        id: 'ot-1', workDate: recentWorkday(6), requestedMinutes: 120, derivedMinutes: 120,
        dayType: 'workday', reason: tr('seed.reasonCrunch'), status: 'approved', tiers: [{ rate: '1.34', minutes: 120 }],
      },
    ],
    corrections: [
      { id: 'cr-1', reason: `[${tr('common.clockIn')}] 09:00 - ${tr('seed.reasonForgot')}`, status: 'pending', attendance: { workDate: naive(recentWorkday(1), 0, 0) } },
      { id: 'cr-2', reason: `[${tr('common.clockOut')}] 18:00 - ${tr('seed.reasonCrash')}`, status: 'approved', attendance: { workDate: naive(recentWorkday(5), 0, 0) } },
    ],
    approvals: [
      {
        stepId: 'ap-1', level: 1, requestType: 'leave', applicant: tr('seed.coworkerA'),
        leaveType: 'annual', startDate: addDays(todayStr, 2), endDate: addDays(todayStr, 3),
        startTime: '09:00', endTime: '18:00', reason: tr('seed.reasonHome'),
      },
      {
        stepId: 'ap-2', level: 1, requestType: 'overtime', applicant: tr('seed.coworkerB'),
        workDate: recentWorkday(1), requestedMinutes: 120, reason: tr('seed.reasonShipping'),
      },
    ],
    payrollMonths: [
      { month: prevMonth, netPay: makeSlip(prevMonth, 45000, 1206).netPay, lockedAt: naive(`${prevMonth}-05`, 18, 0) },
      { month: prev2Month, netPay: makeSlip(prev2Month, 45000, 0).netPay, lockedAt: naive(`${prev2Month}-05`, 18, 0) },
    ],
    payslips: {
      [prevMonth]: makeSlip(prevMonth, 45000, 1206),
      [prev2Month]: makeSlip(prev2Month, 45000, 0),
    },
  }
}

let cache = null

export function loadDb() {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { cache = JSON.parse(raw); return cache }
  } catch { /* fallthrough to seed */ }
  cache = buildSeed()
  saveDb()
  return cache
}

export function saveDb() {
  try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* private mode etc. */ }
}

export function resetDb() {
  cache = null
  try { localStorage.removeItem(KEY) } catch { /* noop */ }
}

export { DEFAULT_SHIFT, dateStrOf, addDays, naive, minutesBetween }

if (typeof window !== 'undefined') {
  window.__resetDemo = () => { resetDb(); location.reload() }
}
