// 與 server / admin 對齊的假別 enum

export const LEAVE_TYPES = [
  { value: 'annual',       en: 'Annual' },
  { value: 'personal',     en: 'Personal' },
  { value: 'sick',         en: 'Sick' },
  { value: 'menstrual',    en: 'Menstrual' },
  { value: 'marriage',     en: 'Marriage' },
  { value: 'bereavement',  en: 'Bereavement' },
  { value: 'maternity',    en: 'Maternity' },
  { value: 'paternity',    en: 'Paternity' },
  { value: 'official',     en: 'Official' },
  { value: 'compensatory', en: 'Comp' },
]

export const LEAVE_TYPE_MAP = Object.fromEntries(LEAVE_TYPES.map((t) => [t.value, t]))
