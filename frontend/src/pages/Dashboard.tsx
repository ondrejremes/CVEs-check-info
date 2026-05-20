import { useState, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api, CVEAlert, Customer, Product } from '../api/client'
import SeverityBadge from '../components/SeverityBadge'
import { RefreshCw, CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react'

interface FetchStep {
  name: string
  status: 'pending' | 'running' | 'done' | 'error'
  saved: number
  error?: string
}
interface FetchStatus {
  running: boolean
  started_at: string | null
  finished_at: string | null
  steps: FetchStep[]
  total_saved: number
  error: string | null
}

export default function Dashboard() {
  const qc = useQueryClient()
  const [fetchStatus, setFetchStatus] = useState<FetchStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: alerts = [], isLoading } = useQuery<CVEAlert[]>({
    queryKey: ['alerts'],
    queryFn: () => api.get('/cves/alerts?limit=20').then(r => r.data),
  })
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => api.get('/customers/').then(r => r.data),
  })
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.get('/products/').then(r => r.data),
  })

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const pollStatus = async () => {
    try {
      const r = await api.get('/cves/fetch/status')
      const s: FetchStatus = r.data
      setFetchStatus(s)
      if (!s.running) {
        stopPolling()
        qc.invalidateQueries({ queryKey: ['alerts'] })
      }
    } catch {
      stopPolling()
    }
  }

  const triggerFetch = async () => {
    await api.post('/cves/fetch')
    setFetchStatus(null)
    // Start polling immediately
    await pollStatus()
    pollRef.current = setInterval(pollStatus, 2000)
  }

  useEffect(() => () => stopPolling(), [])

  const isRunning = fetchStatus?.running ?? false

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 text-sm mt-1">Přehled posledních CVE upozornění</p>
        </div>
        <button
          onClick={triggerFetch}
          disabled={isRunning}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <RefreshCw size={16} className={isRunning ? 'animate-spin' : ''} />
          {isRunning ? 'Probíhá fetch…' : 'Spustit fetch'}
        </button>
      </div>

      {/* Fetch progress panel */}
      {fetchStatus && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-700 text-sm">Průběh fetchování CVEs</h3>
            {!isRunning && (
              <span className={`text-xs font-medium ${fetchStatus.error ? 'text-red-500' : 'text-green-600'}`}>
                {fetchStatus.error ? `Chyba: ${fetchStatus.error}` : `Dokončeno — ${fetchStatus.total_saved} nových CVEs`}
              </span>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            {fetchStatus.steps.map(step => (
              <div key={step.name}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                  step.status === 'running' ? 'border-blue-200 bg-blue-50 text-blue-700' :
                  step.status === 'done'    ? 'border-green-100 bg-green-50 text-green-700' :
                  step.status === 'error'   ? 'border-red-100 bg-red-50 text-red-600' :
                  'border-gray-100 bg-gray-50 text-gray-400'
                }`}>
                {step.status === 'running' && <Loader2 size={14} className="animate-spin shrink-0" />}
                {step.status === 'done'    && <CheckCircle2 size={14} className="shrink-0" />}
                {step.status === 'error'   && <AlertCircle size={14} className="shrink-0" />}
                {step.status === 'pending' && <Circle size={14} className="shrink-0" />}
                <span className="font-medium">{step.name}</span>
                {step.status === 'done' && step.saved > 0 && (
                  <span className="text-xs opacity-75">+{step.saved}</span>
                )}
                {step.status === 'error' && step.error && (
                  <span className="text-xs opacity-75" title={step.error}>!</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Zákazníci" value={customers.length} color="bg-blue-50 text-blue-700" />
        <StatCard label="Nová upozornění" value={alerts.filter(a => !a.notified).length} color="bg-red-50 text-red-700" />
        <StatCard label="Celkem alertů" value={alerts.length} color="bg-gray-50 text-gray-700" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Poslední CVE alerty</h3>
        </div>
        {isLoading ? (
          <p className="p-6 text-gray-400">Načítám…</p>
        ) : alerts.length === 0 ? (
          <p className="p-6 text-gray-400">Žádné alerty. Spusťte fetch pro načtení CVEs.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">CVE ID</th>
                <th className="px-4 py-3 text-left">Závažnost</th>
                <th className="px-4 py-3 text-left">CVSS</th>
                <th className="px-4 py-3 text-left">Výrobce</th>
                <th className="px-4 py-3 text-left">Produkty</th>
                <th className="px-4 py-3 text-left">Zákazník</th>
                <th className="px-4 py-3 text-left">Notifikováno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {alerts.map(alert => {
                const customer = customers.find(c => c.id === alert.customer_id)
                const matchedProducts = customer?.products.filter(
                  p => p.vendor_id === alert.cve.vendor_id
                ) ?? []
                return (
                  <tr key={alert.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono font-semibold text-blue-700 whitespace-nowrap">
                      {alert.cve.source_url ? (
                        <a href={alert.cve.source_url} target="_blank" rel="noreferrer" className="hover:underline">
                          {alert.cve.cve_id}
                        </a>
                      ) : alert.cve.cve_id}
                    </td>
                    <td className="px-4 py-3"><SeverityBadge severity={alert.cve.severity} /></td>
                    <td className="px-4 py-3 text-gray-600">{alert.cve.cvss_score ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {alert.cve.vendor_name ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {matchedProducts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {matchedProducts.map(p => (
                            <span key={p.id} className="text-xs bg-blue-50 text-blue-700 rounded px-1.5 py-0.5 whitespace-nowrap">
                              {p.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{customer?.name ?? `#${alert.customer_id}`}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${alert.notified ? 'text-green-600' : 'text-red-500 font-semibold'}`}>
                        {alert.notified ? 'Ano' : 'Ne'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl p-5 ${color}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  )
}
