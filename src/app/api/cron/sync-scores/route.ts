// src/app/api/cron/sync-scores/route.ts
// Sincroniza marcadores en vivo desde ESPN (BetPlay) y api-football (Champions/Mundial)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET      = process.env.CRON_SECRET!
const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY!
const FOOTBALL_API_URL = 'https://v3.football.api-sports.io'
const SUPABASE_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY!

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

function mapApiStatus(short: string): string {
  switch (short) {
    case 'NS':  return 'scheduled'
    case '1H': case 'HT': case '2H': case 'ET': return 'live'
    case 'BT':  return 'extra_time'
    case 'P':   return 'penalties'
    case 'FT': case 'AET': case 'PEN': return 'finished'
    default:    return 'scheduled'
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
    
    // Traer partidos no finalizados
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id,home_team,away_team,kickoff_at,status,home_score,away_score,group_name')
      .neq('status', 'finished')

    console.log('[sync-scores] allMatches count:', allMatches?.length)

    // Filtrar: en vivo, o programados para las próximas 2 horas
    const activeMatches = (allMatches ?? []).filter(m => {
      if (['live', 'extra_time', 'penalties'].includes(m.status)) return true
      if (m.status === 'scheduled') {
        const kickoff = new Date(m.kickoff_at).getTime()
        return kickoff <= twoHoursLater.getTime() && kickoff >= now.getTime() - 150 * 60 * 1000
      }
      return false
    })

    if (activeMatches.length === 0) {
      return NextResponse.json({ ok: true, message: 'No hay partidos activos', updated: 0 })
    }

    const betplayMatches = activeMatches.filter((m: any) => m.group_name === 'Liga BetPlay')
    const otherMatches   = activeMatches.filter((m: any) => m.group_name !== 'Liga BetPlay')
    let updated = 0

    // --- BetPlay via ESPN ---
    if (betplayMatches.length > 0) {
      const espnRes = await fetch(
        'https://site.api.espn.com/apis/site/v2/sports/soccer/col.1/scoreboard',
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )

      if (espnRes.ok) {
        const espnData   = await espnRes.json()
        const espnEvents = espnData.events ?? []

        for (const match of betplayMatches) {
          const event = espnEvents.find((e: any) => {
            const comp = e.competitions[0]
            const home = comp.competitors.find((t: any) => t.homeAway === 'home')
            const away = comp.competitors.find((t: any) => t.homeAway === 'away')
            return normalize(home?.team?.displayName ?? '') === normalize(match.home_team) &&
                   normalize(away?.team?.displayName ?? '') === normalize(match.away_team)
          })
          if (!event) continue

          const comp      = event.competitions[0]
          const home      = comp.competitors.find((t: any) => t.homeAway === 'home')
          const away      = comp.competitors.find((t: any) => t.homeAway === 'away')
          const newStatus = mapEspnStatus(comp.status.type.name)
          const homeScore = parseInt(home?.score ?? '0') || 0
          const awayScore = parseInt(away?.score ?? '0') || 0

          if (homeScore === match.home_score && awayScore === match.away_score && newStatus === match.status) continue

          const ok = await callRpc('update_match_score', {
            p_match_id:           match.id,
            p_home_score:         homeScore,
            p_away_score:         awayScore,
            p_status:             newStatus,
            p_went_to_extra_time: comp.status.type.name === 'STATUS_EXTRA_TIME',
            p_went_to_penalties:  comp.status.type.name === 'STATUS_PENALTY',
          })
          if (ok) updated++
        }
      }
    }

    // --- Champions / Mundial via api-football ---
    if (otherMatches.length > 0) {
      const today = now.toISOString().split('T')[0]
      for (const leagueId of [1, 2]) {
        const apiRes = await fetch(
          `${FOOTBALL_API_URL}/fixtures?date=${today}&league=${leagueId}&season=2026`,
          { headers: { 'x-apisports-key': FOOTBALL_API_KEY } }
        )
        if (!apiRes.ok) continue
        const fixtures: any[] = (await apiRes.json()).response ?? []

        for (const match of otherMatches) {
          const f = fixtures.find((fx: any) =>
            normalize(fx.teams.home.name) === normalize(match.home_team) &&
            normalize(fx.teams.away.name) === normalize(match.away_team)
          )
          if (!f) continue

          const newStatus = mapApiStatus(f.fixture.status.short)
          const homeScore = f.goals.home ?? 0
          const awayScore = f.goals.away ?? 0

          if (homeScore === match.home_score && awayScore === match.away_score && newStatus === match.status) continue

          const ok = await callRpc('update_match_score', {
            p_match_id:           match.id,
            p_home_score:         homeScore,
            p_away_score:         awayScore,
            p_status:             newStatus,
            p_went_to_extra_time: ['AET','PEN'].includes(f.fixture.status.short),
            p_went_to_penalties:  f.fixture.status.short === 'PEN',
          })
          if (ok) updated++
        }
      }
    }

    return NextResponse.json({
      ok: true, updated,
      betplay_active: betplayMatches.length,
      other_active:   otherMatches.length,
      timestamp:      now.toISOString(),
    })

  } catch (error: any) {
    console.error('[sync-scores]', error)
    return NextResponse.json({ error: error.message ?? 'Error interno' }, { status: 500 })
  }
}
