import { LANGS, useT } from '../i18n/index.jsx'
import { resetDb } from '../mock/db.js'

// 語言切換。切換時會重播種 demo 假資料 —— 種子資料（姓名、請假事由等）是
// 存在 localStorage 的靜態字串，不重播種的話換語言後會殘留舊語言的內容。
// demo 沒有真實資料要保留，直接重來反而是想要的效果。
export default function LanguageToggle({ className = '' }) {
  const { lang, setLang } = useT()

  const switchTo = (code) => {
    if (code === lang) return
    setLang(code)
    resetDb()
    window.location.reload()
  }

  return (
    <div className={`inline-flex items-center gap-0.5 ${className}`}>
      {LANGS.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => switchTo(code)}
          aria-pressed={code === lang}
          className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded transition-colors ${
            code === lang
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
