import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Product, Vendor } from '../api/client'
import { Plus, Trash2, Pencil, Check, X, Download, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

type PForm = { name: string; vendor_id: number; cpe_prefix: string; version_pattern: string }
const empty: PForm = { name: '', vendor_id: 0, cpe_prefix: '', version_pattern: '' }

interface Suggestion { name: string; cpe_prefix: string }

export default function Products() {
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<PForm>(empty)
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<PForm>(empty)

  // NVD suggest state
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestVendorId, setSuggestVendorId] = useState(0)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loadingSuggest, setLoadingSuggest] = useState(false)
  const [suggestError, setSuggestError] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualCpe, setManualCpe] = useState('')

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

  const fetchSuggestions = async () => {
    if (!suggestVendorId) return
    setLoadingSuggest(true)
    setSuggestError('')
    setSuggestions([])
    setSelected(new Set())
    try {
      const r = await api.get(`/products/suggest?vendor_id=${suggestVendorId}`)
      setSuggestions(r.data)
      if (r.data.length === 0) setSuggestError('V NVD nebyly nalezeny žádné produkty pro tohoto výrobce. Zkontrolujte slug výrobce.')
    } catch {
      setSuggestError('Chyba při dotazu na NVD API.')
    } finally {
      setLoadingSuggest(false)
    }
  }

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(suggestions.map(s => s.name)) : new Set())
  }

  const addSelected = async () => {
    const toAdd = suggestions.filter(s => selected.has(s.name))
    for (const s of toAdd) {
      await api.post('/products/', { name: s.name, vendor_id: suggestVendorId, cpe_prefix: s.cpe_prefix || null, version_pattern: '' })
    }
    qc.invalidateQueries({ queryKey: ['products'] })
    setShowSuggest(false)
    setSuggestions([])
    setSelected(new Set())
  }

  const addManual = async () => {
    if (!manualName.trim() || !suggestVendorId) return
    await api.post('/products/', { name: manualName.trim(), vendor_id: suggestVendorId, cpe_prefix: manualCpe.trim() || null, version_pattern: '' })
    qc.invalidateQueries({ queryKey: ['products'] })
    setManualName('')
    setManualCpe('')
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Produkty</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowSuggest(!showSuggest)}
            className="flex items-center gap-2 border border-brand text-brand px-4 py-2 rounded-lg text-sm hover:bg-blue-50">
            <Download size={15} /> Načíst z NVD
            {showSuggest ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => { setShowCreate(!showCreate); setForm(empty) }}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800">
            <Plus size={16} /> Přidat ručně
          </button>
        </div>
      </div>

      {/* NVD suggest panel */}
      {showSuggest && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
          <h3 className="font-semibold text-gray-700 mb-1">Načíst produkty z NVD CPE databáze</h3>
          <p className="text-xs text-gray-400 mb-4">Vyberte výrobce a klikněte Načíst — zobrazí se produkty evidované v NVD, které ještě nemáte přidané.</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-500 mb-1 block">Výrobce</label>
              <select className="input w-full" value={suggestVendorId}
                onChange={e => { setSuggestVendorId(+e.target.value); setSuggestions([]); setSuggestError('') }}>
                <option value={0}>-- Vyberte výrobce --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name} ({v.slug})</option>)}
              </select>
            </div>
            <button onClick={fetchSuggestions} disabled={!suggestVendorId || loadingSuggest}
              className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-40">
              {loadingSuggest ? <Loader2 size={15} className="animate-spin" /> : null}
              Načíst
            </button>
          </div>

          {suggestError && <p className="mt-3 text-sm text-orange-500">{suggestError}</p>}

          {suggestions.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox"
                    checked={selected.size === suggestions.length}
                    onChange={e => toggleAll(e.target.checked)} />
                  Vybrat vše ({suggestions.length} produktů)
                </label>
                <span className="text-xs text-gray-400">vybráno: {selected.size}</span>
              </div>
              <div className="border rounded-lg overflow-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-500 uppercase sticky top-0">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      <th className="px-3 py-2 text-left">Název</th>
                      <th className="px-3 py-2 text-left font-mono">CPE prefix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {suggestions.map(s => (
                      <tr key={s.name} className="hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          const next = new Set(selected)
                          next.has(s.name) ? next.delete(s.name) : next.add(s.name)
                          setSelected(next)
                        }}>
                        <td className="px-3 py-1.5 text-center">
                          <input type="checkbox" readOnly checked={selected.has(s.name)} />
                        </td>
                        <td className="px-3 py-1.5 font-medium text-gray-700">{s.name}</td>
                        <td className="px-3 py-1.5 font-mono text-gray-400">{s.cpe_prefix || <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={addSelected} disabled={selected.size === 0}
                  className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-40">
                  Přidat vybrané ({selected.size})
                </button>
              </div>
            </div>
          )}

          {/* Manual add — for products not in NVD */}
          {suggestVendorId > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Produkt není v NVD? Přidejte ručně
              </p>
              <p className="text-xs text-gray-400 mb-3">
                NVD eviduje jen produkty s aspoň jedním zdokumentovaným CVE. Produkty přidané bez CPE prefixu se párují podle názvu v textu CVE.
              </p>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Název produktu *</label>
                  <input className="input w-full" placeholder="např. Cortex XSIAM"
                    value={manualName} onChange={e => setManualName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addManual()} />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">CPE prefix (nepovinný)</label>
                  <input className="input w-full font-mono" placeholder="cpe:2.3:a:paloaltonetworks:..."
                    value={manualCpe} onChange={e => setManualCpe(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addManual()} />
                </div>
                <button onClick={addManual} disabled={!manualName.trim()}
                  className="flex items-center gap-1 bg-gray-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900 disabled:opacity-40">
                  <Plus size={14} /> Přidat
                </button>
              </div>
            </div>
          )}

          <div className="flex mt-4">
            <button onClick={() => { setShowSuggest(false); setSuggestions([]); setSelected(new Set()); setManualName(''); setManualCpe('') }}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Zavřít</button>
          </div>
        </div>
      )}

      {/* manual create form */}
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
            <input className="input font-mono" placeholder="CPE prefix (např. cpe:2.3:a:cisco:ios)"
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

      {/* table */}
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
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-400">Žádné produkty. Přidejte první nebo načtěte z NVD.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
