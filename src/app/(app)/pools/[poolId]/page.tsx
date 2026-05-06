// src/app/(app)/pools/[poolId]/page.tsx
// Vista de partidos de la Polla.
// Diseño: agrupado por fecha, cada partido en dos filas (local/visitante),
// bandera + código + marcador real + pronóstico + puntos obtenidos.

import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { STAGE_LABELS } from '@/lib/utils/scoring'
import { utcToCot } from '@/lib/utils/datetime'
import type { Match, MatchStage } from '@/types/database'

// Códigos de 3 letras para mostrar en la tabla (abreviatura)
function teamCode(name: string): string {
  const overrides: Record<string, string> = {
    'México': 'MEX', 'Corea del Sur': 'KOR', 'Chequia': 'CZE', 'Sudáfrica': 'RSA',
    'Canadá': 'CAN', 'Bosnia y Herz.': 'BIH', 'Qatar': 'QAT', 'Suiza': 'SUI',
    'Brasil': 'BRA', 'Marruecos': 'MAR', 'Haití': 'HAI', 'Escocia': 'SCO',
    'EE. UU.': 'USA', 'Paraguay': 'PAR', 'Australia': 'AUS', 'Turquía': 'TUR',
    'Alemania': 'GER', 'Costa Marfil': 'CIV', 'Ecuador': 'ECU', 'Curazao': 'CUW',
    'Países Bajos': 'NED', 'Japón': 'JPN', 'Suecia': 'SWE', 'Túnez': 'TUN',
    'Bélgica': 'BEL', 'Egipto': 'EGY', 'Irán': 'IRN', 'Nueva Zelanda': 'NZL',
    'España': 'ESP', 'Cabo Verde': 'CPV', 'Arabia Saudita': 'KSA', 'Uruguay': 'URU',
    'Francia': 'FRA', 'Senegal': 'SEN', 'Iraq': 'IRQ', 'Noruega': 'NOR',
    'Argentina': 'ARG', 'Argelia': 'ALG', 'Austria': 'AUT', 'Jordania': 'JOR',
    'Portugal': 'POR', 'Congo DR': 'COD', 'Uzbekistán': 'UZB', 'Colombia': 'COL',
    'Inglaterra': 'ENG', 'Croacia': 'CRO', 'Ghana': 'GHA', 'Panamá': 'PAN',
  }
  if (overrides[name]) return overrides[name]
  return name.slice(0, 3).toUpperCase()
}

// Emoji de bandera por código ISO
function flagEmoji(name: string): string {
  const flags: Record<string, string> = {
    'México': '🇲🇽', 'Corea del Sur': '🇰🇷', 'Chequia': '🇨🇿', 'Sudáfrica': '🇿🇦',
    'Canadá': '🇨🇦', 'Bosnia y Herz.': '🇧🇦', 'Qatar': '🇶🇦', 'Suiza': '🇨🇭',
    'Brasil': '🇧🇷', 'Marruecos': '🇲🇦', 'Haití': '🇭🇹', 'Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'EE. UU.': '🇺🇸', 'Paraguay': '🇵🇾', 'Australia': '🇦🇺', 'Turquía': '🇹🇷',
    'Alemania': '🇩🇪', 'Costa Marfil': '🇨🇮', 'Ecuador': '🇪🇨', 'Curazao': '🇨🇼',
    'Países Bajos': '🇳🇱', 'Japón': '🇯🇵', 'Suecia': '🇸🇪', 'Túnez': '🇹🇳',
    'Bélgica': '🇧🇪', 'Egipto': '🇪🇬', 'Irán': '🇮🇷', 'Nueva Zelanda': '🇳🇿',
    'España': '🇪🇸', 'Cabo Verde': '🇨🇻', 'Arabia Saudita': '🇸🇦', 'Uruguay': '🇺🇾',
    'Francia': '🇫🇷', 'Senegal': '🇸🇳', 'Iraq': '🇮🇶', 'Noruega': '🇳🇴',
    'Argentina': '🇦🇷', 'Argelia': '🇩🇿', 'Austria': '🇦🇹', 'Jordania': '🇯🇴',
    'Portugal': '🇵🇹', 'Congo DR': '🇨🇩', 'Uzbekistán': '🇺🇿', 'Colombia': '🇨🇴',
    'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Croacia': '🇭🇷', 'Ghana': '🇬🇭', 'Panamá': '🇵🇦',
  }
  return flags[name] ?? '🏳️'
}

interface Props {
  params: Promise<{ poolId: string }>
}

export default async function PoolPage({ params }: Props) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pool } = await supabase
    .from('pools').select('*').eq('id', poolId).single()
  if (!pool) notFound()

  // Partidos de la Polla ordenados por fecha
  const { data: poolMatches } = await supabase
    .from('pool_matches')
    .select('match_id, matches(*)')
    .eq('pool_id', poolId)
    .order('kickoff_at', { foreignTable: 'matches', ascending: true })

  const matches = (poolMatches ?? [])
    .map(pm => pm.matches as unknown as Match)
    .filter(Boolean)

  // Pronósticos + puntajes del usuario en esta Polla
  const { data: memberRow } = await supabase
    .from('pool_members')
    .select('id')
    .eq('pool_id', poolId).eq('user_id', user.id)
    .maybeSingle()

  const predMap: Record<string, { predicted_home: number; predicted_away: number; locked_at: string | null }> = {}
  const scoreMap: Record<string, { points_earned: number; breakdown: any }> = {}

  if (memberRow) {
    const [{ data: preds }, { data: scores }] = await Promise.all([
      supabase.from('predictions').select('match_id, predicted_home, predicted_away, locked_at').eq('pool_member_id', memberRow.id),
      supabase.from('scores').select('match_id, points_earned, breakdown').eq('pool_member_id', memberRow.id),
    ])
    for (const p of preds ?? []) predMap[p.match_id] = p
    for (const s of scores ?? []) scoreMap[s.match_id] = s
  }

  // Agrupar por fecha (en COT)
  const byDate = new Map<string, Match[]>()
  for (const m of matches) {
    const cot = utcToCot(m.kickoff_at)
    const dateKey = cot.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(m)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Mensaje de bienvenida */}
      {pool.welcome_message && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
          color: 'var(--color-text)',
          lineHeight: 1.6,
        }}>
          {pool.welcome_message}
        </div>
      )}

      {matches.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Esta Polla aún no tiene partidos asignados.
        </div>
      )}

      {/* Bloques por fecha */}
      {[...byDate.entries()].map(([dateLabel, dayMatches]) => (
        <section key={dateLabel}>

          {/* Encabezado de fecha */}
          <div style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--color-text)',
            padding: '8px 0',
            marginBottom: '6px',
            borderBottom: '1px solid var(--color-border)',
            textTransform: 'capitalize',
          }}>
            {dateLabel}
          </div>

          {/* Partidos del día */}
          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {dayMatches.map((match, i) => {
              const pred  = predMap[match.id]
              const score = scoreMap[match.id]
              const isLive = ['live','extra_time','penalties'].includes(match.status)
              const isDone = match.status === 'finished'
              const hasScore = match.home_score !== null && match.away_score !== null
              const isLast = i === dayMatches.length - 1

              const cotTime = utcToCot(match.kickoff_at)
              const timeStr = cotTime.toLocaleTimeString('es-CO', {
                hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC',
              })

              return (
                <div
                  key={match.id}
                  style={{
                    borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  }}
                >
                  {/* Fila local */}
                  <TeamRow
                    flag={flagEmoji(match.home_team)}
                    code={teamCode(match.home_team)}
                    realScore={match.home_score}
                    predScore={pred?.predicted_home ?? null}
                    isTop={true}
                    isLive={isLive}
                    isDone={isDone}
                    hasScore={hasScore}
                    timeStr={timeStr}
                    points={score?.points_earned ?? null}
                    showPoints={true}
                    locked={!!pred?.locked_at}
                  />

                  {/* Fila visitante */}
                  <TeamRow
                    flag={flagEmoji(match.away_team)}
                    code={teamCode(match.away_team)}
                    realScore={match.away_score}
                    predScore={pred?.predicted_away ?? null}
                    isTop={false}
                    isLive={isLive}
                    isDone={isDone}
                    hasScore={hasScore}
                    timeStr={timeStr}
                    points={score?.points_earned ?? null}
                    showPoints={false}
                    locked={!!pred?.locked_at}
                  />
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fila de equipo — igual que la referencia: bandera | código | marcador | pronóstico | pts
// ---------------------------------------------------------------------------
function TeamRow({
  flag, code, realScore, predScore,
  isTop, isLive, isDone, hasScore,
  timeStr, points, showPoints, locked,
}: {
  flag: string
  code: string
  realScore: number | null
  predScore: number | null
  isTop: boolean
  isLive: boolean
  isDone: boolean
  hasScore: boolean
  timeStr: string
  points: number | null
  showPoints: boolean
  locked: boolean
}) {
  const scoreColor = isLive ? 'var(--color-live)' : 'var(--color-text)'

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 52px 1fr 40px 40px 48px',
      alignItems: 'center',
      padding: isTop ? '10px 14px 4px' : '4px 14px 10px',
      gap: '0 8px',
    }}>

      {/* Bandera */}
      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{flag}</span>

      {/* Código del equipo */}
      <span style={{
        fontSize: '0.875rem',
        fontWeight: 600,
        color: 'var(--color-text)',
        letterSpacing: '0.04em',
      }}>
        {code}
      </span>

      {/* Horario (solo en fila superior si no hay marcador) */}
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        {isTop && !hasScore ? timeStr : ''}
        {isTop && isLive && (
          <span style={{ color: 'var(--color-live)', marginLeft: '6px', fontWeight: 600 }}>
            ● VIVO
          </span>
        )}
      </div>

      {/* Marcador real */}
      <div style={{ textAlign: 'center' }}>
        {hasScore ? (
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            color: scoreColor,
            lineHeight: 1,
          }}>
            {realScore}
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>–</span>
        )}
      </div>

      {/* Pronóstico */}
      <div style={{ textAlign: 'center' }}>
        {predScore !== null ? (
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.3rem',
            color: locked ? 'var(--color-text-muted)' : 'var(--color-green)',
            lineHeight: 1,
          }}>
            {predScore}
          </span>
        ) : (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>–</span>
        )}
      </div>

      {/* Puntos (solo en fila superior, abarca las dos filas visualmente) */}
      <div style={{
        textAlign: 'center',
        gridRow: isTop ? 'span 1' : 'span 1',
      }}>
        {showPoints && points !== null ? (
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            color: points > 0 ? 'var(--color-text)' : 'var(--color-text-subtle)',
            lineHeight: 1,
          }}>
            {points}
          </span>
        ) : showPoints && isDone && points === null ? (
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>–</span>
        ) : null}
      </div>
    </div>
  )
}
