import { useEffect, useMemo, useRef, useState } from 'react'
import useSWR from 'swr'
import {
  Network, Plus, Pencil, Trash2, Check, X, Inbox, UserRound, Crown, ShieldCheck,
} from 'lucide-react'
import {
  fetcher, createDepartment, updateDepartment, deleteDepartment, updateUser,
  createDepartmentRole, deleteRole,
} from '../services/api.js'
import { useAuth } from '../hooks/useAuth.js'
import PaperPiece from './PaperPiece.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import MarkerButton from './MarkerButton.jsx'
import { buildDepartmentTree } from '../lib/orgChart.js'

const EMPTY_DEPT_FORM = { name: '', parentId: '', managerId: '' }

// 可授權給角色的後台模組（與 server services/rbac.js GRANTABLE_MODULES 一致）
const GRANTABLE_MODULES = [
  { key: 'monthly-report', label: '報表' },
  { key: 'corrections', label: '補打卡審核' },
  { key: 'leaves', label: '請假審核' },
  { key: 'overtime-reviews', label: '加班審核' },
  { key: 'employees', label: '員工管理' },
  { key: 'payroll', label: '薪資結算' },
  { key: 'schedule', label: '排班' },
]

const MODULE_LABEL = Object.fromEntries(GRANTABLE_MODULES.map((m) => [m.key, m.label]))

// 部門角色管理 popup（admin 專屬）：定義角色名稱 + 勾選後台模組
function RolesModal({ department, onClose, onToast }) {
  const { data, mutate } = useSWR(`/admin/departments/${department.id}/roles`, fetcher)
  const roles = data ?? []
  const [name, setName] = useState('')
  const [perms, setPerms] = useState([])
  const [busy, setBusy] = useState(false)

  function togglePerm(k) {
    setPerms((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  }
  async function add() {
    if (!name.trim()) { onToast({ variant: 'error', message: '角色名稱不可為空' }); return }
    setBusy(true)
    try {
      await createDepartmentRole(department.id, { name: name.trim(), permissions: perms })
      setName(''); setPerms([]); mutate()
      onToast({ variant: 'success', message: '已新增角色' })
    } catch (err) { onToast({ variant: 'error', message: err?.message || '操作失敗' }) } finally { setBusy(false) }
  }
  async function remove(r) {
    try { await deleteRole(r.id); mutate(); onToast({ variant: 'success', message: '已刪除角色' }) }
    catch (err) { onToast({ variant: 'error', message: err?.message || '刪除失敗' }) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true">
      <button type="button" aria-label="close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-[#1c1810]/20 backdrop-blur-[2px] cursor-default" />
      <PaperPiece color="#fdfbf4" rotate="-0.3deg" variant="card" className="relative w-full max-w-lg p-7 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-start gap-4 mb-5">
          <div className="bg-violet-500 p-2.5 rounded-lg shadow-sm shrink-0" style={{ transform: 'rotate(-4deg)' }}>
            <ShieldCheck size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="font-zh text-lg text-slate-800">角色與後台權限</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] mt-1">{department.name}</p>
          </div>
        </div>

        <div className="space-y-2 mb-5">
          {roles.length === 0 ? (
            <p className="font-zh text-sm text-slate-400 text-center py-3">尚未建立角色</p>
          ) : roles.map((r) => (
            <div key={r.id} className="flex items-start gap-2 bg-white border border-slate-200 p-3" style={{ borderRadius: '6px 2px 7px 3px/3px 7px 2px 6px' }}>
              <div className="min-w-0 flex-1">
                <p className="font-zh text-sm text-slate-700">{r.name} <span className="text-[10px] text-slate-400">（{r.memberCount} 人）</span></p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {r.permissions.length === 0
                    ? <span className="text-[10px] text-slate-400 font-zh">無模組</span>
                    : r.permissions.map((k) => (
                      <span key={k} className="text-[10px] font-zh bg-violet-50 border border-violet-200 text-violet-700 px-1.5 py-0.5 rounded">{MODULE_LABEL[k] || k}</span>
                    ))}
                </div>
              </div>
              <button type="button" onClick={() => remove(r)} className="text-slate-300 hover:text-red-500 shrink-0" aria-label="刪除角色">
                <Trash2 size={14} strokeWidth={2.5} />
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 p-3 space-y-2" style={{ borderRadius: '6px 2px 7px 3px/3px 7px 2px 6px' }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="角色名稱（如 總監）"
            className="w-full px-2 py-1.5 bg-[#fdfbf4] border border-slate-200 outline-none focus:border-violet-400 font-zh text-sm" />
          <div className="flex flex-wrap gap-x-3 gap-y-1.5">
            {GRANTABLE_MODULES.map((m) => (
              <label key={m.key} className="inline-flex items-center gap-1 text-xs font-zh text-slate-600">
                <input type="checkbox" checked={perms.includes(m.key)} onChange={() => togglePerm(m.key)} />
                {m.label}
              </label>
            ))}
          </div>
          <MarkerButton as="button" type="button" color="#8b5cf6" rotate="-0.5deg" fontSize={12} onClick={add} disabled={busy}>
            <Plus size={13} strokeWidth={3} />{busy ? '新增中…' : '新增角色'}
          </MarkerButton>
        </div>

        <div className="flex items-center justify-end pt-4">
          <MarkerButton color="#94a3b8" rotate="0.5deg" onClick={onClose}>
            <X size={14} strokeWidth={3} />關閉
          </MarkerButton>
        </div>
      </PaperPiece>
    </div>
  )
}

function Avatar({ user, size = 30, ring = 'ring-white' }) {
  const dim = { width: size, height: size }
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user.name || ''}
        referrerPolicy="no-referrer"
        draggable={false}
        style={dim}
        className={`rounded-full object-cover ring-2 ${ring} bg-slate-100 shrink-0`}
      />
    )
  }
  const initial = (user?.name || user?.email || '?').trim().charAt(0).toUpperCase()
  return (
    <span
      style={dim}
      className={`rounded-full ring-2 ${ring} bg-slate-100 text-slate-500 flex items-center justify-center font-zh text-[11px] shrink-0`}
    >
      {initial || <UserRound size={size * 0.5} />}
    </span>
  )
}

// 員工紙片，貼在黃色便條紙裡（拖出 = 調動/移出；點擊 = 開編輯 popup）
function MemberCard({ user, isManager, rotate, canDrag, onEditUser }) {
  return (
    <div
      role="button"
      tabIndex={0}
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag) return
        e.dataTransfer.setData('text/plain', user.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onClick={() => onEditUser(user)}
      onKeyDown={(e) => { if (e.key === 'Enter') onEditUser(user) }}
      title={user.name || user.email}
      className="cursor-grab active:cursor-grabbing hover:-translate-y-px transition-transform"
    >
      <PaperPiece color="white" rotate={rotate} variant="card" className="flex items-center gap-2 px-2 py-1.5">
        <Avatar user={user} size={22} />
        <div className="min-w-0 flex-1">
          <p className="font-zh text-[11px] text-slate-700 truncate leading-tight flex items-center gap-1">
            {isManager && <Crown size={10} strokeWidth={2.5} className="text-amber-500 shrink-0" />}
            {user.name || '—'}
          </p>
          <p className="text-[9px] text-slate-400 font-mono truncate leading-tight">{user.email}</p>
          {user.roleName && (
            <span className="inline-block mt-0.5 text-[8px] font-zh bg-violet-50 border border-violet-200 text-violet-700 px-1 py-px rounded leading-none">{user.roleName}</span>
          )}
        </div>
      </PaperPiece>
    </div>
  )
}

function DeptCard({ node, managerId, members, isAdmin, onEditDept, onDeleteDept, onManageRoles, onAssign, onEditUser }) {
  const [over, setOver] = useState(false)
  const dragDepth = useRef(0) // enter/leave 計數，避免子元素造成 highlight 閃爍

  const reset = () => { dragDepth.current = 0; setOver(false) }

  // 安全網：任何拖曳結束（放開 / 取消）都強制清除 highlight。
  // 因為可拖曳的卡片本身在 drop zone 內，enter/leave 計數會失衡，光靠計數無法保證歸零。
  useEffect(() => {
    const clear = () => { dragDepth.current = 0; setOver(false) }
    window.addEventListener('dragend', clear)
    window.addEventListener('drop', clear)
    return () => {
      window.removeEventListener('dragend', clear)
      window.removeEventListener('drop', clear)
    }
  }, [])

  const sorted = managerId
    ? [...members].sort((a, b) => (a.id === managerId ? -1 : b.id === managerId ? 1 : 0))
    : members

  return (
    <div
      className="relative"
      onDragEnter={(e) => { e.preventDefault(); dragDepth.current += 1; setOver(true) }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
      onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (dragDepth.current === 0) setOver(false) }}
      onDrop={(e) => {
        e.preventDefault()
        reset()
        if (!isAdmin) return
        const userId = e.dataTransfer.getData('text/plain')
        if (userId) onAssign(userId, node.id)
      }}
    >
      <PaperPiece
        color="#fdf3b8"
        rotate={node.depth % 2 === 0 ? '-0.7deg' : '0.7deg'}
        variant="card"
        className={`group relative w-[230px] transition-transform ${over ? 'scale-[1.02]' : ''}`}
      >
        {/* 紙膠帶（白色半透明）*/}
        <div
          className="absolute -top-2 left-1/2 w-12 h-4 bg-white/60 border border-white/50 shadow-sm"
          style={{ transform: 'translateX(-50%) rotate(-2deg)' }}
        />

        {/* hover 部門操作 */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {isAdmin && (
            <MarkerButton color="#8b5cf6" rotate="0.5deg" fontSize={11} onClick={() => onManageRoles(node)} title="角色與權限" ariaLabel="角色與權限" contentStyle={{ padding: '7px' }}>
              <ShieldCheck size={12} strokeWidth={3} />
            </MarkerButton>
          )}
          {isAdmin && (
            <>
              <MarkerButton color="#10b981" rotate="-0.5deg" fontSize={11} onClick={() => onEditDept(node)} title="編輯部門" ariaLabel="編輯部門" contentStyle={{ padding: '7px' }}>
                <Pencil size={12} strokeWidth={3} />
              </MarkerButton>
              <MarkerButton color="#ef4444" rotate="0.5deg" fontSize={11} onClick={() => onDeleteDept(node)} title="刪除部門" ariaLabel="刪除部門" contentStyle={{ padding: '7px' }}>
                <Trash2 size={12} strokeWidth={3} />
              </MarkerButton>
            </>
          )}
        </div>

        <div className="px-3.5 pt-4 pb-3.5 text-left">
          {/* 部門名 + 人數 */}
          <div className="flex items-center justify-between gap-2 pr-12">
            <p className="font-zh text-sm text-slate-800 truncate leading-tight">{node.name}</p>
            <span
              className="shrink-0 text-[10px] font-mono font-black tabular-nums text-amber-800 bg-amber-200/60 border border-amber-300 px-1.5 py-0.5"
              style={{ borderRadius: '4px 1px 5px 2px/2px 5px 1px 4px' }}
            >
              {members.length} 人
            </span>
          </div>

          {/* 員工白卡 */}
          <div className="mt-2.5 pt-2.5 border-t border-dashed border-amber-400/40 space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar">
            {sorted.length === 0 ? (
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600/50 text-center py-3">
                拖曳員工至此
              </p>
            ) : (
              sorted.map((m, i) => (
                <MemberCard
                  key={m.id}
                  user={m}
                  isManager={m.id === managerId}
                  rotate={i % 2 === 0 ? '-0.5deg' : '0.5deg'}
                  canDrag={isAdmin}
                  onEditUser={onEditUser}
                />
              ))
            )}
          </div>
        </div>
      </PaperPiece>

      {/* 拖曳放置提示 */}
      {over && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none border-2 border-dashed border-emerald-500 bg-emerald-50/45 rounded-[14px]">
          <span className="font-zh text-xs text-emerald-700 bg-white/90 px-2 py-1 shadow-sm">編入「{node.name}」</span>
        </div>
      )}
    </div>
  )
}

function TreeNode({ node, membersByDept, isAdmin, onEditDept, onDeleteDept, onManageRoles, onAssign, onEditUser }) {
  return (
    <li className="org-tree__node">
      <DeptCard
        node={node}
        managerId={node.managerId ?? null}
        members={membersByDept.get(node.id) ?? []}
        isAdmin={isAdmin}
        onEditDept={onEditDept}
        onDeleteDept={onDeleteDept}
        onManageRoles={onManageRoles}
        onAssign={onAssign}
        onEditUser={onEditUser}
      />
      {node.children.length > 0 && (
        <ul className="org-tree__branch">
          {node.children.map((c) => (
            <TreeNode
              key={c.id}
              node={c}
              membersByDept={membersByDept}
              isAdmin={isAdmin}
              onEditDept={onEditDept}
              onDeleteDept={onDeleteDept}
              onManageRoles={onManageRoles}
              onAssign={onAssign}
              onEditUser={onEditUser}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// 為節點補上 depth，方便卡片決定旋轉/accent
function withDepth(nodes, depth = 0) {
  return nodes.map((n) => ({ ...n, depth, children: withDepth(n.children, depth + 1) }))
}

export default function OrgChart({ onToast, onAssign, onEditUser, actions, leftPanel }) {
  const { data: depts, mutate, isLoading } = useSWR('/admin/departments', fetcher)
  const { data: users, mutate: mutateUsers } = useSWR('/admin/users', fetcher)
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY_DEPT_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [rolesTarget, setRolesTarget] = useState(null)
  const { user } = useAuth()
  const isAdmin = Boolean(user?.isAdmin)

  const list = useMemo(() => depts ?? [], [depts])
  const employees = useMemo(() => users ?? [], [users])

  const membersByDept = useMemo(() => {
    const m = new Map()
    for (const u of employees) {
      if (!u.departmentId) continue
      if (!m.has(u.departmentId)) m.set(u.departmentId, [])
      m.get(u.departmentId).push(u)
    }
    return m
  }, [employees])

  const tree = useMemo(() => withDepth(buildDepartmentTree(list)), [list])

  function openNew() { setEditing('new'); setForm(EMPTY_DEPT_FORM) }
  function openEdit(d) {
    setEditing(d.id)
    setForm({ name: d.name, parentId: d.parentId ?? '', managerId: d.managerId ?? '' })
  }
  function cancel() { setEditing(null); setForm(EMPTY_DEPT_FORM) }

  async function save(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        parentId: form.parentId || null,
        managerId: form.managerId || null,
      }
      let deptId = editing
      if (editing === 'new') {
        const created = await createDepartment(payload)
        deptId = created?.id
        onToast({ variant: 'success', message: '已新增部門' })
      } else {
        await updateDepartment(editing, payload)
        onToast({ variant: 'success', message: '已更新部門' })
      }
      // 指定主管者自動編入該部門，卡片才會出現在便條紙內
      if (payload.managerId && deptId) {
        const mgr = employees.find((u) => u.id === payload.managerId)
        if (mgr && mgr.departmentId !== deptId) {
          // 若該主管原本是別的部門主管，順帶把舊部門主管清成未指定
          const fromDept = list.find((d) => d.id === mgr.departmentId)
          if (fromDept && fromDept.managerId === mgr.id) {
            await updateDepartment(fromDept.id, { managerId: null })
          }
          await updateUser(payload.managerId, { departmentId: deptId })
          mutateUsers()
        }
      }
      mutate()
      cancel()
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || '操作失敗' })
    } finally {
      setSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDepartment(deleteTarget.id)
      mutate()
      onToast({ variant: 'success', message: '已刪除部門' })
      setDeleteTarget(null)
    } catch (err) {
      onToast({ variant: 'error', message: err?.message || '刪除失敗' })
    } finally {
      setDeleting(false)
    }
  }

  // 編輯時避免把自己列為自己的上層
  const parentOptions = list.filter((d) => editing === 'new' || d.id !== editing)

  return (
    <section>
      <ConfirmDialog
        open={deleteTarget !== null}
        variant="danger"
        title="刪除部門"
        message={deleteTarget && `確定要刪除「${deleteTarget.name}」？若仍有子部門或成員將無法刪除。`}
        confirmLabel="刪除"
        cancelLabel="取消"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />

      {rolesTarget && (
        <RolesModal department={rolesTarget} onClose={() => setRolesTarget(null)} onToast={onToast} />
      )}

      <div className="flex items-center gap-3 mb-8 flex-wrap">
        {actions}
        {isAdmin && editing === null && (
          <MarkerButton className="ml-auto" color="#f59e0b" rotate="-0.6deg" onClick={openNew}>
            <Plus size={15} strokeWidth={3} />新增部門
          </MarkerButton>
        )}
      </div>

      {editing !== null && (
        <PaperPiece color="white" rotate="-0.2deg" variant="card" className="p-6 mb-8">
          <form onSubmit={save} className="space-y-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
              {editing === 'new' ? 'New Department' : 'Edit Department'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="block">
                <span className="font-zh text-xs text-slate-500 mb-1.5 block">部門名稱</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="業務部"
                  className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-emerald-400 outline-none font-zh text-sm text-slate-700"
                />
              </label>
              <label className="block">
                <span className="font-zh text-xs text-slate-500 mb-1.5 block">上層部門</span>
                <select
                  value={form.parentId}
                  onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-emerald-400 outline-none font-zh text-sm text-slate-700"
                >
                  <option value="">（無，頂層）</option>
                  {parentOptions.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="font-zh text-xs text-slate-500 mb-1.5 block">主管</span>
                <select
                  value={form.managerId}
                  onChange={(e) => setForm((f) => ({ ...f, managerId: e.target.value }))}
                  className="w-full px-3 py-2 bg-[#fdfbf4] border border-slate-200 focus:border-emerald-400 outline-none font-zh text-sm text-slate-700"
                >
                  <option value="">（未指定）</option>
                  {employees.map((u) => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <MarkerButton as="button" type="submit" color="#10b981" rotate="-0.5deg" disabled={submitting}>
                <Check size={14} strokeWidth={3} />{submitting ? '儲存中…' : '儲存'}
              </MarkerButton>
              <MarkerButton color="#94a3b8" rotate="0.5deg" onClick={cancel} disabled={submitting}>
                <X size={14} strokeWidth={3} />取消
              </MarkerButton>
            </div>
          </form>
        </PaperPiece>
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {leftPanel}

        <div className="flex-1 min-w-0 w-full">
          {isLoading ? (
            <p className="font-zh text-sm text-slate-400 py-10 text-center">載入中…</p>
          ) : list.length === 0 ? (
            <div className="text-center py-16 opacity-40 flex flex-col items-center gap-3">
              <Inbox size={40} className="text-slate-300" />
              <p className="font-zh text-sm text-slate-400">尚未設定任何部門</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar pt-3 pb-6">
              <ul className="org-tree min-w-max px-4">
                {tree.map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    membersByDept={membersByDept}
                    isAdmin={isAdmin}
                    onEditDept={openEdit}
                    onDeleteDept={setDeleteTarget}
                    onManageRoles={setRolesTarget}
                    onAssign={onAssign}
                    onEditUser={onEditUser}
                  />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
