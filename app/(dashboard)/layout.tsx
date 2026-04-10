import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  LayoutDashboard,
  TrendingUp,
  CreditCard,
  Receipt,
  Newspaper,
  Lightbulb,
  Settings,
} from 'lucide-react'

const navItems = [
  { href: '/dashboard',               label: 'Overview',         icon: LayoutDashboard },
  { href: '/dashboard/portfolio',     label: 'Portfolio',        icon: TrendingUp },
  { href: '/dashboard/debt',          label: 'Debt',             icon: CreditCard },
  { href: '/dashboard/taxes',         label: 'Tax Optimizer',    icon: Receipt },
  { href: '/dashboard/news',          label: 'Market News',      icon: Newspaper },
  { href: '/dashboard/recommendations', label: 'AI Advisor',    icon: Lightbulb },
]

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">FinanceIQ</h1>
          <p className="text-xs text-gray-500 mt-0.5">Personal Finance Command Center</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <p className="text-xs text-gray-400 mt-3 px-3 truncate">{user.email}</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
