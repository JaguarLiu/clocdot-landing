import { Check, X, Clock } from 'lucide-react'

// 圓形印章 — 雙環邊 + 微傾，蓋在卡片尾端
// client 版尺寸偏小，行動端不擠版
//
// status: 'approved' | 'rejected' | 'pending'
// size:   'sm' (預設, 48px) | 'xs' (40px)

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
    classes: 'text-red-500 border-red-500 outline-red-500 bg-red-50/70',
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
  sm: { box: 'w-[70px] h-[70px]', en: 'text-[7px]', zh: 'text-xs', icon: 11, offset: '-5px' },
  xs: { box: 'w-10 h-10', en: 'hidden', zh: 'text-[10px]', icon: 8, offset: '-3px' },
}

export default function StatusStamp({ status = 'pending', size = 'sm' }) {
  const style = STAMP_STYLES[status] || STAMP_STYLES.pending
  const dims = SIZE[size] || SIZE.sm
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
      {dims.en !== 'hidden' && (
        <span className={`uppercase tracking-[0.15em] leading-none mt-0.5 opacity-70 ${dims.en}`}>
          {style.en}
        </span>
      )}
    </span>
  )
}
