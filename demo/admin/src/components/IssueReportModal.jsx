import { useState } from 'react'
import { X, MessageSquareWarning } from 'lucide-react'
import { createIssue } from '../services/api.js'
import PaperPiece from './PaperPiece.jsx'
import MarkerButton from './MarkerButton.jsx'

const EMPTY = { title: '', type: 'bug', description: '' }

// 由父層以 `key` 在每次開啟時 remount，確保開啟即為乾淨狀態
export default function IssueReportModal({ open, onClose }) {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.title.trim() || !form.description.trim()) {
      setError('請填寫標題與描述')
      return
    }

    setIsLoading(true)
    try {
      await createIssue({
        title: form.title.trim(),
        type: form.type,
        description: form.description.trim(),
      })
      setSuccess(true)
      setTimeout(() => onClose(), 1200)
    } catch (err) {
      setError(err.message || '送出失敗，請稍後再試')
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <PaperPiece color="white" rotate="-1deg" variant="scrap" className="w-full max-w-md p-10 relative">
        <button
          type="button"
          onClick={onClose}
          aria-label="關閉"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
        >
          <X size={18} strokeWidth={2.5} />
        </button>

        <div className="flex flex-col items-center mb-8">
          <div
            className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4 shadow-sm"
            style={{ transform: 'rotate(-3deg)' }}
          >
            <MessageSquareWarning size={22} className="text-slate-600" strokeWidth={2.5} />
          </div>
          <h2 className="font-zh text-xl text-slate-800">問題回報</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">
            Report an Issue
          </p>
        </div>

        {success ? (
          <div className="px-4 py-6 bg-emerald-50 border-2 border-emerald-200 font-zh text-sm text-emerald-700 text-center"
               style={{ borderRadius: '8px 2px 10px 3px/3px 10px 2px 8px' }}>
            已送出回報，謝謝！
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="px-4 py-3 bg-red-50 border-2 border-red-200 font-zh text-sm text-red-500 text-center"
                   style={{ borderRadius: '8px 2px 10px 3px/3px 10px 2px 8px' }}>
                {error}
              </div>
            )}

            <label className="block">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2 block">
                標題 Title
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                disabled={isLoading}
                placeholder="簡短描述問題"
                className="w-full px-3 py-3 bg-white border-2 border-slate-800 font-zh text-slate-800 focus:outline-none focus:-translate-y-0.5 focus:-translate-x-0.5 transition-transform disabled:opacity-60"
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2 block">
                種類 Type
              </span>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                disabled={isLoading}
                className="w-full px-3 py-3 bg-white border-2 border-slate-800 font-zh text-slate-800 focus:outline-none focus:-translate-y-0.5 focus:-translate-x-0.5 transition-transform disabled:opacity-60"
              >
                <option value="bug">Bug（錯誤）</option>
                <option value="feature">功能（建議）</option>
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mb-2 block">
                描述 Description
              </span>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                disabled={isLoading}
                rows={4}
                placeholder="發生了什麼？預期的行為是？"
                className="w-full px-3 py-3 bg-white border-2 border-slate-800 font-zh text-slate-800 focus:outline-none focus:-translate-y-0.5 focus:-translate-x-0.5 transition-transform disabled:opacity-60 resize-y"
              />
            </label>

            <div className="mt-2 flex justify-center">
              <MarkerButton
                as="button"
                type="submit"
                color="#64748b"
                rotate="-1deg"
                disabled={isLoading}
                fontSize={15}
                style={{ width: '100%' }}
              >
                {isLoading ? '送出中…' : '送出回報'}
              </MarkerButton>
            </div>
          </form>
        )}
      </PaperPiece>
    </div>
  )
}
