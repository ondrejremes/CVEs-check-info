import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Vendor } from '../api/client'
import { Plus, Trash2, Pencil, Check, X, Search, Loader2 } from 'lucide-react'

type VForm = { name: string; slug: string; advisory_url: string; rss_url: string; notes: string }
const empty: VForm = { name: '', slug: '', advisory_url: '', rss_url: '', notes: '' }
const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function Vendors() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<VForm>(empty)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<VForm>(empty)
  const [looking, setLooking] = useState(false)

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors/').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (d: VForm) => api.post('/vendors/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); setShowCreate(false); setForm(empty) },
  })
  const update = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<VForm> }) => api.put(`/vendors/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); setEditId(null) },
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/vendors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })

  const lookup = async (name: string, apply: (patch: Partial<VForm>) => void) => {
    if (!name.trim()) return
    setLooking(true)
    try {
      const r = await api.get(`/vendors/lookup?name=${encodeURIComponent(name)}`)
      if (r.data.found) {
        apply({
          name: r.data.name ?? name,
          slug: r.data.slug ?? toSlug(name),
          advisory_url: r.data.advisory_url ?? '',
          rss_url: r.data.rss_url ?? '',
        })
      }
    } finally {
      setLooking(false)
    }
  }

  const startEdit = (v: Vendor) => {
    setEditId(v.id)
    setEditForm({ name: v.name, slug: v.slug, advisory_url: v.advisory_url ?? '', rss_url: v.rss_url ?? '', notes: v.notes ?? '' })
  }

  const LookupBtn = ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} disabled={looking} title="Doplnit z databáze"
      className="flex items-center gap-1 border rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap">
      {looking ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
      Doplnit
    </button>
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Výrobci</h2>
        <button onClick={() => { setShowCreate(!showCreate); setForm(empty) }}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
          <Plus size={16} /> Přidat výrobce
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Nový výrobce</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Název firmy *"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value, slug: toSlug(e.target.value) })} />
              <LookupBtn onClick={() => lookup(form.name, patch => setForm(f => ({ ...f, ...patch })))} />
            </div>
            <input className="input" placeholder="Slug (vyplní se automaticky)"
              value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
            <input className="input" placeholder="Advisory / web URL"
              value={form.advisory_url} onChange={e => setForm({ ...form, advisory_url: e.target.value })} />
            <input className="input" placeholder="RSS feed URL"
              value={form.rss_url} onChange={e => setForm({ ...form, rss_url: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => create.mutate(form)}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">Uložit</button>
            <button onClick={() => setShowCreate(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Zrušit</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Název</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Advisory URL</th>
              <th className="px-4 py-3 text-left">RSS URL</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {vendors.map(v => editId === v.id ? (
              <tr key={v.id} className="bg-blue-50">
                <td className="px-2 py-2">
                  <div className="flex gap-1">
                    <input className="input text-xs flex-1" value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                    <button onClick={() => lookup(editForm.name, patch => setEditForm(f => ({ ...f, ...patch })))}
                      disabled={looking} title="Doplnit z databáze"
                      className="border rounded px-2 text-gray-400 hover:bg-white disabled:opacity-40">
                      {looking ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                    </button>
                  </div>
                </td>
                <td className="px-2 py-2 text-gray-400 font-mono text-xs">{v.slug}</td>
                <td className="px-2 py-2">
                  <input className="input text-xs w-full" placeholder="Advisory URL"
                    value={editForm.advisory_url} onChange={e => setEditForm({ ...editForm, advisory_url: e.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <input className="input text-xs w-full" placeholder="RSS URL"
                    value={editForm.rss_url} onChange={e => setEditForm({ ...editForm, rss_url: e.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => update.mutate({ id: v.id, d: editForm })}
                      className="text-green-600 hover:text-green-800"><Check size={16} /></button>
                    <button onClick={() => setEditId(null)}
                      className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{v.name}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{v.slug}</td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {v.advisory_url
                    ? <a href={v.advisory_url} className="text-blue-600 hover:underline text-xs" target="_blank" rel="noreferrer">{v.advisory_url}</a>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 max-w-xs truncate">
                  {v.rss_url
                    ? <a href={v.rss_url} className="text-blue-600 hover:underline text-xs" target="_blank" rel="noreferrer">{v.rss_url}</a>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(v)} className="text-gray-400 hover:text-brand"><Pencil size={14} /></button>
                    <button onClick={() => remove.mutate(v.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Žádní výrobci. Přidejte prvního.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
