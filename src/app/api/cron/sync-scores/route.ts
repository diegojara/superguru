import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error, count } = await supabase
    .from('matches')
    .select('id, home_team, status', { count: 'exact' })
    .limit(5)

  console.log('[test] data:', JSON.stringify(data), 'error:', JSON.stringify(error), 'count:', count)

  return NextResponse.json({ data, error, count })
}
