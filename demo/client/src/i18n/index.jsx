// 極簡 i18n：無外部依賴，避免為了 demo 站動到 package-lock.json（CI 跑 npm ci）。
//
// 用法：
//   const { t, lang, setLang } = useT()
//   t('login.signIn')                  → '登入' / 'Sign in'
//   t('attendance.hoursToday', { h: 8 }) → 以 {{h}} 內插
//
// 找不到 key 時回退順序：目前語言 → zh-TW → key 本身（開發時一眼看得出漏翻）。
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import zhTW from './locales/zh-TW.js'
import en from './locales/en.js'

const RESOURCES = { 'zh-TW': zhTW, en }
export const LANGS = [
  { code: 'zh-TW', label: '中文' },
  { code: 'en', label: 'EN' },
]

const STORAGE_KEY = 'clocdot-demo-lang'
const FALLBACK = 'zh-TW'

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && RESOURCES[saved]) return saved
  } catch {
    // localStorage 可能被瀏覽器封鎖（無痕 / 第三方 cookie 設定），忽略即可
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language || '' : ''
  return nav.toLowerCase().startsWith('zh') ? 'zh-TW' : 'en'
}

// 'a.b.c' → 逐層取值；任何一層不存在就回 undefined
function lookup(dict, key) {
  return key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), dict)
}

function interpolate(str, vars) {
  if (!vars) return str
  return str.replace(/\{\{(\w+)\}\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : match,
  )
}

// 模組層的目前語言 —— 給非元件檔（services / mock / utils）用，它們不能用 hook。
// 由 Provider 保持同步；切語言會 reload，所以不需要通知機制。
let currentLang = detectLang()

/**
 * 非 React 版的翻譯函式。元件請用 useT()，這個只給純模組使用。
 */
export function tr(key, vars) {
  const hit = lookup(RESOURCES[currentLang], key) ?? lookup(RESOURCES[FALLBACK], key)
  return typeof hit === 'string' ? interpolate(hit, vars) : key
}

/**
 * 取整個陣列（月份、星期等）。模組層常數用得到 —— 切語言會 reload，
 * 所以在 import 時求值一次就夠。
 */
export function trArray(key) {
  const hit = lookup(RESOURCES[currentLang], key) ?? lookup(RESOURCES[FALLBACK], key)
  return Array.isArray(hit) ? hit : []
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(currentLang)

  useEffect(() => {
    currentLang = lang
    document.documentElement.lang = lang
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // 同上，寫不進去不影響當次使用
    }
  }, [lang])

  const setLang = useCallback((next) => {
    if (RESOURCES[next]) setLangState(next)
  }, [])

  const t = useCallback(
    (key, vars) => {
      const hit = lookup(RESOURCES[lang], key) ?? lookup(RESOURCES[FALLBACK], key)
      return typeof hit === 'string' ? interpolate(hit, vars) : key
    },
    [lang],
  )

  const value = useMemo(() => ({ t, lang, setLang }), [t, lang, setLang])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT 必須在 <I18nProvider> 之內使用')
  return ctx
}
