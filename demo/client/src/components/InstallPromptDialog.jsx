import { Download, Share, Plus, X } from 'lucide-react'
import PaperPiece from './PaperPiece.jsx'
import MarkerButton from './MarkerButton.jsx'
import { useInstallPrompt } from '../hooks/useInstallPrompt.js'

export default function InstallPromptDialog() {
  const { visible, platform, canInstall, install, dismiss } = useInstallPrompt()

  if (!visible) return null

  const isIOS = platform === 'ios'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0
                 bg-slate-900/30 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      <div className="w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300">
        <PaperPiece color="#ffffff" rotate="-1.2deg" className="px-6 py-6 relative">
          {/* 膠帶裝飾 */}
          <div
            aria-hidden="true"
            className="absolute -top-3 left-1/2 -translate-x-1/2 w-20 h-5 bg-emerald-200/70 rotate-[-3deg]"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}
          />

          {/* 關閉 */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="關閉安裝提示"
            className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center
                       text-slate-400 hover:text-slate-600 active:scale-95 transition"
          >
            <X size={18} strokeWidth={2.5} />
          </button>

          {/* 標題區 */}
          <div className="flex items-center gap-2 mt-1 mb-3">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <h3 className="font-black text-slate-500 text-[10px] uppercase tracking-[0.2em]">
              Install ClocDot
            </h3>
          </div>

          <h2 id="install-title" className="font-zh text-slate-700 text-xl font-bold mb-2 leading-snug">
            把 ClocDot 放到你的<br />主畫面吧！
          </h2>
          <p className="font-zh text-slate-500 text-sm leading-relaxed mb-5">
            像 App 一樣一鍵打開，離線也能用。打卡更快一點。
          </p>

          {isIOS ? (
            <div className="space-y-3 mb-5">
              <div className="bg-sky-50 p-3 border-l-4 border-sky-400 flex gap-3 items-start">
                <Share size={18} className="text-sky-500 shrink-0 mt-0.5" />
                <p className="font-zh text-[12px] font-bold text-sky-700 leading-relaxed">
                  1. 點下方 Safari 工具列的<br />
                  <span className="inline-flex items-center gap-1">
                    <Share size={13} className="inline" /> 分享按鈕
                  </span>
                </p>
              </div>
              <div className="bg-emerald-50 p-3 border-l-4 border-emerald-400 flex gap-3 items-start">
                <Plus size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                <p className="font-zh text-[12px] font-bold text-emerald-700 leading-relaxed">
                  2. 選「加入主畫面」<br />
                  <span className="text-emerald-600/80">Add to Home Screen</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 p-3 border-l-4 border-emerald-400 mb-5">
              <p className="font-zh text-[12px] font-bold text-emerald-700 leading-relaxed">
                點下方按鈕，依瀏覽器提示確認安裝即可。
              </p>
            </div>
          )}

          <div className="flex flex-col items-center gap-2">
            {canInstall ? (
              <MarkerButton
                color="#10b981"
                rotate="-1deg"
                fontSize={15}
                onClick={install}
              >
                <Download size={18} strokeWidth={2.5} />
                加入主畫面
              </MarkerButton>
            ) : null}

            <button
              type="button"
              onClick={dismiss}
              className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]
                         px-3 py-2 active:scale-95 transition"
            >
              {isIOS ? 'Got it' : 'Maybe Later'}
            </button>
          </div>
        </PaperPiece>
      </div>
    </div>
  )
}
