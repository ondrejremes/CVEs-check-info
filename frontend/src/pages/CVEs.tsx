import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api, CVE, Customer, Product, Vendor } from '../api/client'
import SeverityBadge from '../components/SeverityBadge'

const SEVERITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

export default function CVEsPage() {
  const [customerId, setCustomerId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [productId, setProductId] = useState('')
  const [severity, setSeverity] = useState('')

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers/').then(r => r.data),
  })
  const { data: vendors = [] } = useQuery<Vendor[]>({
    queryKey: ['vendors'],
    queryFn: () => api.get('/vendors/').then(r => r.data),
  })
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products/').then(r => r.data),
  })

  const params = new URLSearchParams()
  if (customerId) params.set('customer_id', customerId)
  if (vendorId) params.set('vendor_id', vendorId)
  if (severity) params.set('severity', severity)
  params.set('limit', '100')

  const { data: cves = [], isLoading } = useQuery<CVE[]>({
    queryKey: ['cves', customerId, vendorId, severity],
    queryFn: () => api.get(`/cves/?${params}`).then(r => r.data),
  })

  // Products available for the selected vendor (for product filter dropdown)
  const vendorProducts = useMemo(
    () => vendorId ? products.filter(p => p.vendor_id === +vendorId) : products,
    [products, vendorId]
  )

  // Client-side filter by product (CPE prefix or vendor match)
  const filtered = useMemo(() => {
    if (!productId) return cves
    const product = products.find(p => p.id === +productId)
    if (!product) return cves
    return cves.filter(cve => {
      if (product.vendor_id && cve.vendor_id === product.vendor_id) return true
      if (product.cpe_prefix && cve.affected_products) {
        try {
          const cpes: string[] = JSON.parse(cve.affected_products)
          if (cpes.some(c => c.toLowerCase().includes(product.cpe_prefix!.toLowerCase()))) return true
        } catch {
          if (cve.affected_products.toLowerCase().includes(product.cpe_prefix.toLowerCase())) return true
        }
      }
      if (product.name && cve.description?.toLowerCase().includes(product.name.toLowerCase())) return true
      return false
    })
  }, [cves, productId, products])

  // Reset product when vendor changes
  const handleVendorChange = (v: string) => {
    setVendorId(v)
    setProductId('')
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">CVE přehled</h2>

      <div className="flex flex-wrap gap-3 mb-6">
        <select className="input w-52" value={customerId} onChange={e => setCustomerId(e.target.value)}>
          <option value="">Všichni zákazníci</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-52" value={vendorId} onChange={e => handleVendorChange(e.target.value)}>
          <option value="">Všichni výrobci</option>
          {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <select className="input w-52" value={productId} onChange={e => setProductId(e.target.value)}
          disabled={vendorProducts.length === 0}>
          <option value="">Všechny produkty</option>
          {vendorProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input w-40" value={severity} onChange={e => setSeverity(e.target.value)}>
          {SEVERITIES.map(s => <option key={s} value={s}>{s || 'Vše závažnosti'}</option>)}
        </select>
        <span className="text-sm text-gray-400 self-center">{filtered.length} záznamů</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {isLoading ? (
          <p className="p-6 text-gray-400">Načítám…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">CVE ID</th>
                <th className="px-4 py-3 text-left">Závažnost</th>
                <th className="px-4 py-3 text-left">CVSS</th>
                <th className="px-4 py-3 text-left">Výrobce</th>
                <th className="px-4 py-3 text-left">Zveřejněno</th>
                <th className="px-4 py-3 text-left">Zdroj</th>
                <th className="px-4 py-3 text-left">Popis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(cve => (
                <tr key={cve.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700 whitespace-nowrap">
                    {cve.source_url ? (
                      <a href={cve.source_url} target="_blank" rel="noreferrer" className="hover:underline">{cve.cve_id}</a>
                    ) : cve.cve_id}
                  </td>
                  <td className="px-4 py-3"><SeverityBadge severity={cve.severity} /></td>
                  <td className="px-4 py-3 text-gray-600">{cve.cvss_score ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                    {cve.vendor_name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {cve.published_at ? new Date(cve.published_at).toLocaleDateString('cs-CZ') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5">{cve.source ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                    {cve.description ?? '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-6 py-6 text-gray-400">
                  {cves.length === 0 ? 'Žádné CVEs. Spusťte fetch z dashboardu.' : 'Žádné výsledky pro zvolené filtry.'}
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
