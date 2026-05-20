import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Product, Vendor } from '../api/client'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'

type PForm = { name: string; vendor_id: number; cpe_prefix: string; version_pattern: string }
const empty: PForm = { name: '', vendor_id: 0, cpe_prefix: '', version_pattern: '' }

export default function Products() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<PForm>(empty)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<PForm>(empty)

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products/').then(r => r.data),
  })
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors/').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (d: PForm) => api.post('/products/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setShowCreate(false); setForm(empty) },
  })
  const update = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<PForm> }) => api.put(`/products/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setEditId(null) },
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  })

  const vendorMap = Object.fromEntries(vendors.map(v => [v.id, v.name]))

  const startEdit = (p: Product) => {
    setEditId(p.id)
    setEditForm({ name: p.name, vendor_id: p.vendor_id, cpe_prefix: p.cpe_prefix ?? '', version_pattern: p.version_pattern ?? '' })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Produkty</h2>
        <button onClick={() => { setShowCreate(!showCreate); setForm(empty) }}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
          <Plus size={16} /> Přidat produkt
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Nový produkt</h3>
          <div className="grid grid-cols-2 gap-4">
            <input className="input" placeholder="Název produktu *"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <select className="input" value={form.vendor_id}
              onChange={e => setForm({ ...form, vendor_id: +e.target.value })}>
              <option value={0}>-- Vyberte výrobce --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <input className="input" placeholder="CPE prefix (např. cpe:2.3:a:cisco:ios)"
              value={form.cpe_prefix} onChange={e => setForm({ ...form, cpe_prefix: e.target.value })} />
            <input className="input" placeholder="Version pattern (např. 15.*)"
              value={form.version_pattern} onChange={e => setForm({ ...form, version_pattern: e.target.value })} />
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
              <th className="px-4 py-3 text-left">Produkt</th>
              <th className="px-4 py-3 text-left">Výrobce</th>
              <th className="px-4 py-3 text-left">CPE prefix</th>
              <th className="px-4 py-3 text-left">Version pattern</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {products.map(p => editId === p.id ? (
              <tr key={p.id} className="bg-blue-50">
                <td className="px-2 py-2">
                  <input className="input text-xs w-full" value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <select className="input text-xs w-full" value={editForm.vendor_id}
                    onChange={e => setEditForm({ ...editForm, vendor_id: +e.target.value })}>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2">
                  <input className="input text-xs w-full font-mono" placeholder="CPE prefix"
                    value={editForm.cpe_prefix} onChange={e => setEditForm({ ...editForm, cpe_prefix: e.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <input className="input text-xs w-full" placeholder="Version pattern"
                    value={editForm.version_pattern} onChange={e => setEditForm({ ...editForm, version_pattern: e.target.value })} />
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => update.mutate({ id: p.id, d: editForm })}
                      className="text-green-600 hover:text-green-800"><Check size={16} /></button>
                    <button onClick={() => setEditId(null)}
                      className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{vendorMap[p.vendor_id] ?? '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-gray-400">{p.cpe_prefix || '—'}</td>
                <td className="px-4 py-3 text-xs text-gray-400">{p.version_pattern || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => startEdit(p)} className="text-gray-400 hover:text-brand"><Pencil size={14} /></button>
                    <button onClick={() => remove.mutate(p.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Žádné produkty. Přidejte první.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
