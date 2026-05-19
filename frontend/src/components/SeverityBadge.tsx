const colors: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-300',
  HIGH:     'bg-orange-100 text-orange-800 border-orange-300',
  MEDIUM:   'bg-yellow-100 text-yellow-800 border-yellow-300',
  LOW:      'bg-green-100 text-green-800 border-green-300',
}

export default function SeverityBadge({ severity }: { severity?: string | null }) {
  const cls = severity ? colors[severity] ?? 'bg-gray-100 text-gray-600 border-gray-300' : 'bg-gray-100 text-gray-400 border-gray-200'
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded border ${cls}`}>
      {severity ?? '—'}
    </span>
  )
}
