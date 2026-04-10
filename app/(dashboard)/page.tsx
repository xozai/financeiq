import { createClient } from '@/lib/supabase/server'
import { NetWorthCard } from '@/components/dashboard/NetWorthCard'
import { CashFlowChart } from '@/components/dashboard/CashFlowChart'
import { DebtWaterfall } from '@/components/dashboard/DebtWaterfall'
import { QuickActions } from '@/components/dashboard/QuickActions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch accounts and compute net worth
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user!.id)

  const { data: snapshots } = await supabase
    .from('net_worth_snapshots')
    .select('*')
    .eq('user_id', user!.id)
    .order('snapshot_date', { ascending: false })
    .limit(30)

  const { data: debts } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', user!.id)
    .order('apr', { ascending: false })

  const assets = (accounts ?? [])
    .filter(a => !['credit_card', 'loan', 'mortgage'].includes(a.type))
    .reduce((sum, a) => sum + Number(a.balance_current), 0)

  const liabilities = (accounts ?? [])
    .filter(a => ['credit_card', 'loan', 'mortgage'].includes(a.type))
    .reduce((sum, a) => sum + Math.abs(Number(a.balance_current)), 0)

  const netWorth = { total_assets: assets, total_liabilities: liabilities, net_worth: assets - liabilities, change_30d: 0, change_30d_pct: 0 }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Overview</h2>
        <p className="text-gray-500 text-sm mt-1">Last updated just now</p>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <NetWorthCard netWorth={netWorth} />
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Assets</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ${assets.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Liabilities</p>
          <p className="text-2xl font-bold text-red-600 mt-1">
            ${liabilities.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net worth trend chart */}
        <div className="lg:col-span-2">
          <CashFlowChart snapshots={snapshots ?? []} />
        </div>

        {/* Quick actions / AI nudges */}
        <QuickActions userId={user!.id} />
      </div>

      {/* Debt waterfall */}
      {debts && debts.length > 0 && (
        <DebtWaterfall debts={debts} />
      )}

      {accounts?.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <h3 className="font-semibold text-blue-900 text-lg">Connect your accounts</h3>
          <p className="text-blue-700 text-sm mt-2 mb-4">
            Link your bank, brokerage, and credit accounts to get personalized insights.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            Connect via Plaid
          </button>
        </div>
      )}
    </div>
  )
}
