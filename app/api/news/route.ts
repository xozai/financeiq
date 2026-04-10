import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMarketNews } from '@/lib/market'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const news = await getMarketNews('general')
  return NextResponse.json({ news: news.slice(0, 20) })
}
