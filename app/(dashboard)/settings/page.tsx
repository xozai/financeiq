'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2 } from 'lucide-react'

interface Profile {
  full_name: string | null
  risk_tolerance: string
  tax_filing_status: string
  annual_income_estimate: number | null
  target_allocation: { stocks: number; bonds: number; cash: number }
}

const RISK_OPTIONS = [
  { value: 'conservative', label: 'Conservative', description: 'Preserve capital — lower returns, lower volatility' },
  { value: 'moderate',     label: 'Moderate',     description: 'Balanced growth and stability (recommended for most)' },
  { value: 'aggressive',   label: 'Aggressive',   description: 'Maximize growth — higher returns, higher volatility' },
]

const FILING_OPTIONS = [
  { value: 'single',             label: 'Single' },
  { value: 'married_joint',      label: 'Married Filing Jointly' },
  { value: 'married_separate',   label: 'Married Filing Separately' },
  { value: 'head_of_household',  label: 'Head of Household' },
]

const DEFAULT_ALLOCATIONS: Record<string, { stocks: number; bonds: number; cash: number }> = {
  conservative: { stocks: 40, bonds: 50, cash: 10 },
  moderate:     { stocks: 70, bonds: 25, cash: 5  },
  aggressive:   { stocks: 90, bonds: 8,  cash: 2  },
}

export default function SettingsPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    risk_tolerance: 'moderate',
    tax_filing_status: 'single',
    annual_income_estimate: null,
    target_allocation: DEFAULT_ALLOCATIONS.moderate,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setEmail(user.email ?? '')
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) setProfile({
            full_name: data.full_name ?? '',
            risk_tolerance: data.risk_tolerance ?? 'moderate',
            tax_filing_status: data.tax_filing_status ?? 'single',
            annual_income_estimate: data.annual_income_estimate ?? null,
            target_allocation: data.target_allocation ?? DEFAULT_ALLOCATIONS.moderate,
          })
          setLoading(false)
        })
    })
  }, [])

  function handleRiskChange(value: string) {
    setProfile(p => ({ ...p, risk_tolerance: value, target_allocation: DEFAULT_ALLOCATIONS[value] }))
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      full_name: profile.full_name,
      risk_tolerance: profile.risk_tolerance,
      tax_filing_status: profile.tax_filing_status,
      annual_income_estimate: profile.annual_income_estimate,
      target_allocation: profile.target_allocation,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id)

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const allocationTotal = profile.target_allocation.stocks + profile.target_allocation.bonds + profile.target_allocation.cash

  if (loading) return <div className="animate-pulse text-gray-400 text-sm">Loading settings…</div>

  return (
    <div className="space-y-8 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>

      <form onSubmit={save} className="space-y-8">

        {/* Profile */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Profile</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profile.full_name ?? ''}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
          </div>
        </section>

        {/* Tax Information */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Tax Information</h3>
            <p className="text-xs text-gray-500 mt-0.5">Used to calculate your estimated tax bracket and contribution savings.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filing Status</label>
            <select
              value={profile.tax_filing_status}
              onChange={e => setProfile(p => ({ ...p, tax_filing_status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FILING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Annual Income</label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">$</span>
              <input
                type="number"
                value={profile.annual_income_estimate ?? ''}
                onChange={e => setProfile(p => ({ ...p, annual_income_estimate: e.target.value ? Number(e.target.value) : null }))}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 95000"
                min={0}
                step={1000}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">Used only for bracket estimation — never shared.</p>
          </div>
        </section>

        {/* Risk Tolerance */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Investment Risk Tolerance</h3>
            <p className="text-xs text-gray-500 mt-0.5">Sets your target allocation and rebalance thresholds.</p>
          </div>
          <div className="space-y-2">
            {RISK_OPTIONS.map(opt => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  profile.risk_tolerance === opt.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="risk"
                  value={opt.value}
                  checked={profile.risk_tolerance === opt.value}
                  onChange={() => handleRiskChange(opt.value)}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">{opt.label}</p>
                  <p className="text-xs text-gray-500">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* Target Allocation */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Target Allocation</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Auto-set from your risk profile — adjust if needed. Must total 100%.
            </p>
          </div>
          {(['stocks', 'bonds', 'cash'] as const).map(key => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700 capitalize">{key}</label>
                <span className="text-sm font-semibold text-gray-900">{profile.target_allocation[key]}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={profile.target_allocation[key]}
                onChange={e => setProfile(p => ({
                  ...p,
                  target_allocation: { ...p.target_allocation, [key]: Number(e.target.value) }
                }))}
                className="w-full accent-blue-600"
              />
            </div>
          ))}
          <p className={`text-xs font-medium ${allocationTotal === 100 ? 'text-green-600' : 'text-red-500'}`}>
            Total: {allocationTotal}% {allocationTotal !== 100 && '— must equal 100%'}
          </p>
        </section>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving || allocationTotal !== 100}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Saved
            </span>
          )}
        </div>

        <p className="text-xs text-gray-400">
          FinanceIQ does not provide financial advice. All recommendations are informational only. Consult a licensed CFP or CPA for personalized guidance.
        </p>
      </form>
    </div>
  )
}
