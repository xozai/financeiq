import { createClient } from '@/lib/supabase/server'
import { PortfolioClient } from './PortfolioClient'

export default async function PortfolioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: holdings } = await supabase
    .from('holdings')
    .select('*')
    .eq('user_id', user!.id)
    .order('current_value', { ascending: false })

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user!.id)
    .in('type', ['brokerage', 'retirement'])

  return <PortfolioClient holdings={holdings ?? []} accounts={accounts ?? []} />
}
