// DEMO 版 api.js — 無後端；request() 改為路由到 localStorage 假資料庫（見 mock/db.js）。
// 對外 named export 與正式版完全一致，頁面/hook 無需改動。

import {
  loadDb, saveDb, DEFAULT_SHIFT, dateStrOf, addDays, naive, minutesBetween, localNaiveNow,
} from '../mock/db.js'

const LATENCY_MS = 140 // 模擬網路延遲，讓 loading 狀態看得到
const delay = () => new Promise((r) => setTimeout(r, LATENCY_MS))

function httpError(status, error) {
  const err = new Error(error || 'error')
  err.status = status
  err.info = { error }
  return err
}

const HOLIDAYS = [
  ['01-01', '元旦'], ['02-28', '和平紀念日'], ['04-04', '兒童節'],
  ['04-05', '清明節'], ['05-01', '勞動節'], ['09-29', '中秋節'],
  ['10-10', '國慶日'], ['10-25', '光復節'],
]

function buildSchedule(from, to) {
  const out = []
  const today = dateStrOf(new Date())
  let ds = from
  let guard = 0
  while (ds <= to && guard < 90) {
    const [y, m, d] = ds.split('-').map(Number)
    const dow = new Date(y, m - 1, d).getDay()
    const weekend = dow === 0 || dow === 6
    out.push({ date: ds, shift: weekend ? null : DEFAULT_SHIFT, source: ds === today ? 'assignment' : 'default' })
    ds = addDays(ds, 1)
    guard += 1
  }
  return out
}

function holidaysInRange(from, to) {
  const year = Number(from.slice(0, 4))
  return HOLIDAYS
    .map(([md, name]) => ({ date: `${year}-${md}`, name }))
    .filter((h) => h.date >= from && h.date <= to)
}

function overtimeCompliance(db) {
  const month = dateStrOf(new Date()).slice(0, 7)
  const monthlyMinutes = db.overtimeRequests
    .filter((o) => o.status === 'approved' && String(o.workDate).slice(0, 7) === month)
    .reduce((s, o) => s + (o.requestedMinutes ?? 0), 0)
  const monthlyCap = 46 * 60
  return {
    status: 'ok', monthlyMinutes, monthlyCap, monthlyProjected: monthlyMinutes,
    quarterMinutes: null, quarterCap: null, reasons: [],
  }
}

// ── 路由核心 ──────────────────────────────────────────────
async function route(method, path, query, body) {
  const db = loadDb()

  if (method === 'GET') {
    if (path === '/attendance/today') {
      const today = dateStrOf(new Date())
      return db.attendance.find((a) => a.dateStr === today) ?? null
    }
    if (path === '/attendance/today-required') {
      return { onsiteRequired: false, wifiCheckinEnabled: false, locations: [] }
    }
    if (path === '/attendance') {
      const month = query.get('month')
      const rows = month ? db.attendance.filter((a) => a.dateStr.startsWith(month)) : db.attendance
      return [...rows].sort((a, b) => (a.dateStr < b.dateStr ? 1 : -1))
    }
    if (path === '/attendance/schedule') {
      return buildSchedule(query.get('from'), query.get('to'))
    }
    if (path === '/leave-requests') return db.leaveRequests
    if (path === '/leave-balances') return { balances: db.leaveBalances }
    if (path === '/leave-calendar') {
      const from = query.get('from'); const to = query.get('to')
      const mine = db.leaveRequests
        .filter((r) => r.status === 'approved' && r.startDate <= to && r.endDate >= from)
        .map((r) => ({ name: db.user.name, startDate: r.startDate, endDate: r.endDate }))
      const mate = { name: '李美華', startDate: addDays(dateStrOf(new Date()), 2), endDate: addDays(dateStrOf(new Date()), 3) }
      const mates = (mate.startDate <= to && mate.endDate >= from) ? [mate] : []
      return [...mine, ...mates]
    }
    if (path === '/holidays') return holidaysInRange(query.get('from'), query.get('to'))
    if (path === '/overtime/pending') return db.overtimePending
    if (path === '/overtime-requests') return db.overtimeRequests
    if (path === '/overtime/compliance') return overtimeCompliance(db)
    if (path === '/correction-requests') return db.corrections
    if (path === '/approvals/pending') return db.approvals
    if (path === '/payroll/me') return db.payrollMonths
    if (path.startsWith('/payroll/me/')) {
      const month = path.split('/')[3]
      const slip = db.payslips[month]
      if (!slip) throw httpError(404, '查無已發放薪資單')
      return slip
    }
  }

  if (method === 'POST') {
    if (path === '/punch-in') {
      const today = dateStrOf(new Date())
      let rec = db.attendance.find((a) => a.dateStr === today)
      if (rec?.punchIn) throw httpError(400, '今日已打過上班卡')
      const punchIn = body.clientTime || localNaiveNow()
      if (!rec) {
        rec = {
          id: `att-${today}`, dateStr: today, workDate: naive(today, 0, 0),
          punchIn: null, punchOut: null, isLate: false, isEarlyLeave: false,
          workDuration: null, punchInLocationType: 'remote', punchOutLocationType: null,
        }
        db.attendance.push(rec)
      }
      rec.punchIn = punchIn
      rec.isLate = punchIn.slice(11, 16) > DEFAULT_SHIFT.startTime
      rec.punchInLocationType = 'remote'
      saveDb()
      return rec
    }
    if (path === '/punch-out') {
      const today = dateStrOf(new Date())
      const rec = db.attendance.find((a) => a.dateStr === today)
      if (!rec?.punchIn) throw httpError(400, '尚未打上班卡')
      const punchOut = body.clientTime || localNaiveNow()
      rec.punchOut = punchOut
      rec.isEarlyLeave = punchOut.slice(11, 16) < DEFAULT_SHIFT.endTime
      rec.workDuration = Math.max(0, minutesBetween(punchOut, rec.punchIn) - 60)
      rec.punchOutLocationType = 'remote'
      saveDb()
      return rec
    }
    if (path === '/correction-requests') {
      const { workDate, time, type, reason } = body
      const item = {
        id: `cr-${Date.now()}`,
        reason: `[${type === 'in' ? '上班' : '下班'}] ${time} - ${reason}`,
        status: 'pending', attendance: { workDate: naive(workDate, 0, 0) },
      }
      db.corrections.unshift(item)
      saveDb()
      return item
    }
    if (path === '/leave-requests') {
      const item = {
        id: `lv-${Date.now()}`,
        leaveType: body.leaveType, startDate: body.startDate, endDate: body.endDate,
        startTime: body.startTime, endTime: body.endTime, reason: body.reason || null,
        status: 'pending', cancelRequested: false, reviewNote: null,
      }
      db.leaveRequests.unshift(item)
      saveDb()
      return { ...item, overlaps: [] }
    }
    if (path.startsWith('/leave-requests/') && path.endsWith('/cancel-request')) {
      const id = path.split('/')[2]
      const r = db.leaveRequests.find((x) => x.id === id)
      if (!r) throw httpError(404, '找不到該申請')
      r.cancelRequested = true
      saveDb()
      return r
    }
    if (path === '/overtime-requests') {
      const { workDate, requestedMinutes, reason } = body
      const pend = db.overtimePending.find((p) => p.workDate === workDate)
      db.overtimePending = db.overtimePending.filter((p) => p.workDate !== workDate)
      const item = {
        id: `ot-${Date.now()}`, workDate, requestedMinutes,
        derivedMinutes: pend?.derivedMinutes ?? requestedMinutes,
        dayType: pend?.dayType ?? 'workday', reason: reason || null,
        status: 'pending', tiers: pend?.tiers ?? [{ rate: '1.34', minutes: requestedMinutes }],
      }
      db.overtimeRequests.unshift(item)
      saveDb()
      return item
    }
    if (path.startsWith('/approvals/') && path.endsWith('/decide')) {
      const stepId = path.split('/')[2]
      db.approvals = db.approvals.filter((a) => a.stepId !== stepId)
      saveDb()
      return { ok: true, status: body.decision === 'reject' ? 'rejected' : 'approved' }
    }
  }

  if (method === 'DELETE') {
    if (path.startsWith('/leave-requests/')) {
      const id = path.split('/')[2]
      const r = db.leaveRequests.find((x) => x.id === id)
      if (!r) throw httpError(404, '找不到該申請')
      if (r.status !== 'pending') throw httpError(400, '已審核的申請無法撤回')
      db.leaveRequests = db.leaveRequests.filter((x) => x.id !== id)
      saveDb()
      return { success: true }
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

// ── 以下 named export 與正式 api.js 一致（皆透過 request） ──
export function punchIn({ lat, lng, clientTime } = {}) {
  return request('/punch-in', { method: 'POST', body: JSON.stringify({ lat, lng, clientTime }) })
}
export function punchOut({ lat, lng, clientTime } = {}) {
  return request('/punch-out', { method: 'POST', body: JSON.stringify({ lat, lng, clientTime }) })
}
export function getAttendanceRecords(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/attendance?${query}`)
}
export function submitCorrectionRequest({ workDate, time, type, reason }) {
  return request('/correction-requests', { method: 'POST', body: JSON.stringify({ workDate, time, type, reason }) })
}
export function submitLeaveRequest({ leaveType, startDate, startTime, endDate, endTime, reason }) {
  return request('/leave-requests', { method: 'POST', body: JSON.stringify({ leaveType, startDate, startTime, endDate, endTime, reason }) })
}
export function getLeaveRequests() {
  return request('/leave-requests')
}
export function cancelLeaveRequest(id) {
  return request(`/leave-requests/${id}`, { method: 'DELETE' })
}
export function requestLeaveCancellation(id, cancelReason) {
  return request(`/leave-requests/${id}/cancel-request`, { method: 'POST', body: JSON.stringify({ cancelReason }) })
}
export function getLeaveCalendar(from, to) {
  return request(`/leave-calendar?from=${from}&to=${to}`)
}
export function getHolidays(from, to) {
  return request(`/holidays?from=${from}&to=${to}`)
}
export function getOvertimePending() {
  return request('/overtime/pending')
}
export function submitOvertimeRequest({ workDate, requestedMinutes, reason }) {
  return request('/overtime-requests', { method: 'POST', body: JSON.stringify({ workDate, requestedMinutes, reason }) })
}
export function getOvertimeRequests() {
  return request('/overtime-requests')
}
export function getMyOvertimeCompliance() {
  return request('/overtime/compliance')
}
export function getMyPayslipMonths() {
  return request('/payroll/me')
}
export function getMyPayslip(month) {
  return request(`/payroll/me/${month}`)
}
export function getPendingApprovals() {
  return request('/approvals/pending')
}
export function decideApproval(stepId, { decision, note, confirm } = {}) {
  return request(`/approvals/${stepId}/decide`, { method: 'POST', body: JSON.stringify({ decision, note, confirm }) })
}
export function getMySchedule(from, to) {
  return request(`/attendance/schedule?from=${from}&to=${to}`)
}
export const fetcher = (url) => request(url)
