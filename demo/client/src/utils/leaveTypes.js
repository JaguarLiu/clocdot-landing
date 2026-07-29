// 與 server / admin 對齊的假別 enum

export const LEAVE_TYPES = [
  { value: 'annual',       label: '特休',   en: 'Annual' },
  { value: 'personal',     label: '事假',   en: 'Personal' },
  { value: 'sick',         label: '病假',   en: 'Sick' },
  { value: 'menstrual',    label: '生理假', en: 'Menstrual' },
  { value: 'marriage',     label: '婚假',   en: 'Marriage' },
  { value: 'bereavement',  label: '喪假',   en: 'Bereavement' },
  { value: 'maternity',    label: '產假',   en: 'Maternity' },
  { value: 'paternity',    label: '陪產假', en: 'Paternity' },
  { value: 'official',     label: '公假',   en: 'Official' },
  { value: 'compensatory', label: '補休',   en: 'Comp' },
]

export const LEAVE_TYPE_MAP = Object.fromEntries(LEAVE_TYPES.map((t) => [t.value, t]))
