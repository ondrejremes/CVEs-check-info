import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, Vendor } from '../api/client'
import { Plus, Trash2, Search, CheckCircle } from 'lucide-react'

interface LookupResult {
  name: string
  slug: string
  advisory_url?: string
  rss_url?: string
  cpe_vendor?: string
}

export default function Vendors() {
  const qc = useQueryClient()
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<LookupResult[]>([])
  const [selected, setSelected] = useState<LookupResult | null>(null)
  const [searching, setSearching] = useState(false)

  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors/').then(r => r.data),
  })

  const importVendor = useMutation({
    mutationFn: (data: LookupResult) => api.post('/vendors/lookup/import', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vendors'] })
      setSelected(null)
      setQuery('')
      setSuggestions([])
    },
  })

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/vendors/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vendors'] }),
  })

  const search = async () => {
    if (!query.trim()) return
    setSearching(true)
    try {
      const res = await api.get(`/vendors/lookup?q=${encodeURIComponent(query)}`)
      setSuggestions(res.data)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Výrobci</h2>
      </div>

      {/* Vendor lookup */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">Přidat výrobce podle názvu</h3>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="Zadej název výrobce (např. Cisco, Fortinet, Palo Alto...)"
            value={query}
            onChange={e => { setQuery(e.target.value); setSuggestions([]); setSelected(null) }}
            onKeyDown={e => e.key === 'Enter' && search()}
          />
          <button
            onClick={search}
            disabled={searching}
            className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 whitespace-nowrap disabled:opacity-50"
          >
            <Search size={16} /> {searching ? 'Hledám…' : 'Hledat'}
          </button>
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-3 border border-gray-100 rounded-lg overflow-hidden">
            {suggestions.map(s => (
              <div
                key={s.slug}
                onClick={() => setSelected(s)}
                className={`px-4 py-3 cursor-pointer hover:bg-blue-50 flex items-center justify-between transition-colors
                  ${selected?.slug === s.slug ? 'bg-blue-50 border-l-4 border-brand' : ''}`}
              >
                <div>
                  <p className="font-semibold text-gray-800">{s.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {s.advisory_url ? s.advisory_url : 'Bez advisory URL'} ·{' '}
                    {s.rss_url ? 'RSS feed ✓' : 'Bez RSS'}
                  </p>
                </div>
                {selected?.slug === s.slug && <CheckCircle size={18} className="text-brand" />}
              </div>
            ))}
          </div>
        )}

        {suggestions.length === 0 && query && !searching && (
          <p className="mt-3 text-sm text-gray-400">Žádné výsledky pro „{query}". Zkus jiný název.</p>
        )}

        {selected && (
          <div className="mt-4 bg-blue-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">Přidat výrobce: <span className="text-brand">{selected.name}</span></p>
            <div className="text-xs text-gray-500 space-y-1 mb-3">
              {selected.advisory_url && <p>Advisory: <a href={selected.advisory_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selected.advisory_url}</a></p>}
              {selected.rss_url && <p>RSS: <a href={selected.rss_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selected.rss_url}</a></p>}
            </div>
            <button
              onClick={() => importVendor.mutate(selected)}
              disabled={importVendor.isPending}
              className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 disabled:opacity-50"
            >
              {importVendor.isPending ? 'Přidávám…' : 'Potvrdit a přidat'}
            </button>
          </div>
        )}
      </div>

      {/* Vendor table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-6 py-3 text-left">Název</th>
              <th className="px-6 py-3 text-left">Slug</th>
              <th className="px-6 py-3 text-left">Advisory URL</th>
              <th className="px-6 py-3 text-left">RSS</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vendors.map(v => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="px-6 py-3 font-medium">{v.name}</td>
                <td className="px-6 py-3 text-gray-400 font-mono text-xs">{v.slug}</td>
                <td className="px-6 py-3">
                  {v.advisory_url
                    ? <a href={v.advisory_url} className="text-blue-600 hover:underline text-xs" target="_blank" rel="noreferrer">Link</a>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-6 py-3">
                  {v.rss_url
                    ? <span className="text-xs text-green-600 font-medium">✓ RSS</span>
                    : <span className="text-gray-300 text-xs">—</span>}
                </td>
                <td className="px-6 py-3 text-right">
                  <button onClick={() => remove.mutate(v.id)} className="text-red-400 hover:text-red-600">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {vendors.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-6 text-gray-400">Žádní výrobci. Vyhledej výše.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
