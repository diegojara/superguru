// src/app/api/cron/sync-scores/route.ts
// Sincroniza marcadores en vivo desde api-football.com
// Se invoca desde GitHub Actions cada minuto durante partidos en vivo.

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

const FOOTBALL_API_KEY = process.env.FOOTBALL_API_KEY!
const FOOTBALL_API_URL = 'https://v3.football.api-sports.io'

// Mapeo de status de api-football → status de SuperGurú
function mapStatus(short: string): string {
  switch (short) {
    case 'NS':  return 'scheduled'
    case '1H':
    case 'HT':
    case '2H':
    case 'ET':  return 'live'
    case 'BT':  return 'extra_time'
    case 'P':   return 'penalties'
    case 'FT':
    case 'AET':
    case 'PEN': return 'finished'
    default:    return 'scheduled'
  }
}

export async function GET(request: Request) {
  // Verificar token de seguridad
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const supabase = createServiceClient()

    // Obtener partidos que están en vivo o que empiezan en las próximas 2 horas
    const now = new Date()
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000)

    const { data: activeMatches } = await supabase
      .from('matches')
      .select('id, home_team, away_team, kickoff_at, status, home_score, away_score')
      .or(`status.in.(live,extra_time,penalties),and(status.eq.scheduled,kickoff_at.lte.${twoHoursLater.toISOString()})`)

    if (!activeMatches || activeMatches.length === 0) {
      return NextResponse.json({ ok: true, message: 'No hay partidos activos', updated: 0 })
    }

    // Obtener fecha de hoy para la consulta a la API
    const today = now.toISOString().split('T')[0]

    // Consultar api-football — traer todos los fixtures de hoy
    // Usamos la liga del Mundial 2026 (ID: 1) o Champions League (ID: 2) según corresponda
    // Para el Mundial 2026 el league ID es 1
    const leagueIds = [1, 2] // Mundial + Champions League para pruebas
    
    const allFixtures: any[] = []
    
    for (const leagueId of leagueIds) {
      const res = await fetch(
        `${FOOTBALL_API_URL}/fixtures?date=${today}&league=${leagueId}&season=2026`,
        {
          headers: {
            'x-apisports-key': FOOTBALL_API_KEY,
          },
        }
      )
      
      if (!res.ok) continue
      
      const data = await res.json()
      if (data.response) allFixtures.push(...data.response)
    }

    if (allFixtures.length === 0) {
      return NextResponse.json({ ok: true, message: 'No hay fixtures en la API para hoy', updated: 0 })
    }

    // Cruzar por nombre de equipos
    let updated = 0

    for (const match of activeMatches) {
      // Buscar el fixture correspondiente en la API
      const fixture = allFixtures.find((f: any) => {
        const homeMatches = normalizeTeamName(f.teams.home.name) === normalizeTeamName(match.home_team)
        const awayMatches = normalizeTeamName(f.teams.away.name) === normalizeTeamName(match.away_team)
        return homeMatches && awayMatches
      })

      if (!fixture) continue

      const apiStatus    = mapStatus(fixture.fixture.status.short)
      const apiHomeScore = fixture.goals.home ?? null
      const apiAwayScore = fixture.goals.away ?? null
      const wentToExtra  = ['AET', 'PEN'].includes(fixture.fixture.status.short)
      const wentToPens   = fixture.fixture.status.short === 'PEN'

      // Solo actualizar si algo cambió
      const scoreChanged  = apiHomeScore !== match.home_score || apiAwayScore !== match.away_score
      const statusChanged = apiStatus !== match.status

      if (!scoreChanged && !statusChanged) continue

      // Usar update_match_score para actualizar y recalcular puntos
      const { error } = await supabase.rpc('update_match_score', {
        p_match_id:           match.id,
        p_home_score:         apiHomeScore ?? 0,
        p_away_score:         apiAwayScore ?? 0,
        p_status:             apiStatus,
        p_went_to_extra_time: wentToExtra,
        p_went_to_penalties:  wentToPens,
      })

      if (!error) {
        updated++
        console.log(`Actualizado: ${match.home_team} vs ${match.away_team} — ${apiHomeScore}-${apiAwayScore} (${apiStatus})`)
      }
    }

    return NextResponse.json({
      ok: true,
      updated,
      fixtures_found: allFixtures.length,
      active_matches: activeMatches.length,
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[sync-scores]', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

// Normalizar nombres de equipos para comparación
function normalizeTeamName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar tildes
    .replace(/[^a-z0-9\s]/g, '')     // quitar caracteres especiales
    .trim()
}
