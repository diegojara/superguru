// src/app/api/football/espn/route.ts
// Endpoint temporal para probar ESPN API

import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/col.1/scoreboard',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )

    if (!res.ok) {
      return NextResponse.json({ error: `ESPN respondió ${res.status}` })
    }

    const data = await res.json()
    const events = data.events ?? []

    const simplified = events.map((e: any) => {
      const comp = e.competitions[0]
      const home = comp.competitors.find((t: any) => t.homeAway === 'home')
      const away = comp.competitors.find((t: any) => t.homeAway === 'away')
      return {
        id:       e.id,
        date:     e.date,
        status:   comp.status.type.name,
        home:     home?.team?.displayName,
        away:     away?.team?.displayName,
        homeScore: home?.score,
        awayScore: away?.score,
      }
    })

    return NextResponse.json({ ok: true, count: events.length, events: simplified })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
