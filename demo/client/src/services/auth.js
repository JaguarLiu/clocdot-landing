// DEMO 版 auth.js — 無後端。預設「已登入」（直接進打卡頁）；
// 登出後回登入畫面，輸入任意 email/密碼即可再登入。
import { loadDb } from '../mock/db.js'

const AUTH_FLAG = 'clocdot.demo.auth' // 值為 'out' 表示已登出

export async function loginWithPassword(email, password) {
  if (!email || !password) {
    const err = new Error('請輸入 email 與密碼')
    err.status = 400
    throw err
  }
  localStorage.removeItem(AUTH_FLAG)
  localStorage.setItem('auth_token', 'demo-token')
  return loadDb().user
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
  // 未曾登出 → 自動視為登入（demo 便利性）
  if (localStorage.getItem(AUTH_FLAG) === 'out') return null
  return loadDb().user
}
