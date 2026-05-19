import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Vendor } from '../api/client'
import { Plus, Trash2 } from 'lucide-react'

export default function Vendors() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ name: '', slug: '', advisory_url: '', rss_url: '' })
  const [showForm, setShowForm] = useState(false)

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors/').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (data: typeof form) => api.post('/vendors/', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); setShowForm(false) },
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/vendors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Výrobci</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
          <Plus size={16} /> Přidat výrobce
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Nový výrobce</h3>
          <div className="grid grid-cols-2 gap-4">
            <input className="input" placeholder="Název (např. Cisco)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="Slug (např. cisco)" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase() })} />
            <input className="input" placeholder="Advisory URL" value={form.advisory_url} onChange={e => setForm({ ...form, advisory_url: e.target.value })} />
            <input className="input" placeholder="RSS feed URL" value={form.rss_url} onChange={e => setForm({ ...form, rss_url: e.target.value })} />
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => create.mutate(form)} className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">Uložit</button>
            <button onClick={() => setShowForm(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Zrušit</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Název</th>
              <th className="px-6 py-3 text-left">Slug</th>
              <th className="px-6 py-3 text-left">Advisory URL</th>
              <th className="px-6 py-3 text-left">RSS URL</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vendors.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{v.name}</td>
                <td className="px-6 py-3 text-gray-400 font-mono">{v.slug}</td>
                <td className="px-6 py-3">{v.advisory_url ? <a href={v.advisory_url} className="text-blue-600 hover:underline text-xs" target="_blank" rel="noreferrer">{v.advisory_url}</a> : '—'}</td>
                <td className="px-6 py-3">{v.rss_url ? <a href={v.rss_url} className="text-blue-600 hover:underline text-xs" target="_blank" rel="noreferrer">{v.rss_url}</a> : '—'}</td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => remove.mutate(v.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && <tr><td colSpan={5} className="px-6 py-6 text-gray-400">Žádní výrobci.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
