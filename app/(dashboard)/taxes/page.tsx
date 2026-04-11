import { createClient } from '@/lib/supabase/server'

import { getMarginalRate, BRACKETS, CONTRIBUTION_LIMITS, estimateTaxSavings } from '@/lib/tax'

const LIMITS = CONTRIBUTION_LIMITS

function ContributionBar({ label, used, limit, limit2025 }: { label: string; used: number; limit: number; limit2025: string }) {
  const pct = Math.min((used / limit) * 100, 100)
  const remaining = limit - used
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-sm font-medium text-gray-900">{label}</span>
          <span className="text-xs text-gray-400 ml-2">2025 limit: {limit2025}</span>
        </div>
        <span className={`text-sm font-semibold ${remaining > 0 ? 'text-blue-600' : 'text-green-600'}`}>
          {remaining > 0 ? `$${remaining.toLocaleString()} left` : 'Maxed out!'}
        </span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">${used.toLocaleString()} contributed of ${limit.toLocaleString()}</p>
    </div>
  )
}

export default async function TaxesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: profile }, { data: holdings }, { data: txns }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('holdings').select('*').eq('user_id', user!.id),
    supabase.from('transactions').select('amount').eq('user_id', user!.id)
      .gte('date', `${new Date().getFullYear()}-01-01`).lt('amount', 0), // income rows
  ])

  const estimatedIncome = Math.abs((txns ?? []).reduce((s, t) => s + t.amount, 0)) * 12
  const marginalRate = getMarginalRate(profile?.annual_income_estimate ?? estimatedIncome)

  // Holding period analysis for tax
  const now = new Date()
  const shortTermGains = (holdings ?? [])
    .filter(h => {
      const held = (now.getTime() - new Date(h.purchase_date).getTime()) / (1000 * 60 * 60 * 24)
      return held < 365 && h.unrealized_gain_loss > 0
    })
    .reduce((s, h) => s + h.unrealized_gain_loss, 0)

  const longTermGains = (holdings ?? [])
    .filter(h => {
      const held = (now.getTime() - new Date(h.purchase_date).getTime()) / (1000 * 60 * 60 * 24)
      return held >= 365 && h.unrealized_gain_loss > 0
    })
    .reduce((s, h) => s + h.unrealized_gain_loss, 0)

  const harvestablelosses = (holdings ?? [])
    .filter(h => h.unrealized_gain_loss < -500)
    .reduce((s, h) => s + Math.abs(h.unrealized_gain_loss), 0)

  // Placeholder YTD contributions (replace with actual data from linked accounts)
  const ytdContributions = { k401: 0, ira: 0, hsa: 0 }

  const bracketSavings401k = estimateTaxSavings(LIMITS.k401, marginalRate)
  const bracketSavingsIra = estimateTaxSavings(LIMITS.ira, marginalRate)

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Tax Optimizer</h2>

      {/* Tax situation summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Est. Marginal Rate</p>
          <p className="text-3xl font-bold text-gray-900">{marginalRate}%</p>
          <p className="text-xs text-gray-400 mt-1">Single filer bracket</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Short-term Gains</p>
          <p className="text-2xl font-bold text-orange-600">${shortTermGains.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Taxed as ordinary income</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Long-term Gains</p>
          <p className="text-2xl font-bold text-green-600">${longTermGains.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Taxed at 0–20%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Harvestable Losses</p>
          <p className="text-2xl font-bold text-blue-600">${harvestablelosses.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Could offset gains</p>
        </div>
      </div>

      {/* Contribution room */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">2025 Tax-Advantaged Contribution Room</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Maxing these accounts at your {marginalRate}% bracket saves
            ~${(bracketSavings401k + bracketSavingsIra).toLocaleString()} in federal taxes.
          </p>
        </div>
        <ContributionBar label="401(k)" used={ytdContributions.k401} limit={LIMITS.k401} limit2025="$23,500" />
        <ContributionBar label="IRA (Traditional or Roth)" used={ytdContributions.ira} limit={LIMITS.ira} limit2025="$7,000" />
        <ContributionBar label="HSA" used={ytdContributions.hsa} limit={LIMITS.hsa} limit2025="$4,300" />
      </div>

      {/* Tax bracket ladder */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">2025 Federal Tax Brackets (Single)</h3>
        <div className="space-y-2">
          {BRACKETS.single.filter(b => b.min < 700000).map(b => {
            const income = profile?.annual_income_estimate ?? estimatedIncome
            const isActive = income >= b.min && income < b.max
            return (
              <div key={b.rate} className={`flex items-center gap-3 p-2.5 rounded-lg ${isActive ? 'bg-blue-50 border border-blue-200' : ''}`}>
                <span className={`text-sm font-bold w-10 ${isActive ? 'text-blue-700' : 'text-gray-400'}`}>{b.rate}%</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isActive ? 'bg-blue-500' : 'bg-gray-300'}`}
                    style={{ width: `${Math.min((b.max === Infinity ? 700000 : b.max) / 7000, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-40 text-right">
                  ${b.min.toLocaleString()} — {b.max === Infinity ? '∞' : `$${b.max.toLocaleString()}`}
                  {isActive && <span className="ml-1 font-semibold text-blue-600">← you</span>}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        This is an estimate based on linked account data and is not tax advice. Consult a CPA for filing decisions.
      </p>
    </div>
  )
}
