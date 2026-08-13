import { tr } from '../i18n/index.jsx'
import * as XLSX from 'xlsx'

// 匯入欄位（範本表頭與解析比對皆用這組正規鍵）
export const IMPORT_COLUMNS = ['email', 'name', 'empNo', 'role', 'hireDate', 'baseSalary', 'bankAccount']

const SAMPLE_ROW = ['wang@example.com', tr('seed.userA'), '1001', 'employee', '2026-01-01', '36000', '700-1234567']

// 解析 .csv / .xlsx → 正規欄位鍵的 row 陣列（值一律字串、已 trim）
export async function parseEmployeeFile(file) {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []
  const json = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false })
  return json.map((r) => {
    const out = {}
    for (const key of Object.keys(r)) {
      const norm = String(key).trim().toLowerCase()
      const match = IMPORT_COLUMNS.find((c) => c.toLowerCase() === norm)
      if (match) {
        const v = r[key]
        out[match] = typeof v === 'string' ? v.trim() : v
      }
    }
    return out
  })
}

// 下載 .xlsx 範本（表頭 + 一列範例）
export function downloadImportTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([IMPORT_COLUMNS, SAMPLE_ROW])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, tr('employees.importHeading'))
  XLSX.writeFile(wb, tr('employees.templateFile'))
}

function csvCell(v) {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// 下載建立結果的密碼清單 CSV（UTF-8 BOM，Excel 友善）
export function downloadPasswordCSV(created) {
  const header = ['email', 'name', 'empNo', 'password']
  const lines = [header.join(',')]
  for (const u of created) {
    lines.push([u.email, u.name ?? '', u.empNo ?? '', u.password].map(csvCell).join(','))
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = tr('employees.passwordListFile')
  a.click()
  URL.revokeObjectURL(url)
}
