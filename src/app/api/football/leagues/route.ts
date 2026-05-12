// src/app/api/football/leagues/route.ts
// Endpoint temporal para consultar ligas disponibles en api-football
// Solo accesible con CRON_SECRET

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const country = searchParams.get('country') ?? 'Colombia'
  const season  = searchParams.get('season') ?? '2026'

  const res = await fetch(
    `https://v3.football.api-sports.io/leagues?country=${encodeURIComponent(country)}&season=${season}`,
    { headers: { 'x-apisports-key': process.env.FOOTBALL_API_KEY! } }
  )

  const data = await res.json()
  return NextResponse.json(data)
}
