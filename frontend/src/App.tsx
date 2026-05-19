import { Routes, Route, NavLink } from 'react-router-dom'
import { Shield, Users, Package, AlertTriangle, Building2 } from 'lucide-react'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Products from './pages/Products'
import CVEsPage from './pages/CVEs'
import Vendors from './pages/Vendors'

const navItems = [
  { to: '/', icon: Shield, label: 'Dashboard' },
  { to: '/customers', icon: Users, label: 'Zákazníci' },
  { to: '/vendors', icon: Building2, label: 'Výrobci' },
  { to: '/products', icon: Package, label: 'Produkty' },
  { to: '/cves', icon: AlertTriangle, label: 'CVEs' },
]

export default function App() {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-56 bg-brand text-white flex flex-col">
        <div className="px-6 py-5 border-b border-blue-900">
          <h1 className="font-bold text-lg leading-tight">CVEs<br/>Check Info</h1>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                  isActive ? 'bg-blue-900 font-semibold' : 'hover:bg-blue-900/50'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/customers/*" element={<Customers />} />
          <Route path="/vendors/*" element={<Vendors />} />
          <Route path="/products/*" element={<Products />} />
          <Route path="/cves" element={<CVEsPage />} />
        </Routes>
      </main>
    </div>
  )
}
