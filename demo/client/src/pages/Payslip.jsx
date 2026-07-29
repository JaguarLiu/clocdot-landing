import { useState } from 'react'
import useSWR from 'swr'
import { Wallet } from 'lucide-react'
import PaperPiece from '../components/PaperPiece.jsx'
import { getMyPayslipMonths, getMyPayslip } from '../services/api.js'

const money = (n) => (n ?? 0).toLocaleString('en-US')

function monthLabel(m) {
  const [y, mo] = m.split('-')
  return `${y} 年 ${Number(mo)} 月`
}

const fmtMin = (m) => `${Math.floor((m ?? 0) / 60)} 時 ${(m ?? 0) % 60} 分`

function Row({ label, value, strong }) {
  return (
    <div className={`flex items-center justify-between py-1 ${strong ? 'font-black text-slate-700' : 'text-slate-500'}`}>
      <span className="font-zh text-sm">{label}</span>
      <span className="font-mono tabular-nums text-sm">{money(value)}</span>
    </div>
  )
}

export default function Payslip() {
  const { data: months, isLoading: monthsLoading } = useSWR('/payroll/me', getMyPayslipMonths)
  const [picked, setPicked] = useState(null)
  const month = picked ?? months?.[0]?.month ?? null
  const { data: slip, isLoading: slipLoading } = useSWR(
    month ? `/payroll/me/${month}` : null,
    () => getMyPayslip(month),
  )

  if (monthsLoading) {
    return (
      <main className="w-full max-w-md mx-auto px-4 mt-10 text-center text-slate-400 font-zh text-sm">
        載入中…
      </main>
    )
  }

  if (!months || months.length === 0) {
    return (
      <main className="w-full max-w-md mx-auto px-4 mt-6 animate-in slide-in-from-right-4 duration-300">
        <PaperPiece color="white" rotate="-1deg" className="p-8 text-center">
          <Wallet size={36} className="text-slate-300 mx-auto mb-3" />
          <p className="font-zh text-sm text-slate-500">尚無已發放的薪資單</p>
        </PaperPiece>
      </main>
    )
  }

  const p = slip?.payslip
  return (
    <main className="w-full max-w-md mx-auto px-4 mt-4 pb-10 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-black text-slate-700 flex items-center gap-2">
          <Wallet size={22} className="text-emerald-500" /> 薪資單
        </h2>
        <select
          value={month}
          onChange={(e) => setPicked(e.target.value)}
          aria-label="選擇月份"
          className="bg-white px-3 py-1.5 border border-slate-200 text-sm font-black text-slate-600 focus:outline-none"
        >
          {months.map((m) => (
            <option key={m.month} value={m.month}>{monthLabel(m.month)}</option>
          ))}
        </select>
      </div>

      {slipLoading || !p ? (
        <p className="text-center text-slate-400 font-zh text-sm mt-10">載入中…</p>
      ) : (
        <PaperPiece color="white" rotate="-0.6deg" className="p-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
            {monthLabel(slip.month)} PAYSLIP
          </p>

          <p className="font-zh text-xs text-emerald-600 font-black mb-1">應發</p>
          {p.meta?.payType === 'hourly' ? (
            <Row label={`時薪 $${p.earnings.hourlyRate} × ${fmtMin(p.earnings.regularMinutes)}`} value={p.earnings.regularPay} />
          ) : (
            <>
              <Row label="本薪" value={p.earnings.baseSalary} />
              {(p.earnings.allowances ?? []).map((a, i) => (
                <Row key={i} label={`加給 · ${a.name}`} value={a.amount} />
              ))}
            </>
          )}
          {(p.earnings.overtime?.tiers ?? []).map((t, i) => (
            <Row key={i} label={`加班 · ${t.rate}（${t.minutes}分）`} value={t.amount} />
          ))}
          <div className="border-t border-dashed border-slate-200 mt-1">
            <Row label="應發毛額" value={p.earnings.grossPay} strong />
          </div>

          <p className="font-zh text-xs text-red-500 font-black mb-1 mt-4">應扣</p>
          <Row label="勞保自付" value={-p.deductions.laborInsurance} />
          <Row label="健保自付" value={-p.deductions.healthInsurance} />
          <Row label="勞退自提" value={-p.deductions.pensionVoluntary} />
          <Row label="所得稅" value={-p.deductions.incomeTax} />
          {p.deductions.attendanceDeduction > 0 && (
            <Row label="遲到早退/缺勤" value={-p.deductions.attendanceDeduction} />
          )}
          {p.deductions.leaveDeduction > 0 && (
            <Row label="請假扣款" value={-p.deductions.leaveDeduction} />
          )}
          <div className="border-t border-dashed border-slate-200 mt-1">
            <Row label="應扣合計" value={-p.deductions.total} strong />
          </div>

          {(slip.adjustments ?? []).length > 0 && (
            <>
              <p className="font-zh text-xs text-sky-600 font-black mb-1 mt-4">調整</p>
              {slip.adjustments.map((a, i) => (
                <Row key={i} label={a.label} value={a.amount} />
              ))}
              <div className="border-t border-dashed border-slate-200 mt-1">
                <Row label="調整合計" value={slip.adjustmentsTotal} strong />
              </div>
            </>
          )}

          <div className="border-t-2 border-slate-200 mt-5 pt-3 flex items-center justify-between">
            <span className="font-zh text-sm font-black text-slate-700">實發淨額</span>
            <span className="font-mono tabular-nums text-2xl font-black text-emerald-600">
              {money(slip.netPay)}
            </span>
          </div>

          {slip.lockedAt && (
            <p className="text-[10px] text-slate-300 font-mono mt-4 text-right">
              發放 {new Date(slip.lockedAt).toLocaleDateString()}
            </p>
          )}
        </PaperPiece>
      )}
    </main>
  )
}
