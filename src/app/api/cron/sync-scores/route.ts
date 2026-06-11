// src/app/api/cron/sync-scores/route.ts
// Sincroniza marcadores en vivo desde ESPN (Mundial 2026)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET  = process.env.CRON_SECRET!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function mapEspnStatus(status: string): string {
  switch (status) {
    case 'STATUS_SCHEDULED':   return 'scheduled'
    case 'STATUS_IN_PROGRESS': return 'live'
    case 'STATUS_HALFTIME':    return 'live'
    case 'STATUS_END_PERIOD':  return 'live'
    case 'STATUS_FINAL':       return 'finished'
    case 'STATUS_FULL_TIME':   return 'finished'
    case 'STATUS_EXTRA_TIME':  return 'extra_time'
    case 'STATUS_PENALTY':     return 'penalties'
    default:                   return 'scheduled'
  }
}

function normalize(name: string): string {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
}

async function callRpc(fnName: string, params: Record<string, any>) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { error } = await (supabase.rpc as any)(fnName, params)
  return !error
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const now           = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id,home_team,away_team,kickoff_at,status,home_score,away_score')
      .neq('status', 'finished')

console.log('[sync-scores] allMatches count:', allMatches?.length, 'live:', allMatches?.filter((m:any) => m.status === 'live').length)

    const activeMatches = (allMatches ?? []).filter((m: any) => {
      if (['live', 'extra_time', 'penalties'].includes(m.status)) return true
      if (m.status === 'scheduled') {
        const kickoff = new Date(m.kickoff_at).getTime()
        return kickoff <= twoHoursLater.getTime()
      }
      return false
    })

    if (activeMatches.length === 0) {
      return NextResponse.json({ ok: true, message: 'No hay partidos activos', updated: 0 })
    }

    console.log('[sync-scores] activeMatches:', activeMatches.length)

    const espnRes = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    )

    if (!espnRes.ok) {
      return NextResponse.json({ ok: false, error: `ESPN respondió ${espnRes.status}`, active: activeMatches.length })
    }

    const espnData   = await espnRes.json()
    const espnEvents = espnData.events ?? []
    console.log('[sync-scores] ESPN events:', espnEvents.length)

    let updated = 0

    for (const match of activeMatches) {
      const event = espnEvents.find((e: any) => {
        const comp = e.competitions[0]
        const home = comp.competitors.find((t: any) => t.homeAway === 'home')
        const away = comp.competitors.find((t: any) => t.homeAway === 'away')
        return normalize(home?.team?.displayName ?? '') === normalize(match.home_team) &&
               normalize(away?.team?.displayName ?? '') === normalize(match.away_team)
      })

      console.log('[sync-scores] Buscando:', normalize(match.home_team), 'vs', normalize(match.away_team))
      console.log('[sync-scores] ESPN tiene:', espnEvents.map((e: any) => {
        const comp = e.competitions[0]
        const home = comp.competitors.find((t: any) => t.homeAway === 'home')
        const away = comp.competitors.find((t: any) => t.homeAway === 'away')
        return normalize(home?.team?.displayName ?? '') + ' vs ' + normalize(away?.team?.displayName ?? '')
      }))
      
      if (!event) continue

      const comp      = event.competitions[0]
      const home      = comp.competitors.find((t: any) => t.homeAway === 'home')
      const away      = comp.competitors.find((t: any) => t.homeAway === 'away')
      const newStatus = mapEspnStatus(comp.status.type.name)
      const homeScore = parseInt(home?.score ?? '0') || 0
      const awayScore = parseInt(away?.score ?? '0') || 0

     if (homeScore === (match.home_score ?? 0) && awayScore === (match.away_score ?? 0) && newStatus === match.status) continue

      const ok = await callRpc('update_match_score', {
        p_match_id:           match.id,
        p_home_score:         homeScore,
        p_away_score:         awayScore,
        p_status:             newStatus,
        p_went_to_extra_time: comp.status.type.name === 'STATUS_EXTRA_TIME',
        p_went_to_penalties:  comp.status.type.name === 'STATUS_PENALTY',
      })

      if (ok) {
        updated++
        console.log(`[sync-scores] Updated: ${match.home_team} vs ${match.away_team} ${homeScore}-${awayScore} (${newStatus})`)
      }
    }

    return NextResponse.json({
      ok: true, updated,
      active: activeMatches.length,
      espn_events: espnEvents.length,
      timestamp: now.toISOString(),
    })

  } catch (error: any) {
    console.error('[sync-scores]', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}
