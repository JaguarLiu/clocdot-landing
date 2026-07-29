import { useState } from 'react'
import { Upload, Download, FileSpreadsheet, Check, X, AlertTriangle, KeyRound } from 'lucide-react'
import { previewUserImport, commitUserImport } from '../services/api.js'
import PaperPiece from './PaperPiece.jsx'
import MarkerButton from './MarkerButton.jsx'

// stage: 'pick' | 'preview' | 'result'
export default function EmployeeImportModal({ open, onClose, onToast, onImported }) {
  const [stage, setStage] = useState('pick')
  const [rows, setRows] = useState([])
  const [preview, setPreview] = useState(null) // { valid, errors, summary }
  const [created, setCreated] = useState([])
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState('')

  function reset() {
    setStage('pick'); setRows([]); setPreview(null); setCreated([]); setBusy(false); setFileName('')
  }
  function handleClose() { if (!busy) { reset(); onClose() } }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // 允許重選同檔
    if (!file) return
    setBusy(true)
    try {
      const { parseEmployeeFile } = await import('../lib/employeeImport.js')
      const parsed = await parseEmployeeFile(file)
      if (parsed.length === 0) { onToast({ variant: 'error', message: '檔案沒有可匯入的資料列' }); return }
      setFileName(file.name)
      setRows(parsed)
      const result = await previewUserImport(parsed)
      setPreview(result)
      setStage('preview')
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || '解析或預覽失敗' })
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirm() {
    setBusy(true)
    try {
      const { created: result } = await commitUserImport(rows)
      setCreated(result)
      setStage('result')
      onImported?.()
      onToast({ variant: 'success', message: `已匯入 ${result.length} 名員工` })
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || '匯入失敗' })
    } finally {
      setBusy(false)
    }
  }

  async function handleDownloadTemplate() {
    try {
      const { downloadImportTemplate } = await import('../lib/employeeImport.js')
      downloadImportTemplate()
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || '下載範本失敗' })
    }
  }

  async function handleDownloadPasswords() {
    try {
      const { downloadPasswordCSV } = await import('../lib/employeeImport.js')
      downloadPasswordCSV(created)
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || '下載密碼清單失敗' })
    }
  }

  if (!open) return null

  const canConfirm = preview && preview.summary.errorCount === 0 && preview.summary.validCount > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <button type="button" aria-label="close" tabIndex={-1} onClick={handleClose}
        className="absolute inset-0 bg-[#1c1810]/20 backdrop-blur-[2px] cursor-default" />
      <PaperPiece color="#fdfbf4" rotate="-0.3deg" variant="card" className="relative w-full max-w-2xl p-7 max-h-[85vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4 mb-5">
          <div className="bg-emerald-500 p-2.5 rounded-lg shadow-sm shrink-0" style={{ transform: 'rotate(-4deg)' }}>
            <FileSpreadsheet size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="font-zh text-lg text-slate-800">批次匯入員工</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">Batch Import</p>
          </div>
        </div>

        {stage === 'pick' && (
          <div className="space-y-4">
            <p className="font-zh text-sm text-slate-500 leading-relaxed">
              支援 CSV 與 Excel (.xlsx)。欄位：email（必填）、name、empNo、role、hireDate、baseSalary、bankAccount。
              密碼由系統自動產生，匯入後可下載密碼清單。
            </p>
            <div className="flex flex-wrap gap-3">
              <MarkerButton color="#94a3b8" rotate="0.4deg" onClick={handleDownloadTemplate}>
                <Download size={14} strokeWidth={3} />下載範本
              </MarkerButton>
              <label className="cursor-pointer">
                <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} disabled={busy} />
                <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-zh text-white bg-emerald-500 shadow-sm"
                  style={{ borderRadius: '6px 2px 8px 3px/3px 8px 2px 6px', transform: 'rotate(-0.5deg)' }}>
                  <Upload size={14} strokeWidth={3} />{busy ? '解析中…' : '選擇檔案'}
                </span>
              </label>
            </div>
          </div>
        )}

        {stage === 'preview' && preview && (
          <div className="space-y-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{fileName}</p>
            <div className="flex gap-3">
              <div className="flex-1 bg-emerald-50 border border-emerald-200 p-3" style={{ borderRadius: '6px 2px 7px 3px/3px 7px 2px 6px' }}>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">可匯入</p>
                <p className="font-mono font-black text-2xl text-emerald-700 tabular-nums">{preview.summary.validCount}</p>
              </div>
              <div className="flex-1 bg-red-50 border border-red-200 p-3" style={{ borderRadius: '6px 2px 7px 3px/3px 7px 2px 6px' }}>
                <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">有誤</p>
                <p className="font-mono font-black text-2xl text-red-700 tabular-nums">{preview.summary.errorCount}</p>
              </div>
            </div>

            {preview.errors.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {preview.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-zh text-red-700 bg-red-50/60 px-3 py-1.5"
                    style={{ borderRadius: '4px 1px 5px 2px/2px 5px 1px 4px' }}>
                    <AlertTriangle size={13} className="shrink-0 mt-0.5" strokeWidth={2.5} />
                    <span>第 {e.row} 列・{e.field}：{e.message}</span>
                  </div>
                ))}
              </div>
            )}

            {preview.summary.errorCount > 0 && (
              <p className="font-zh text-xs text-amber-600">有錯誤的列需先修正檔案後重新上傳，才能匯入（全有或全無）。</p>
            )}

            <div className="flex items-center justify-end gap-3 pt-1">
              <MarkerButton color="#94a3b8" rotate="0.5deg" onClick={reset} disabled={busy}>
                <X size={14} strokeWidth={3} />重選檔案
              </MarkerButton>
              <MarkerButton as="button" type="button" color="#10b981" rotate="-0.5deg"
                onClick={handleConfirm} disabled={busy || !canConfirm}>
                <Check size={14} strokeWidth={3} />{busy ? '匯入中…' : `確認匯入 ${preview.summary.validCount} 筆`}
              </MarkerButton>
            </div>
          </div>
        )}

        {stage === 'result' && (
          <div className="space-y-4">
            <p className="font-zh text-sm text-slate-600">
              已成功建立 {created.length} 名員工。請下載密碼清單並安全地交付給員工，此後將無法再次查看初始密碼。
            </p>
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {created.map((u) => (
                <div key={u.id} className="flex items-center gap-3 text-xs bg-white border border-slate-200 px-3 py-2"
                  style={{ borderRadius: '4px 1px 5px 2px/2px 5px 1px 4px' }}>
                  <span className="font-zh text-slate-700 min-w-[80px]">{u.name || '—'}</span>
                  <span className="font-mono text-slate-500 flex-1 truncate">{u.email}</span>
                  <span className="font-mono font-black text-slate-700">{u.password}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <MarkerButton color="#0ea5e9" rotate="0.4deg" onClick={handleDownloadPasswords}>
                <KeyRound size={14} strokeWidth={3} />下載密碼清單 CSV
              </MarkerButton>
              <MarkerButton as="button" type="button" color="#10b981" rotate="-0.5deg" onClick={handleClose}>
                <Check size={14} strokeWidth={3} />完成
              </MarkerButton>
            </div>
          </div>
        )}
      </PaperPiece>
    </div>
  )
}
