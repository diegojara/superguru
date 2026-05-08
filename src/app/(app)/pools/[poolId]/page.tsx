// src/app/(app)/pools/[poolId]/page.tsx
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { utcToCot } from '@/lib/utils/datetime'
import { STAGE_LABELS } from '@/lib/utils/scoring'

function teamCode(name: string): string {
  const o: Record<string, string> = {
    'México': 'MEX','Corea del Sur': 'KOR','Chequia': 'CZE','Sudáfrica': 'RSA',
    'Canadá': 'CAN','Bosnia y Herz.': 'BIH','Qatar': 'QAT','Suiza': 'SUI',
    'Brasil': 'BRA','Marruecos': 'MAR','Haití': 'HAI','Escocia': 'SCO',
    'EE. UU.': 'USA','Paraguay': 'PAR','Australia': 'AUS','Turquía': 'TUR',
    'Alemania': 'GER','Costa Marfil': 'CIV','Ecuador': 'ECU','Curazao': 'CUW',
    'Países Bajos': 'NED','Japón': 'JPN','Suecia': 'SWE','Túnez': 'TUN',
    'Bélgica': 'BEL','Egipto': 'EGY','Irán': 'IRN','Nueva Zelanda': 'NZL',
    'España': 'ESP','Cabo Verde': 'CPV','Arabia Saudita': 'KSA','Uruguay': 'URU',
    'Francia': 'FRA','Senegal': 'SEN','Iraq': 'IRQ','Noruega': 'NOR',
    'Argentina': 'ARG','Argelia': 'ALG','Austria': 'AUT','Jordania': 'JOR',
    'Portugal': 'POR','Congo DR': 'COD','Uzbekistán': 'UZB','Colombia': 'COL',
    'Inglaterra': 'ENG','Croacia': 'CRO','Ghana': 'GHA','Panamá': 'PAN',
  }
  return o[name] ?? name.slice(0, 3).toUpperCase()
}

 return ''
}

function flagIso(name: string): string {
  const f: Record<string, string> = {
    'México': 'mx','Corea del Sur': 'kr','Chequia': 'cz','Sudáfrica': 'za',
    'Canadá': 'ca','Bosnia y Herz.': 'ba','Qatar': 'qa','Suiza': 'ch',
    'Brasil': 'br','Marruecos': 'ma','Haití': 'ht','Escocia': 'gb-sct',
    'EE. UU.': 'us','Paraguay': 'py','Australia': 'au','Turquía': 'tr',
    'Alemania': 'de','Costa Marfil': 'ci','Ecuador': 'ec','Curazao': 'cw',
    'Países Bajos': 'nl','Japón': 'jp','Suecia': 'se','Túnez': 'tn',
    'Bélgica': 'be','Egipto': 'eg','Irán': 'ir','Nueva Zelanda': 'nz',
    'España': 'es','Cabo Verde': 'cv','Arabia Saudita': 'sa','Uruguay': 'uy',
    'Francia': 'fr','Senegal': 'sn','Iraq': 'iq','Noruega': 'no',
    'Argentina': 'ar','Argelia': 'dz','Austria': 'at','Jordania': 'jo',
    'Portugal': 'pt','Congo DR': 'cd','Uzbekistán': 'uz','Colombia': 'co',
    'Inglaterra': 'gb-eng','Croacia': 'hr','Ghana': 'gh','Panamá': 'pa',
  }
  return ''
}

function FlagImg({ name }: { name: string }) {
  const iso = flagIso(name)
  if (!iso) return <span style={{ width: '20px', display: 'inline-block' }} />
  return (
    <img
      src={`https://flagcdn.com/w20/${iso}.png`}
      width={20}
      height={15}
      alt={name}
      style={{ objectFit: 'cover', borderRadius: '2px', display: 'block' }}
    />
  )
}

interface Props { params: Promise<{ poolId: string }> }

export default async function PoolPage({ params }: Props) {
  const { poolId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: pool } = await supabase.from('pools').select('*').eq('id', poolId).single() as any
  if (!pool) notFound()

  const { data: poolMatches } = await supabase
    .from('pool_matches').select('match_id, matches(*)')
    .eq('pool_id', poolId)
    .order('kickoff_at', { foreignTable: 'matches', ascending: true }) as any

  const allMatches: any[] = ((poolMatches as any[]) ?? []).map((pm: any) => pm.matches).filter(Boolean)
  // Deduplicar por match_id
  const seenIds = new Set<string>()
  const matches: any[] = allMatches.filter((m: any) => {
    if (seenIds.has(m.id)) return false
    seenIds.add(m.id)
    return true
  })

  const { data: memberRow } = await supabase
    .from('pool_members').select('id').eq('pool_id', poolId).eq('user_id', user.id).maybeSingle() as any

  const predMap: Record<string, any> = {}
  const scoreMap: Record<string, any> = {}

  if (memberRow) {
    const [{ data: preds }, { data: scores }] = await Promise.all([
      supabase.from('predictions').select('match_id, predicted_home, predicted_away, locked_at').eq('pool_member_id', memberRow.id),
      supabase.from('scores').select('match_id, points_earned, breakdown').eq('pool_member_id', memberRow.id),
    ]) as any[]
    for (const p of (preds as any[]) ?? []) predMap[p.match_id] = p
    for (const s of (scores as any[]) ?? []) scoreMap[s.match_id] = s
  }

  const byDate = new Map<string, any[]>()
  for (const m of matches) {
    const cot = utcToCot(m.kickoff_at)
    const dateKey = cot.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(m)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {pool.welcome_message && (
        <div style={{ padding: '12px 16px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.6 }}>
          {pool.welcome_message}
        </div>
      )}
      {matches.length === 0 && (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
          Esta Polla aún no tiene partidos asignados.
        </div>
      )}
      {[...byDate.entries()].map(([dateLabel, dayMatches]) => (
        <section key={dateLabel}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', padding: '8px 0', marginBottom: '6px', borderBottom: '1px solid var(--color-border)', textTransform: 'capitalize' }}>
            {dateLabel}
          </div>
          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {(dayMatches as any[]).map((match: any, i: number) => {
              const pred = predMap[match.id]
              const score = scoreMap[match.id]
              const isLive = ['live','extra_time','penalties'].includes(match.status)
              const isDone = match.status === 'finished'
              const hasScore = match.home_score !== null && match.away_score !== null
              const isLast = i === dayMatches.length - 1
              const cotTime = utcToCot(match.kickoff_at)
              const timeStr = cotTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })
              return (
                <div key={match.id} style={{ borderBottom: isLast ? 'none' : '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                  <TeamRow flag={<FlagImg name={match.home_team} />} code={teamCode(match.home_team)} realScore={match.home_score} predScore={pred?.predicted_home ?? null} isTop={true} isLive={isLive} isDone={isDone} hasScore={hasScore} timeStr={timeStr} points={score?.points_earned ?? null} showPoints={true} locked={!!pred?.locked_at} />
                  <TeamRow flag={<FlagImg name={match.away_team} />} code={teamCode(match.away_team)} realScore={match.away_score} predScore={pred?.predicted_away ?? null} isTop={false} isLive={isLive} isDone={isDone} hasScore={hasScore} timeStr={timeStr} points={score?.points_earned ?? null} showPoints={false} locked={!!pred?.locked_at} />
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function TeamRow({ flag, code, realScore, predScore, isTop, isLive, isDone, hasScore, timeStr, points, showPoints, locked }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '32px 52px 1fr 40px 40px 48px', alignItems: 'center', padding: isTop ? '10px 14px 4px' : '4px 14px 10px', gap: '0 8px' }}>
      <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>{flag}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.04em' }}>{code}</span>
      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
        {isTop && !hasScore ? timeStr : ''}
        {isTop && isLive && <span style={{ color: 'var(--color-live)', marginLeft: '6px', fontWeight: 600 }}>● VIVO</span>}
      </div>
      <div style={{ textAlign: 'center' }}>
        {hasScore ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: isLive ? 'var(--color-live)' : 'var(--color-text)', lineHeight: 1 }}>{realScore}</span>
          : <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>–</span>}
      </div>
      <div style={{ textAlign: 'center' }}>
        {predScore !== null ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', color: locked ? 'var(--color-text-muted)' : 'var(--color-green)', lineHeight: 1 }}>{predScore}</span>
          : <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>–</span>}
      </div>
      <div style={{ textAlign: 'center' }}>
        {showPoints && points !== null ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: points > 0 ? 'var(--color-text)' : 'var(--color-text-subtle)', lineHeight: 1 }}>{points}</span> : null}
      </div>
    </div>
  )
}
