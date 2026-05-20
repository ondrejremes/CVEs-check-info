import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Customer, Product } from '../api/client'
import { Plus, Trash2, Pencil, Check, X, Download } from 'lucide-react'

type CForm = { name: string; email: string; language: string; contact_person: string; notify_email: boolean }
const empty: CForm = { name: '', email: '', language: 'cs', contact_person: '', notify_email: true }

export default function Customers() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<CForm>(empty)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<CForm>(empty)

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers/').then(r => r.data),
  })
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products/').then(r => r.data),
  })

  const create = useMutation({
    mutationFn: (d: CForm) => api.post('/customers/', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setShowCreate(false); setForm(empty) },
  })
  const update = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<CForm> }) => api.put(`/customers/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['customers'] }); setEditId(null) },
  })
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/customers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
  const addProduct = useMutation({
    mutationFn: ({ cid, pid }: { cid: number; pid: number }) => api.post(`/customers/${cid}/products/${pid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
  const removeProduct = useMutation({
    mutationFn: ({ cid, pid }: { cid: number; pid: number }) => api.delete(`/customers/${cid}/products/${pid}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })

  const startEdit = (c: Customer) => {
    setEditId(c.id)
    setEditForm({ name: c.name, email: c.email, language: c.language, contact_person: c.contact_person ?? '', notify_email: c.notify_email })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Zákazníci</h2>
        <button onClick={() => { setShowCreate(!showCreate); setForm(empty) }}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
          <Plus size={16} /> Přidat zákazníka
        </button>
      </div>

      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-4">Nový zákazník</h3>
          <div className="grid grid-cols-2 gap-4">
            <input className="input" placeholder="Název *"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="input" placeholder="E-mail *"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="input" placeholder="Kontaktní osoba"
              value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} />
            <select className="input" value={form.language}
              onChange={e => setForm({ ...form, language: e.target.value })}>
              <option value="cs">Čeština</option>
              <option value="en">English</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-3 text-sm text-gray-600">
            <input type="checkbox" checked={form.notify_email}
              onChange={e => setForm({ ...form, notify_email: e.target.checked })} />
            Zasílat e-mail notifikace
          </label>
          <div className="flex gap-2 mt-4">
            <button onClick={() => create.mutate(form)}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">Uložit</button>
            <button onClick={() => setShowCreate(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Zrušit</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {customers.map(customer => (
          <div key={customer.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {editId === customer.id ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input className="input" placeholder="Název *"
                    value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
                  <input className="input" placeholder="E-mail *"
                    value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} />
                  <input className="input" placeholder="Kontaktní osoba"
                    value={editForm.contact_person} onChange={e => setEditForm({ ...editForm, contact_person: e.target.value })} />
                  <select className="input" value={editForm.language}
                    onChange={e => setEditForm({ ...editForm, language: e.target.value })}>
                    <option value="cs">Čeština</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 mb-4 text-sm text-gray-600">
                  <input type="checkbox" checked={editForm.notify_email}
                    onChange={e => setEditForm({ ...editForm, notify_email: e.target.checked })} />
                  Zasílat e-mail notifikace
                </label>
                <div className="flex gap-2">
                  <button onClick={() => update.mutate({ id: customer.id, d: editForm })}
                    className="flex items-center gap-1 bg-brand text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-800">
                    <Check size={14} /> Uložit
                  </button>
                  <button onClick={() => setEditId(null)}
                    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">
                    <X size={14} /> Zrušit
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">{customer.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {customer.email} · {customer.language === 'cs' ? 'Čeština' : 'English'}
                    {!customer.notify_email && <span className="ml-2 text-xs text-orange-400">(notifikace vypnuty)</span>}
                  </p>
                  {customer.contact_person && (
                    <p className="text-xs text-gray-400 mt-0.5">Kontakt: {customer.contact_person}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a href={`/api/reports/customer/${customer.id}/pdf`} target="_blank"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand border rounded px-2 py-1">
                    <Download size={12} /> PDF
                  </a>
                  <a href={`/api/reports/customer/${customer.id}/excel`} target="_blank"
                    className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand border rounded px-2 py-1">
                    <Download size={12} /> Excel
                  </a>
                  <button onClick={() => startEdit(customer)}
                    className="text-gray-400 hover:text-brand p-1"><Pencil size={15} /></button>
                  <button onClick={() => remove.mutate(customer.id)}
                    className="text-red-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-50">
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Přiřazené produkty</p>
              <div className="flex flex-wrap gap-2">
                {customer.products.map(p => (
                  <span key={p.id} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 rounded px-2 py-1">
                    {p.name}
                    <button onClick={() => removeProduct.mutate({ cid: customer.id, pid: p.id })}
                      className="text-blue-400 hover:text-red-500 ml-0.5">×</button>
                  </span>
                ))}
                <select className="text-xs border rounded px-2 py-1 text-gray-500"
                  defaultValue=""
                  onChange={e => { if (e.target.value) addProduct.mutate({ cid: customer.id, pid: +e.target.value }); e.target.value = '' }}>
                  <option value="">+ přidat produkt</option>
                  {products.filter(p => !customer.products.find(cp => cp.id === p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">Žádní zákazníci. Přidejte prvního.</p>
        )}
      </div>
    </div>
  )
}
