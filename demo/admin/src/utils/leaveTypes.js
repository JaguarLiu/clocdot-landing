// 與 server/src/utils/leaveTypes.js 對齊 (未來有共享 package 再合併)
//
// statutoryDays — 勞基法/性平法預設天數，第一次設定時自動帶入
// autofillOnFirstSetup — 首次設定是否自動帶入；婚/喪/公假因實際情況差異大，留給公司自填

export const LEAVE_TYPES = [
  { value: 'annual',       label: '特休',   en: 'Annual',      statutoryDays: 7,  autofillOnFirstSetup: true,  note: '滿半年3天 / 1年7天，未滿1年依到職比例' },
  { value: 'personal',     label: '事假',   en: 'Personal',    statutoryDays: 14, autofillOnFirstSetup: true,  note: '一年合計上限 14 日 (含家庭照顧假)' },
  { value: 'sick',         label: '病假',   en: 'Sick',        statutoryDays: 30, autofillOnFirstSetup: true,  note: '未住院一年上限 30 日' },
  { value: 'menstrual',    label: '生理假', en: 'Menstrual',   statutoryDays: 3,  autofillOnFirstSetup: true,  note: '全年 3 日不併入病假' },
  { value: 'marriage',     label: '婚假',   en: 'Marriage',    statutoryDays: 8,  autofillOnFirstSetup: false, note: '法定 8 日，依公司規定' },
  { value: 'bereavement',  label: '喪假',   en: 'Bereavement', statutoryDays: 8,  autofillOnFirstSetup: false, note: '依親疏 3-8 日，依公司規定' },
  { value: 'maternity',    label: '產假',   en: 'Maternity',   statutoryDays: 56, autofillOnFirstSetup: true,  note: '產前後合計 8 週 = 56 日' },
  { value: 'paternity',    label: '陪產假', en: 'Paternity',   statutoryDays: 7,  autofillOnFirstSetup: true,  note: '陪產檢及陪產假 7 日' },
  { value: 'official',     label: '公假',   en: 'Official',    statutoryDays: 0,  autofillOnFirstSetup: false, note: '依實際需要，公司自訂' },
  { value: 'compensatory', label: '補休',   en: 'Comp',        statutoryDays: 0,  autofillOnFirstSetup: true,  note: '由加班累積，不設年度額度' },
]

export const LEAVE_TYPE_MAP = Object.fromEntries(LEAVE_TYPES.map((t) => [t.value, t]))

// 各假別「扣薪比例」系統預設（與 server leaveTypes.js 對齊）。0=全薪不扣，1=扣全薪。
export const DEFAULT_LEAVE_DEDUCT_RATE = { personal: 1, sick: 0.5 }

export function minutesToDays(minutes) {
  if (minutes == null) return null
  return minutes / (8 * 60)
}

export function daysToMinutes(days) {
  return Math.round(Number(days) * 8 * 60)
}
