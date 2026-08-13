import { tr } from '../i18n/index.jsx'
// DEMO 版 auth.js（管理後台）— 無後端。預設「已登入」為管理員（isAdmin），直接進後台；
// 登出後回登入畫面，輸入任意 email/密碼即可再登入。
import { loadDb } from '../mock/db.js'

const AUTH_FLAG = 'clocdot.demo.admin.auth' // 值為 'out' 表示已登出

export async function loginWithPassword(email, password) {
  if (!email || !password) {
    const err = new Error(tr('auth.needBothLower')); err.status = 400; throw err
  }
  localStorage.removeItem(AUTH_FLAG)
  localStorage.setItem('auth_token', 'demo-token')
  return loadDb().me
}

export async function changePassword() {
  return { ok: true }
}

export function logout() {
  localStorage.setItem(AUTH_FLAG, 'out')
  localStorage.removeItem('auth_token')
}

export function getStoredToken() {
  return localStorage.getItem('auth_token') || 'demo-token'
}

export async function getCurrentUser() {
  if (localStorage.getItem(AUTH_FLAG) === 'out') return null
  return loadDb().me
}
