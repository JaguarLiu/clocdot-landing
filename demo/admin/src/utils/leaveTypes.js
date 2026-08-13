import { tr } from '../i18n/index.jsx'
// 與 server/src/utils/leaveTypes.js 對齊 (未來有共享 package 再合併)
//
// statutoryDays — 勞基法/性平法預設天數，第一次設定時自動帶入
// autofillOnFirstSetup — 首次設定是否自動帶入；婚/喪/公假因實際情況差異大，留給公司自填

export const LEAVE_TYPES = [
  { value: 'annual',       label: tr('leaveType.annual'),   en: 'Annual',      statutoryDays: 7,  autofillOnFirstSetup: true,  note: tr('leavePolicyNote.annual') },
  { value: 'personal',     label: tr('leaveType.personal'),   en: 'Personal',    statutoryDays: 14, autofillOnFirstSetup: true,  note: tr('leavePolicyNote.personal') },
  { value: 'sick',         label: tr('leaveType.sick'),   en: 'Sick',        statutoryDays: 30, autofillOnFirstSetup: true,  note: tr('leavePolicyNote.sick') },
  { value: 'menstrual',    label: tr('leaveType.menstrual'), en: 'Menstrual',   statutoryDays: 3,  autofillOnFirstSetup: true,  note: tr('leavePolicyNote.menstrual') },
  { value: 'marriage',     label: tr('leaveType.marriage'),   en: 'Marriage',    statutoryDays: 8,  autofillOnFirstSetup: false, note: tr('leavePolicyNote.marriage') },
  { value: 'bereavement',  label: tr('leaveType.bereavement'),   en: 'Bereavement', statutoryDays: 8,  autofillOnFirstSetup: false, note: tr('leavePolicyNote.bereavement') },
  { value: 'maternity',    label: tr('leaveType.maternity'),   en: 'Maternity',   statutoryDays: 56, autofillOnFirstSetup: true,  note: tr('leavePolicyNote.maternity') },
  { value: 'paternity',    label: tr('leaveType.paternity'), en: 'Paternity',   statutoryDays: 7,  autofillOnFirstSetup: true,  note: tr('leavePolicyNote.paternity') },
  { value: 'official',     label: tr('leaveType.official'),   en: 'Official',    statutoryDays: 0,  autofillOnFirstSetup: false, note: tr('leavePolicyNote.official') },
  { value: 'compensatory', label: tr('leaveType.compensatory'),   en: 'Comp',        statutoryDays: 0,  autofillOnFirstSetup: true,  note: tr('leavePolicyNote.compensatory') },
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
