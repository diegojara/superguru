import { NextResponse } from 'next/server'

function normalize(name: string): string {
  const TEAM_ALIASES: Record<string, string> = {
    'bosnia and herzegovina': 'bosnia y herz',
    'bosniaherzegovina': 'bosnia y herz',
    'bosnia herzegovina': 'bosnia y herz',
    'switzerland': 'suiza',
  }
  const clean = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
  return TEAM_ALIASES[clean] ?? clean
}

export async function GET() {
  const res = await fetch(
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  )
  const data = await res.json()
  const events = data.events ?? []

  const debug = events.map((e: any) => {
    const comp = e.competitions[0]
    const home = comp.competitors.find((t: any) => t.homeAway === 'home')
    const away = comp.competitors.find((t: any) => t.homeAway === 'away')
    return {
      espn_home_raw: home?.team?.displayName,
      espn_away_raw: away?.team?.displayName,
      espn_home_norm: normalize(home?.team?.displayName ?? ''),
      espn_away_norm: normalize(away?.team?.displayName ?? ''),
      status: comp.status.type.name,
    }
  })

  return NextResponse.json({ debug })
}
