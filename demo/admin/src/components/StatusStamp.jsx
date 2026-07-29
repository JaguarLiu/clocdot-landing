import { Check, X, Clock } from 'lucide-react'

// 圓形印章 — 雙環邊 + 微傾，蓋在 row 尾端
// 與 DESIGN.md §7「狀態印章可升級為斜蓋」的方向一致
//
// status: 'approved' | 'rejected' | 'pending'
// size:   'md' (預設, 64px) | 'sm' (52px)

const STAMP_STYLES = {
  approved: {
    label: '已通過',
    en: 'APPROVED',
    classes: 'text-emerald-600 border-emerald-500 outline-emerald-500 bg-emerald-50/70',
    rotate: '-8deg',
    Icon: Check,
  },
  rejected: {
    label: '已駁回',
    en: 'REJECTED',
    classes: 'text-red-600 border-red-500 outline-red-500 bg-red-50/70',
    rotate: '6deg',
    Icon: X,
  },
  pending: {
    label: '審核中',
    en: 'PENDING',
    classes: 'text-amber-600 border-amber-500 outline-amber-500 bg-amber-50/70',
    rotate: '-5deg',
    Icon: Clock,
  },
}

const SIZE = {
  md: { box: 'w-[76px] h-[76px]', en: 'text-[7px]', zh: 'text-xs', icon: 11, offset: '-6px' },
  sm: { box: 'w-[52px] h-[52px]', en: 'text-[6px]', zh: 'text-[11px]', icon: 9, offset: '-4px' },
}

export default function StatusStamp({ status = 'pending', size = 'md' }) {
  const style = STAMP_STYLES[status] || STAMP_STYLES.pending
  const dims = SIZE[size] || SIZE.md
  const Icon = style.Icon

  return (
    <span
      className={`inline-flex flex-col items-center justify-center rounded-full border-2 outline outline-2 font-black select-none ${dims.box} ${style.classes}`}
      style={{
        transform: `rotate(${style.rotate})`,
        outlineOffset: dims.offset,
      }}
      aria-label={style.label}
    >
      <Icon size={dims.icon} strokeWidth={3} aria-hidden="true" />
      <span className={`font-zh leading-none mt-0.5 ${dims.zh}`}>{style.label}</span>
      <span className={`uppercase tracking-[0.18em] leading-none mt-0.5 opacity-70 ${dims.en}`}>
        {style.en}
      </span>
    </span>
  )
}
