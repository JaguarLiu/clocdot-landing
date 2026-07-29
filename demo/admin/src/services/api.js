// DEMO 版 api.js（管理後台）— 無後端；request() 路由到 localStorage 假資料庫（見 mock/db.js）。
// 對外 named export 與正式版一致，頁面/元件無需改動。CSV 匯出改為在瀏覽器端就地產生 blob。

import { loadDb, saveDb, dateStrOf, naive, monthlyPayslip } from '../mock/db.js'

const LATENCY_MS = 120
const delay = () => new Promise((r) => setTimeout(r, LATENCY_MS))
const httpError = (status, error) => Object.assign(new Error(error || 'error'), { status, info: { error } })
const uid = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

const HOLIDAYS = [
  ['01-01', '元旦'], ['02-28', '和平紀念日'], ['04-04', '兒童節'], ['04-05', '清明節'],
  ['05-01', '勞動節'], ['09-29', '中秋節'], ['10-10', '國慶日'], ['10-25', '光復節'],
]
function holidaysInRange(from, to) {
  const year = Number(from.slice(0, 4))
  return HOLIDAYS.map(([md, name]) => ({ date: `${year}-${md}`, name })).filter((h) => h.date >= from && h.date <= to)
}

function buildSchedule(db, month, departmentId) {
  const users = db.users
    .filter((u) => ['operation', 'parttime'].includes(u.employmentType))
    .filter((u) => !departmentId || u.departmentId === departmentId)
    .map((u) => ({
      id: u.id, name: u.name, empNo: u.empNo, avatar: u.avatar, departmentId: u.departmentId,
      defaultShift: u.defaultShiftId ? { id: u.defaultShiftId, name: u.defaultShiftName, startTime: '09:00', endTime: '18:00' } : null,
    }))
  const ids = new Set(users.map((u) => u.id))
  const assignments = db.shiftAssignments
    .filter((a) => ids.has(a.userId) && a.date.startsWith(month))
    .map((a) => ({ userId: a.userId, date: a.date, shiftId: a.shiftId }))
  return { users, assignments }
}

function generateRun(db, month) {
  const items = db.users
    .filter((u) => u.employmentType !== 'parttime' && db.salaryProfiles[u.id]?.baseSalary)
    .map((u) => {
      const base = db.salaryProfiles[u.id].baseSalary
      const p = monthlyPayslip(base, 0)
      return {
        userId: u.id, empNo: u.empNo, name: u.name, payslip: p, adjustments: [], adjustmentsTotal: 0,
        grossPay: p.earnings.grossPay, totalDeductions: p.deductions.total,
        netPay: p.earnings.grossPay - p.deductions.total, updatedAt: naive(`${month}-05`, 12, 0),
      }
    })
  return { month, status: 'draft', lockedAt: null, items, skipped: [] }
}

function csvDownload(filename, rows) {
  const csv = '﻿' + rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// ── 路由核心 ────────────────────────────────────────────
async function route(method, path, query, body) {
  const db = loadDb()
  const seg = path.split('/') // ['', 'admin', ...]

  if (method === 'GET') {
    if (path === '/admin/me') return db.me
    if (path === '/admin/my-ip') return { ip: '203.0.113.10' }
    if (path === '/admin/attendance') return db.attendanceMonthly
    if (path === '/admin/attendance/yearly') return db.yearlyAttendance
    if (path === '/admin/settlement') return db.settlement
    if (path === '/admin/users') return db.users
    if (path === '/admin/departments') return db.departments
    if (path === '/admin/shifts') return db.shifts
    if (path === '/admin/company') return db.company
    if (path === '/admin/company-locations') return db.companyLocations
    if (path === '/admin/leave-policies') return db.leavePolicies
    if (path === '/admin/salary-profiles') {
      return db.users.map((u) => {
        const sp = db.salaryProfiles[u.id]
        return {
          userId: u.id, empNo: u.empNo, name: u.name, email: u.email, employmentType: u.employmentType,
          configured: Boolean(sp), baseSalary: sp?.baseSalary ?? null, hourlyRate: sp?.hourlyRate ?? null,
          updatedAt: sp?.updatedAt ?? null,
        }
      })
    }
    if (path === '/admin/correction-requests') {
      const s = query.get('status')
      return s ? db.correctionRequests.filter((r) => r.status === s) : db.correctionRequests
    }
    if (path === '/admin/leave-requests') {
      const s = query.get('status')
      return s ? db.leaveRequests.filter((r) => r.status === s) : db.leaveRequests
    }
    if (path === '/admin/overtime-requests') {
      const s = query.get('status')
      return s ? db.overtimeRequests.filter((r) => r.status === s) : db.overtimeRequests
    }
    if (path === '/admin/compliance/overtime') return []
    if (path === '/admin/leave-calendar') {
      const from = query.get('from'); const to = query.get('to')
      return db.leaveRequests
        .filter((r) => r.status === 'approved' && r.startDate <= to && r.endDate >= from)
        .map((r) => ({ name: r.user.name, startDate: r.startDate, endDate: r.endDate, leaveType: r.leaveType }))
    }
    if (path === '/holidays') return holidaysInRange(query.get('from'), query.get('to'))
    if (path === '/admin/schedule') return buildSchedule(db, query.get('month'), query.get('departmentId'))
    if (path === '/admin/payroll-runs') {
      return Object.values(db.payrollRuns).map((r) => ({ month: r.month, status: r.status, lockedAt: r.lockedAt }))
    }
    if (path.startsWith('/admin/payroll-runs/')) {
      const month = seg[3]
      const run = db.payrollRuns[month]
      if (!run) throw httpError(404, '尚未結算')
      return run
    }
    if (path.startsWith('/admin/departments/') && path.endsWith('/roles')) {
      return db.deptRoles[seg[3]] ?? []
    }
    if (path.startsWith('/admin/users/') && path.endsWith('/leave-balances')) {
      return db.leaveBalancesByUser[seg[3]] ?? { balances: [] }
    }
    if (path.startsWith('/admin/users/') && path.endsWith('/salary-profile')) {
      return db.salaryProfiles[seg[3]] ?? null
    }
  }

  if (method === 'POST') {
    if (path === '/admin/shifts') {
      if (body.isDefault) db.shifts.forEach((s) => { s.isDefault = false })
      const s = { id: uid('s'), name: body.name, startTime: body.startTime, endTime: body.endTime, breakMinutes: body.breakMinutes ?? 60, isDefault: !!body.isDefault }
      db.shifts.push(s); saveDb(); return s
    }
    if (path === '/admin/company-locations') {
      const loc = { id: uid('loc'), companyId: 'demo-co', name: body.name, address: body.address, lat: 25.03, lng: 121.56, radius: body.radius ?? 100 }
      db.companyLocations.push(loc); saveDb(); return loc
    }
    if (path === '/admin/users') {
      const u = {
        id: uid('u'), email: body.email, name: body.name ?? null, empNo: body.empNo ?? null,
        avatar: null, timezone: body.timezone || 'Asia/Taipei', lockedAt: null, failedLoginCount: 0,
        hireDate: body.hireDate ? naive(body.hireDate, 0, 0) : null, createdAt: naive(dateStrOf(new Date()), 9, 0),
        hasPassword: true, departmentId: body.departmentId ?? null,
        departmentName: db.departments.find((d) => d.id === body.departmentId)?.name ?? null,
        roleId: body.roleId ?? null, roleName: null, isAdmin: false,
        defaultShiftId: 's1', defaultShiftName: '日班', employmentType: body.employmentType || 'regular',
      }
      db.users.push(u); saveDb(); return u
    }
    if (path === '/admin/users/import/preview') {
      const rows = body.rows ?? []
      return { summary: { validCount: rows.length, errorCount: 0 }, errors: [], rows }
    }
    if (path === '/admin/users/import') {
      const rows = body.rows ?? []
      const created = rows.map((r, i) => ({ email: r.email ?? `import${i}@demo.app`, name: r.name ?? '匯入員工', password: 'Demo1234' }))
      return created
    }
    if (path.endsWith('/unlock') && path.startsWith('/admin/users/')) {
      const u = db.users.find((x) => x.id === seg[3]); if (u) { u.lockedAt = null; u.failedLoginCount = 0; saveDb() }
      return { ok: true }
    }
    if (path === '/admin/departments') {
      const d = { id: uid('d'), name: body.name, parentId: body.parentId ?? null, managerId: body.managerId ?? null, managerName: db.users.find((u) => u.id === body.managerId)?.name ?? null, memberCount: 0 }
      db.departments.push(d); db.deptRoles[d.id] = []; saveDb(); return d
    }
    if (path.startsWith('/admin/departments/') && path.endsWith('/roles')) {
      const deptId = seg[3]
      const role = { id: Date.now() % 100000, name: body.name, permissions: body.permissions ?? [], departmentId: deptId, memberCount: 0 }
      ;(db.deptRoles[deptId] ||= []).push(role); saveDb(); return role
    }
    if (path === '/admin/issues') { saveDb(); return { id: uid('issue') } }
    if (path === '/admin/payroll-runs') {
      const { month } = body
      const run = generateRun(db, month)
      db.payrollRuns[month] = run; saveDb(); return run
    }
    if (path.startsWith('/admin/payroll-runs/') && path.endsWith('/cashout')) {
      return db.payrollRuns[seg[3]] ?? null
    }
    if (path.startsWith('/admin/payroll-runs/') && path.endsWith('/lock')) {
      const run = db.payrollRuns[seg[3]]; if (run) { run.status = 'locked'; run.lockedAt = naive(dateStrOf(new Date()), 12, 0); saveDb() }
      return run
    }
    if (path.startsWith('/admin/payroll-runs/') && path.endsWith('/unlock')) {
      const run = db.payrollRuns[seg[3]]; if (run) { run.status = 'draft'; run.lockedAt = null; saveDb() }
      return run
    }
  }

  if (method === 'PATCH') {
    if (path.startsWith('/admin/shifts/')) {
      const s = db.shifts.find((x) => x.id === seg[3]); if (!s) throw httpError(404, '找不到班別')
      if (body.isDefault && !s.isDefault) db.shifts.forEach((x) => { x.isDefault = false })
      Object.assign(s, body); saveDb(); return s
    }
    if (path.startsWith('/admin/correction-requests/')) {
      const r = db.correctionRequests.find((x) => x.id === seg[3]); if (!r) throw httpError(404, '找不到')
      r.status = body.status; saveDb(); return r
    }
    if (path.startsWith('/admin/leave-requests/')) {
      const r = db.leaveRequests.find((x) => x.id === seg[3]); if (!r) throw httpError(404, '找不到')
      if (body.action === 'confirm-cancel') { r.status = 'cancelled'; r.cancelRequested = false }
      else if (body.action === 'reject-cancel') { r.cancelRequested = false }
      else { r.status = body.status; r.reviewNote = body.reviewNote ?? null }
      saveDb(); return r
    }
    if (path.startsWith('/admin/overtime-requests/')) {
      const r = db.overtimeRequests.find((x) => x.id === seg[3]); if (!r) throw httpError(404, '找不到')
      r.status = body.status; saveDb(); return r
    }
    if (path === '/admin/company') { Object.assign(db.company, body); saveDb(); return db.company }
    if (path.startsWith('/admin/company-locations/')) {
      const loc = db.companyLocations.find((x) => x.id === seg[3]); if (!loc) throw httpError(404, '找不到')
      Object.assign(loc, body); saveDb(); return loc
    }
    if (path.startsWith('/admin/users/')) {
      const u = db.users.find((x) => x.id === seg[3]); if (!u) throw httpError(404, '找不到')
      Object.assign(u, body)
      if (body.departmentId !== undefined) u.departmentName = db.departments.find((d) => d.id === body.departmentId)?.name ?? null
      if (body.hireDate) u.hireDate = naive(body.hireDate, 0, 0)
      saveDb(); return u
    }
    if (path.startsWith('/admin/departments/')) {
      const d = db.departments.find((x) => x.id === seg[3]); if (!d) throw httpError(404, '找不到')
      Object.assign(d, body)
      if (body.managerId !== undefined) d.managerName = db.users.find((u) => u.id === body.managerId)?.name ?? null
      saveDb(); return d
    }
    if (path.startsWith('/admin/roles/')) {
      const rid = Number(seg[3]); let found = null
      for (const list of Object.values(db.deptRoles)) { const r = list.find((x) => x.id === rid); if (r) { Object.assign(r, body); found = r } }
      saveDb(); return found ?? { id: rid, ...body }
    }
    if (path.startsWith('/admin/payroll-runs/') && seg.includes('items')) {
      const month = seg[3]; const userId = seg[5]
      const run = db.payrollRuns[month]; const item = run?.items.find((i) => i.userId === userId)
      if (!item) throw httpError(404, '找不到')
      item.adjustments = body.adjustments ?? []
      item.adjustmentsTotal = item.adjustments.reduce((s, a) => s + (a.amount ?? 0), 0)
      item.netPay = item.grossPay - item.totalDeductions + item.adjustmentsTotal
      saveDb(); return item
    }
  }

  if (method === 'PUT') {
    if (path === '/admin/leave-policies') {
      for (const p of body.policies ?? []) {
        const row = db.leavePolicies.find((x) => x.leaveType === p.leaveType)
        if (row) row.annualQuotaMinutes = p.annualQuotaMinutes
      }
      saveDb(); return db.leavePolicies
    }
    if (path.startsWith('/admin/users/') && path.endsWith('/password')) return { ok: true }
    if (path.startsWith('/admin/users/') && path.endsWith('/salary-profile')) {
      const userId = seg[3]
      const profile = { userId, ...body, updatedAt: naive(dateStrOf(new Date()), 12, 0) }
      db.salaryProfiles[userId] = profile; saveDb(); return profile
    }
    if (path === '/admin/schedule/assignments') {
      for (const c of body.changes ?? []) {
        db.shiftAssignments = db.shiftAssignments.filter((a) => !(a.userId === c.userId && a.date === c.date))
        if (c.shiftId) db.shiftAssignments.push({ userId: c.userId, date: c.date, shiftId: c.shiftId })
      }
      saveDb(); return { updated: (body.changes ?? []).length }
    }
  }

  if (method === 'DELETE') {
    if (path.startsWith('/admin/shifts/')) {
      const s = db.shifts.find((x) => x.id === seg[3])
      if (s?.isDefault) throw httpError(400, '預設班別不可刪除，請先將其他班別設為預設')
      db.shifts = db.shifts.filter((x) => x.id !== seg[3]); saveDb(); return { ok: true }
    }
    if (path.startsWith('/admin/company-locations/')) { db.companyLocations = db.companyLocations.filter((x) => x.id !== seg[3]); saveDb(); return { ok: true } }
    if (path.startsWith('/admin/users/')) { db.users = db.users.filter((x) => x.id !== seg[3]); saveDb(); return { ok: true } }
    if (path.startsWith('/admin/departments/')) { db.departments = db.departments.filter((x) => x.id !== seg[3]); saveDb(); return { ok: true } }
    if (path.startsWith('/admin/roles/')) {
      const rid = Number(seg[3])
      for (const k of Object.keys(db.deptRoles)) db.deptRoles[k] = db.deptRoles[k].filter((x) => x.id !== rid)
      saveDb(); return { ok: true }
    }
  }

  throw httpError(404, `demo mock 未實作: ${method} ${path}`)
}

async function request(endpoint, options = {}) {
  await delay()
  const method = (options.method || 'GET').toUpperCase()
  const [rawPath, rawQuery] = endpoint.split('?')
  const query = new URLSearchParams(rawQuery || '')
  const body = options.body ? JSON.parse(options.body) : {}
  return route(method, rawPath, query, body)
}

// ── named export（與正式 api.js 一致；CSV 匯出改為就地產生） ──
export const getAdminAttendanceList = (month) => request(`/admin/attendance?month=${month}`)
export const getAdminYearlyAttendance = (year) => request(`/admin/attendance/yearly?year=${year}`)
export const reviewCorrectionRequest = (id, status) => request(`/admin/correction-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
export const getCorrectionRequests = (status) => request(`/admin/correction-requests${status ? `?status=${status}` : ''}`)
export const getLeaveRequests = (status) => request(`/admin/leave-requests${status ? `?status=${status}` : ''}`)
export const reviewLeaveRequest = (id, status, reviewNote) => request(`/admin/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status, reviewNote }) })
export const decideLeaveCancellation = (id, action, reviewNote) => request(`/admin/leave-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ action, reviewNote }) })
export const getLeaveCalendar = (from, to) => request(`/admin/leave-calendar?from=${from}&to=${to}`)
export const getHolidays = (from, to) => request(`/holidays?from=${from}&to=${to}`)
export const updateCompany = (payload) => request('/admin/company', { method: 'PATCH', body: JSON.stringify(payload) })
export const getMyIp = () => request('/admin/my-ip')
export const updateLeavePolicies = (policies) => request('/admin/leave-policies', { method: 'PUT', body: JSON.stringify({ policies }) })
export const getUserLeaveBalances = (userId) => request(`/admin/users/${userId}/leave-balances`)
export const createCompanyLocation = (payload) => request('/admin/company-locations', { method: 'POST', body: JSON.stringify(payload) })
export const updateCompanyLocation = (id, payload) => request(`/admin/company-locations/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteCompanyLocation = (id) => request(`/admin/company-locations/${id}`, { method: 'DELETE' })
export const createUser = (payload) => request('/admin/users', { method: 'POST', body: JSON.stringify(payload) })
export const previewUserImport = (rows) => request('/admin/users/import/preview', { method: 'POST', body: JSON.stringify({ rows }) })
export const commitUserImport = (rows) => request('/admin/users/import', { method: 'POST', body: JSON.stringify({ rows }) })
export const updateUser = (id, payload) => request(`/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteUser = (id) => request(`/admin/users/${id}`, { method: 'DELETE' })
export const unlockUser = (id) => request(`/admin/users/${id}/unlock`, { method: 'POST' })
export const setUserPassword = (id, password) => request(`/admin/users/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) })
export const getSalaryProfile = (userId) => request(`/admin/users/${userId}/salary-profile`)
export const saveSalaryProfile = (userId, payload) => request(`/admin/users/${userId}/salary-profile`, { method: 'PUT', body: JSON.stringify(payload) })
export const getSalaryProfiles = () => request('/admin/salary-profiles')
export const getDepartments = () => request('/admin/departments')
export const createDepartment = (payload) => request('/admin/departments', { method: 'POST', body: JSON.stringify(payload) })
export const updateDepartment = (id, payload) => request(`/admin/departments/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteDepartment = (id) => request(`/admin/departments/${id}`, { method: 'DELETE' })
export const getDepartmentRoles = (deptId) => request(`/admin/departments/${deptId}/roles`)
export const createDepartmentRole = (deptId, payload) => request(`/admin/departments/${deptId}/roles`, { method: 'POST', body: JSON.stringify(payload) })
export const updateRole = (id, payload) => request(`/admin/roles/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteRole = (id) => request(`/admin/roles/${id}`, { method: 'DELETE' })
export const createIssue = (payload) => request('/admin/issues', { method: 'POST', body: JSON.stringify(payload) })
export const getOvertimeRequests = (status) => request(`/admin/overtime-requests${status ? `?status=${status}` : ''}`)
export const reviewOvertimeRequest = (id, status, confirm = false) => request(`/admin/overtime-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status, confirm }) })
export const getSettlement = (month) => request(`/admin/settlement?month=${month}`)
export const getPayrollRuns = () => request('/admin/payroll-runs')
export const getPayrollRun = (month) => request(`/admin/payroll-runs/${month}`)
export const generatePayrollRun = (month) => request('/admin/payroll-runs', { method: 'POST', body: JSON.stringify({ month }) })
export const savePayrollAdjustments = (month, userId, adjustments) => request(`/admin/payroll-runs/${month}/items/${userId}`, { method: 'PATCH', body: JSON.stringify({ adjustments }) })
export const cashoutPayroll = (month, userIds) => request(`/admin/payroll-runs/${month}/cashout`, { method: 'POST', body: JSON.stringify({ userIds }) })
export const lockPayrollRun = (month) => request(`/admin/payroll-runs/${month}/lock`, { method: 'POST' })
export const unlockPayrollRun = (month) => request(`/admin/payroll-runs/${month}/unlock`, { method: 'POST' })
export const getShifts = () => request('/admin/shifts')
export const createShift = (payload) => request('/admin/shifts', { method: 'POST', body: JSON.stringify(payload) })
export const updateShift = (id, payload) => request(`/admin/shifts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) })
export const deleteShift = (id) => request(`/admin/shifts/${id}`, { method: 'DELETE' })
export const getSchedule = (month, departmentId) => request(`/admin/schedule?month=${month}${departmentId ? `&departmentId=${departmentId}` : ''}`)
export const saveScheduleAssignments = (changes, { confirm = false } = {}) => request('/admin/schedule/assignments', { method: 'PUT', body: JSON.stringify({ changes, ...(confirm ? { confirm: true } : {}) }) })

export async function downloadAttendanceCSV(month) {
  const rows = [['員工', '出勤天', '總工時(分)', '遲到', '早退']]
  for (const r of loadDb().attendanceMonthly) rows.push([r.user.name, r.attendanceDays, r.totalWorkDuration, r.lateDays, r.earlyLeaveDays])
  csvDownload(`attendance-${month}.csv`, rows)
}
export async function downloadSettlementCSV(month) {
  const rows = [['員工', '應出勤日', '實出勤日', '遲到', '早退', '請假(分)']]
  for (const r of loadDb().settlement) rows.push([r.name, r.expectedWorkdays, r.actualWorkdays, r.lateCount, r.earlyLeaveCount, r.leaveMinutes])
  csvDownload(`settlement-${month}.csv`, rows)
}
export async function downloadPayrollCSV(month) {
  const run = loadDb().payrollRuns[month]
  const rows = [['員工', '應發', '應扣', '實發']]
  for (const i of run?.items ?? []) rows.push([i.name, i.grossPay, i.totalDeductions, i.netPay])
  csvDownload(`payroll-${month}.csv`, rows)
}

export const fetcher = (url) => request(url)
