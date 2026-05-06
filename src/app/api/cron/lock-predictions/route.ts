// src/app/api/cron/lock-predictions/route.ts
// Cron job: cierra pronósticos 1 minuto antes del kickoff.
//
// Configurar en vercel.json:
// {
//   "crons": [{ "path": "/api/cron/lock-predictions", "schedule": "* * * * *" }]
// }
//
// El endpoint está protegido con CRON_SECRET para evitar llamadas no autorizadas.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  // Verificar el token secreto del cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    const { data, error } = await supabase.rpc('lock_predictions_for_match')

    if (error) throw error

    return NextResponse.json({
      ok: true,
      locked: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[cron/lock-predictions]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
