import { tr } from '../i18n/index.jsx'
// Demo 管理後台假資料庫 — 全部存 localStorage，無任何後端。
// 一家小公司：4 名員工、2 部門、3 班別，含出勤/請假/加班/補卡/薪資/結算。
// 清除：主控台 window.__resetDemo() 或清掉此 key 後重整。

const KEY = 'clocdot.demo.admin.db.v1'

const pad = (n) => String(n).padStart(2, '0')
const dateStrOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const naive = (dateStr, hh = 0, mm = 0) => `${dateStr}T${pad(hh)}:${pad(mm)}:00`
const addDays = (dateStr, n) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return dateStrOf(new Date(y, m - 1, d + n))
}
const D = 8 * 60 // 一日工時分鐘
const days = (n) => n * D

export const MODULES = [
  'dashboard', 'monthly-report', 'corrections', 'leaves',
  'overtime-reviews', 'employees', 'schedule', 'payroll', 'settings',
]

const LEAVE_TYPE_META = {
  annual: { label: tr('leaveType.annual'), defaultDays: 0 },
  personal: { label: tr('leaveType.personal'), defaultDays: 14 },
  sick: { label: tr('leaveType.sick'), defaultDays: 30 },
  menstrual: { label: tr('leaveType.menstrual'), defaultDays: 12 },
  marriage: { label: tr('leaveType.marriage'), defaultDays: 8 },
  bereavement: { label: tr('leaveType.bereavement'), defaultDays: 8 },
  maternity: { label: tr('leaveType.maternity'), defaultDays: 56 },
  paternity: { label: tr('leaveType.paternity'), defaultDays: 7 },
  official: { label: tr('leaveType.official'), defaultDays: 0 },
  compensatory: { label: tr('leaveType.compensatory'), defaultDays: 0 },
}

const monthlyPayslip = (base, otAmount) => {
  const earnings = {
    baseSalary: base,
    allowances: [{ name: tr('seed.allowanceMeal'), amount: 2400 }],
    overtime: { tiers: otAmount ? [{ rate: '1.34', minutes: 120, amount: otAmount }] : [] },
    grossPay: base + 2400 + otAmount,
  }
  const deductions = {
    laborInsurance: 1050, healthInsurance: 705, pensionVoluntary: 0,
    incomeTax: 0, attendanceDeduction: 0, leaveDeduction: 0, total: 1755,
  }
  return { meta: { payType: 'monthly' }, earnings, deductions }
}

function buildSeed() {
  const now = new Date()
  const y = now.getFullYear()
  const month = `${y}-${pad(now.getMonth() + 1)}`
  const prevMonth = now.getMonth() === 0 ? `${y - 1}-12` : `${y}-${pad(now.getMonth())}`
  const todayStr = dateStrOf(now)
  const recentWorkday = (back) => {
    let ds = todayStr; let c = 0
    while (c < back) { ds = addDays(ds, -1); const [yy, mm, dd] = ds.split('-').map(Number); const w = new Date(yy, mm - 1, dd).getDay(); if (w !== 0 && w !== 6) c += 1 }
    return ds
  }

  const shifts = [
    { id: 's1', name: tr('seed.shiftDay'), startTime: '09:00', endTime: '18:00', breakMinutes: 60, isDefault: true },
    { id: 's2', name: tr('seed.shiftMorning'), startTime: '08:00', endTime: '17:00', breakMinutes: 60, isDefault: false },
    { id: 's3', name: tr('seed.shiftNight'), startTime: '13:00', endTime: '22:00', breakMinutes: 60, isDefault: false },
  ]

  const mkUser = (o) => ({
    avatar: null, timezone: 'Asia/Taipei', lockedAt: null, failedLoginCount: 0,
    createdAt: naive('2024-01-15', 9, 0), hasPassword: true, roleId: null, roleName: null,
    isAdmin: false, defaultShiftId: 's1', defaultShiftName: tr('seed.shiftDay'), ...o,
  })
  const users = [
    mkUser({ id: 'u1', email: 'ming@demo.app', name: tr('seed.userA'), empNo: 1001, hireDate: naive('2023-03-01', 0, 0), departmentId: 'd2', departmentName: tr('seed.deptEngineering'), employmentType: 'operation' }),
    mkUser({ id: 'u2', email: 'hua@demo.app', name: tr('seed.userB'), empNo: 1002, hireDate: naive('2021-07-15', 0, 0), departmentId: 'd1', departmentName: tr('seed.deptSales'), employmentType: 'regular' }),
    mkUser({ id: 'u3', email: 'wen@demo.app', name: tr('seed.userC'), empNo: 1003, hireDate: naive('2020-02-10', 0, 0), departmentId: 'd2', departmentName: tr('seed.deptEngineering'), employmentType: 'regular' }),
    mkUser({ id: 'u4', email: 'ting@demo.app', name: tr('seed.userD'), empNo: 1004, hireDate: naive('2024-06-01', 0, 0), departmentId: 'd1', departmentName: tr('seed.deptSales'), employmentType: 'parttime', defaultShiftId: 's2', defaultShiftName: tr('seed.shiftMorning') }),
  ]

  const departments = [
    { id: 'd1', name: tr('seed.deptSales'), parentId: null, managerId: 'u2', managerName: tr('seed.userB'), memberCount: 2 },
    { id: 'd2', name: tr('seed.deptEngineering'), parentId: null, managerId: 'u3', managerName: tr('seed.userC'), memberCount: 2 },
  ]
  const deptRoles = {
    d1: [{ id: 11, name: tr('seed.roleSalesLead'), permissions: ['leaves', 'corrections'], departmentId: 'd1', memberCount: 1 }],
    d2: [{ id: 21, name: tr('seed.roleEngLead'), permissions: ['leaves', 'schedule'], departmentId: 'd2', memberCount: 1 }],
  }

  // 月出勤彙總（給報表）
  const userMini = (u) => ({ id: u.id, email: u.email, name: u.name, empNo: u.empNo })
  const attendanceMonthly = users.map((u, i) => ({
    user: userMini(u),
    totalWorkDuration: 9600 - i * 300, attendanceDays: 20 - i, lateDays: i === 0 ? 2 : 0,
    earlyLeaveDays: i === 1 ? 1 : 0, leaveDays: i, leaveByType: i ? { [tr('leaveType.annual')]: i } : {},
    officeDays: 15 - i, remoteDays: 5,
  }))
  const yearlyAttendance = users.map((u) => ({
    user: userMini(u),
    months: Array.from({ length: 12 }, (_, m) => ({
      attendanceDays: m <= now.getMonth() ? 20 : 0,
      totalWorkDuration: m <= now.getMonth() ? 9600 : 0,
      lateDays: 0, earlyLeaveDays: 0, leaveDays: 0,
    })),
    totals: { attendanceDays: (now.getMonth() + 1) * 20, totalWorkDuration: (now.getMonth() + 1) * 9600, lateDays: 2, earlyLeaveDays: 1, leaveDays: 3 },
  }))
  const settlement = users.map((u, i) => ({
    userId: u.id, name: u.name, empNo: u.empNo, avatar: null,
    compliance: { status: 'ok', reasons: [] },
    expectedWorkdays: 21, expectedMinutes: days(21), actualWorkdays: 20 - i, actualMinutes: 9600 - i * 300,
    lateCount: i === 0 ? 2 : 0, earlyLeaveCount: i === 1 ? 1 : 0, absenceDays: 0, leaveMinutes: days(i),
    overtimeByRate: i === 0 ? { '1.34': 120 } : {},
  }))

  const leaveRequests = [
    { id: 'lr1', user: userMini(users[0]), leaveType: 'annual', startDate: recentWorkday(3), endDate: recentWorkday(2), startTime: '09:00', endTime: '18:00', reason: tr('seed.reasonTrip'), status: 'pending', reviewNote: null, cancelRequested: false, cancelReason: null },
    { id: 'lr2', user: userMini(users[3]), leaveType: 'sick', startDate: addDays(todayStr, 1), endDate: addDays(todayStr, 1), startTime: '09:00', endTime: '18:00', reason: tr('seed.reasonDoctor'), status: 'pending', reviewNote: null, cancelRequested: false, cancelReason: null },
    { id: 'lr3', user: userMini(users[1]), leaveType: 'personal', startDate: recentWorkday(6), endDate: recentWorkday(6), startTime: '14:00', endTime: '18:00', reason: tr('seed.reasonErrand'), status: 'approved', reviewNote: null, cancelRequested: true, cancelReason: tr('seed.reasonCancelled') },
    { id: 'lr4', user: userMini(users[2]), leaveType: 'marriage', startDate: recentWorkday(10), endDate: recentWorkday(6), startTime: '09:00', endTime: '18:00', reason: tr('seed.reasonWedding'), status: 'approved', reviewNote: tr('common.congrats'), cancelRequested: false, cancelReason: null },
  ]
  const correctionRequests = [
    { id: 'cr1', reason: tr('seed.correctionForgotIn'), status: 'pending', attendance: { workDate: naive(recentWorkday(1), 0, 0), user: userMini(users[0]) } },
    { id: 'cr2', reason: tr('seed.correctionCrash'), status: 'pending', attendance: { workDate: naive(recentWorkday(2), 0, 0), user: userMini(users[3]) } },
    { id: 'cr3', reason: tr('seed.correctionForgotIn2'), status: 'approved', attendance: { workDate: naive(recentWorkday(5), 0, 0), user: userMini(users[1]) } },
  ]
  const overtimeRequests = [
    { id: 'or1', user: userMini(users[0]), workDate: recentWorkday(1), dayType: 'workday', requestedMinutes: 120, reason: tr('seed.reasonCrunch'), status: 'pending', tiers: [{ rate: '1.34', minutes: 120 }] },
    { id: 'or2', user: userMini(users[2]), workDate: recentWorkday(4), dayType: 'restday', requestedMinutes: 180, reason: tr('issue.maintenance'), status: 'approved', tiers: [{ rate: '1.34', minutes: 120 }, { rate: '1.67', minutes: 60 }] },
  ]

  const salaryProfiles = {
    u1: { userId: 'u1', payType: 'monthly', baseSalary: 45000, hourlyRate: null, allowances: [{ name: tr('seed.allowanceMeal'), amount: 2400, insured: false, taxable: false }], updatedAt: naive('2025-01-05', 10, 0) },
    u2: { userId: 'u2', payType: 'monthly', baseSalary: 52000, hourlyRate: null, allowances: [], updatedAt: naive('2025-01-05', 10, 0) },
    u3: { userId: 'u3', payType: 'monthly', baseSalary: 60000, hourlyRate: null, allowances: [], updatedAt: naive('2025-01-05', 10, 0) },
    u4: { userId: 'u4', payType: 'hourly', baseSalary: null, hourlyRate: 200, allowances: [], updatedAt: naive('2025-01-05', 10, 0) },
  }

  const runItem = (u, base, ot) => {
    const p = monthlyPayslip(base, ot)
    return {
      userId: u.id, empNo: u.empNo, name: u.name, payslip: p, adjustments: [], adjustmentsTotal: 0,
      grossPay: p.earnings.grossPay, totalDeductions: p.deductions.total,
      netPay: p.earnings.grossPay - p.deductions.total, updatedAt: naive(`${prevMonth}-05`, 18, 0),
    }
  }
  const payrollRuns = {
    [prevMonth]: {
      month: prevMonth, status: 'locked', lockedAt: naive(`${prevMonth}-05`, 18, 0),
      items: [runItem(users[0], 45000, 1206), runItem(users[1], 52000, 0), runItem(users[2], 60000, 0)],
    },
  }

  const company = {
    id: 'demo-co', name: tr('seed.companyName'), timezone: 'Asia/Taipei',
    breakMinutes: 60, standardDailyMinutes: 480, leavePolicyYearReset: 'anniversary',
    onsiteCycleWeeks: 1, onsiteWeekdaysByCycle: [[1, 3, 5]], onsiteMonthDays: [], scheduleAnchorDate: null,
    flexibleOvertime: false, approvalLevels: 1, workHourType: 'fixed', lateDeductMode: 'per_minute',
    wifiCheckinEnabled: false, allowedIps: [],
  }
  const companyLocations = [
    { id: 'loc1', companyId: 'demo-co', name: tr('seed.hqName'), address: tr('seed.hqAddressAlt'), lat: 25.0375, lng: 121.5637, radius: 100 },
  ]
  const leavePolicies = Object.entries(LEAVE_TYPE_META).map(([leaveType, m]) => ({
    leaveType, label: m.label,
    annualQuotaMinutes: ['personal', 'sick'].includes(leaveType) ? days(m.defaultDays) : null,
    deductRate: leaveType === 'personal' ? 1 : (leaveType === 'sick' ? 0.5 : null),
    defaultDays: m.defaultDays,
  }))
  const leaveBalancesByUser = Object.fromEntries(users.map((u) => [u.id, {
    balances: [
      { leaveType: 'annual', quotaMinutes: days(14), usedMinutes: days(2), remainingMinutes: days(12) },
      { leaveType: 'personal', quotaMinutes: days(14), usedMinutes: 0, remainingMinutes: days(14) },
      { leaveType: 'sick', quotaMinutes: days(30), usedMinutes: days(1), remainingMinutes: days(29) },
    ],
  }]))

  return {
    me: { id: 'u-admin', name: tr('seed.roleManager'), isAdmin: true, permissions: MODULES, adminRoleId: 1 },
    company, companyLocations, leavePolicies,
    users, departments, deptRoles, shifts,
    shiftAssignments: [
      { userId: 'u1', date: todayStr, shiftId: 's2' },
      { userId: 'u1', date: addDays(todayStr, 1), shiftId: 's3' },
      { userId: 'u4', date: todayStr, shiftId: 's2' },
    ],
    attendanceMonthly, yearlyAttendance, settlement,
    leaveRequests, correctionRequests, overtimeRequests,
    salaryProfiles, payrollRuns, leaveBalancesByUser,
    _month: month,
  }
}

let cache = null
export function loadDb() {
  if (cache) return cache
  try { const raw = localStorage.getItem(KEY); if (raw) { cache = JSON.parse(raw); return cache } } catch { /* seed */ }
  cache = buildSeed(); saveDb(); return cache
}
export function saveDb() { try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch { /* noop */ } }
export function resetDb() { cache = null; try { localStorage.removeItem(KEY) } catch { /* noop */ } }

export { dateStrOf, addDays, naive, monthlyPayslip, days }

if (typeof window !== 'undefined') {
  window.__resetDemo = () => { resetDb(); location.reload() }
}
