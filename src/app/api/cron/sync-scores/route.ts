// src/app/api/cron/sync-scores/route.ts
// Sincroniza marcadores en vivo desde ESPN (Mundial 2026)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CRON_SECRET  = process.env.CRON_SECRET!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Mapeo de nombres en inglés (ESPN) a español (DB)
const TEAM_ALIASES: Record<string, string> = {
  'south africa': 'sudafrica', 'south korea': 'corea del sur',
  'czechia': 'chequia', 'czech republic': 'chequia',
  'usa': 'ee uu', 'united states': 'ee uu',
  'netherlands': 'paises bajos', 'holland': 'paises bajos',
  'sweden': 'suecia', 'tunisia': 'tunez', 'belgium': 'belgica',
  'egypt': 'egipto', 'new zealand': 'nueva zelanda',
  'spain': 'espana', 'cape verde': 'cabo verde',
  'saudi arabia': 'arabia saudita', 'france': 'francia',
  'norway': 'noruega', 'algeria': 'argelia', 'jordan': 'jordania',
  'dr congo': 'congo dr', 'uzbekistan': 'uzbekistan',
  'england': 'inglaterra', 'croatia': 'croacia',
  'panama': 'panama', 'haiti': 'haiti', 'scotland': 'escocia',
  'turkey': 'turquia', 'germany': 'alemania',
  'ivory coast': 'costa marfil', 'curacao': 'curazao',
  'brazil': 'brasil', 'morocco': 'marruecos',
  'switzerland': 'suiza', 'canada': 'canada',
  'bosnia and herzegovina': 'bosnia y herz',
  'bosnia-herzegovina': 'bosnia y herz',
  'bosnia herzegovina': 'bosnia y herz',
  'ecuador': 'ecuador', 'colombia': 'colombia',
  'ghana': 'ghana', 'portugal': 'portugal',
  'argentina': 'argentina', 'senegal': 'senegal',
  'iraq': 'iraq', 'iran': 'iran', 'qatar': 'qatar',
  'australia': 'australia', 'paraguay': 'paraguay',
  'uruguay': 'uruguay', 'austria': 'austria',
  'mexico': 'mexico', 'japan': 'japon',
}

function normalize(name: string): string {
  const clean = name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '').trim()
  return TEAM_ALIASES[clean] ?? clean
}

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

async function callRpc(fnName: string, params: Record<string, any>) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const { error } = await (supabase.rpc as any)(fnName, params)
  if (error) console.error('[sync-scores] RPC error:', error)
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

    console.log('[sync-scores] allMatches count:', allMatches?.length)

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
      const normHome = normalize(match.home_team)
      const normAway = normalize(match.away_team)

      const event = espnEvents.find((e: any) => {
        const comp     = e.competitions[0]
        const homeTeam = comp.competitors.find((t: any) => t.homeAway === 'home')
        const awayTeam = comp.competitors.find((t: any) => t.homeAway === 'away')
        const espnHome = normalize(homeTeam?.team?.displayName ?? '')
        const espnAway = normalize(awayTeam?.team?.displayName ?? '')
       console.log(`[sync-scores] DB: "${normHome}" vs "${normAway}" | ESPN: "${espnHome}" vs "${espnAway}"`)
        return espnHome === normHome && espnAway === normAway
      })

      if (!event) {
        console.log(`[sync-scores] No encontrado en ESPN: ${match.home_team} vs ${match.away_team}`)
        continue
      }

      const comp      = event.competitions[0]
      const homeTeam  = comp.competitors.find((t: any) => t.homeAway === 'home')
      const awayTeam  = comp.competitors.find((t: any) => t.homeAway === 'away')
      const newStatus = mapEspnStatus(comp.status.type.name)
      const homeScore = parseInt(homeTeam?.score ?? '0') || 0
      const awayScore = parseInt(awayTeam?.score ?? '0') || 0

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
        console.log(`[sync-scores] Actualizado: ${match.home_team} ${homeScore}-${awayScore} (${newStatus})`)
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
