import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createLinkToken } from '@/lib/plaid'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const linkToken = await createLinkToken(user.id)
  return NextResponse.json(linkToken)
}
