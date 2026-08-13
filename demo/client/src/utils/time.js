import { tr } from '../i18n/index.jsx'
export function formatTime(date) {
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDate(date) {
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function getDayName(date) {
  const days = [tr('weekdays.long.0'), tr('weekdays.long.1'), tr('weekdays.long.2'), tr('weekdays.long.3'), tr('weekdays.long.4'), tr('weekdays.long.5'), tr('weekdays.long.6')]
  return days[date.getDay()]
}

export function calculateWorkDuration(punchIn, punchOut) {
  if (!punchIn || !punchOut) return 0
  const start = new Date(punchIn)
  const end = new Date(punchOut)
  return Math.round((end - start) / 1000 / 60)
}

/**
 * 計算請假時長並格式化
 * - 同一天：回傳 "X 小時"（若剛好是 8 小時以上，以「1 天」表示）
 * - 跨天：回傳 "N 天"（含頭尾）
 */
export function formatLeaveDuration(startDate, startTime, endDate, endTime) {
  if (!startDate || !endDate) return ''

  const startKey = typeof startDate === 'string' ? startDate.slice(0, 10) : ''
  const endKey = typeof endDate === 'string' ? endDate.slice(0, 10) : ''

  if (startKey === endKey) {
    const [sh, sm] = (startTime || '00:00').split(':').map(Number)
    const [eh, em] = (endTime || '00:00').split(':').map(Number)
    const minutes = (eh * 60 + em) - (sh * 60 + sm)
    if (minutes <= 0) return '—'
    const hours = minutes / 60
    if (hours >= 8) return tr('leave.oneDay')
    return tr('leave.nHours', { n: hours % 1 === 0 ? hours : hours.toFixed(1) })
  }

  const s = new Date(startKey)
  const e = new Date(endKey)
  const days = Math.round((e - s) / 86400000) + 1
  return tr('leave.nDays', { n: days })
}
