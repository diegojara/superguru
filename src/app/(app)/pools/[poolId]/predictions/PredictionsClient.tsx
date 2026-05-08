'use client'
// src/app/(app)/pools/[poolId]/predictions/PredictionsClient.tsx
// Autoguardado con debounce de 800ms — sin botón de guardar.

import { useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { utcToCot, isPredictionLocked, timeUntilLock } from '@/lib/utils/datetime'
import type { Match, Prediction } from '@/types/database'

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

function flagEmoji(name: string): string {
  const f: Record<string, string> = {
    'México': '🇲🇽','Corea del Sur': '🇰🇷','Chequia': '🇨🇿','Sudáfrica': '🇿🇦',
    'Canadá': '🇨🇦','Bosnia y Herz.': '🇧🇦','Qatar': '🇶🇦','Suiza': '🇨🇭',
    'Brasil': '🇧🇷','Marruecos': '🇲🇦','Haití': '🇭🇹','Escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'EE. UU.': '🇺🇸','Paraguay': '🇵🇾','Australia': '🇦🇺','Turquía': '🇹🇷',
    'Alemania': '🇩🇪','Costa Marfil': '🇨🇮','Ecuador': '🇪🇨','Curazao': '🇨🇼',
    'Países Bajos': '🇳🇱','Japón': '🇯🇵','Suecia': '🇸🇪','Túnez': '🇹🇳',
    'Bélgica': '🇧🇪','Egipto': '🇪🇬','Irán': '🇮🇷','Nueva Zelanda': '🇳🇿',
    'España': '🇪🇸','Cabo Verde': '🇨🇻','Arabia Saudita': '🇸🇦','Uruguay': '🇺🇾',
    'Francia': '🇫🇷','Senegal': '🇸🇳','Iraq': '🇮🇶','Noruega': '🇳🇴',
    'Argentina': '🇦🇷','Argelia': '🇩🇿','Austria': '🇦🇹','Jordania': '🇯🇴',
    'Portugal': '🇵🇹','Congo DR': '🇨🇩','Uzbekistán': '🇺🇿','Colombia': '🇨🇴',
    'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croacia': '🇭🇷','Ghana': '🇬🇭','Panamá': '🇵🇦',
  }
  return f[name] ?? '🏳️'
}

interface OtherMembership {
  id: string
  pool_id: string
  pools: { name: string } | null
}

interface Props {
  poolId: string
  poolMemberId: string
  matches: Match[]
  initialPredictions: Prediction[]
  otherMemberships: OtherMembership[]
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type PredState = {
  home: string
  away: string
  locked: boolean
  status: SaveStatus
}

export default function PredictionsClient({ poolMemberId, matches, initialPredictions }: Props) {
  const supabase = createClient()

  const [preds, setPreds] = useState<Record<string, PredState>>(() => {
    const map: Record<string, PredState> = {}
    for (const p of initialPredictions) {
      map[p.match_id] = {
        home: String(p.predicted_home),
        away: String(p.predicted_away),
        locked: !!p.locked_at,
        status: 'saved',
      }
    }
    return map
  })

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const save = useCallback(async (matchId: string, home: string, away: string) => {
    const h = parseInt(home)
    const a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return

    setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], status: 'saving' } }))

    try {
      const { error } = await (supabase.from('predictions') as any).upsert({
        pool_member_id: poolMemberId,
        match_id: matchId,
        predicted_home: h,
        predicted_away: a,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'pool_member_id,match_id' })

      if (error) throw error
      setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], status: 'saved' } }))
    } catch {
      setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], status: 'error' } }))
    }
  }, [poolMemberId, supabase])

  const handleChange = useCallback((matchId: string, field: 'home' | 'away', value: string) => {
    setPreds(prev => {
      const current = prev[matchId] ?? { home: '', away: '', locked: false, status: 'idle' as SaveStatus }
      return { ...prev, [matchId]: { ...current, [field]: value, status: 'idle' } }
    })

    if (timers.current[matchId]) clearTimeout(timers.current[matchId])

    timers.current[matchId] = setTimeout(() => {
      setPreds(prev => {
        const p = prev[matchId]
        if (!p) return prev
        const newHome = field === 'home' ? value : p.home
        const newAway = field === 'away' ? value : p.away
        if (newHome !== '' && newAway !== '') {
          save(matchId, newHome, newAway)
        }
        return prev
      })
    }, 800)
  }, [save])

  // Deduplicar partidos por match_id
  const seen = new Set<string>()
  const uniqueMatches = matches.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })

  // Agrupar por fecha COT
  const byDate = new Map<string, Match[]>()
  for (const m of uniqueMatches) {
    const cot = utcToCot(m.kickoff_at)
    const dateKey = cot.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(m)
  }

  const savedCount = Object.values(preds).filter(p => p.status === 'saved').length
  const pending = uniqueMatches.filter(m => !isPredictionLocked(m.kickoff_at) && preds[m.id]?.status !== 'saved').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <StatPill value={savedCount} label="guardados" color="var(--color-green)" />
        <StatPill value={pending} label="pendientes" color={pending > 0 ? 'var(--color-gold)' : 'var(--color-text-muted)'} />
      </div>

      {/* Leyenda de columnas */}
      <div style={{ display: 'grid', gridTemplateColumns: '32px 52px 1fr 48px 48px', gap: '0 8px', padding: '6px 14px', background: 'var(--color-green-dim)', borderRadius: 'var(--radius-md)' }}>
        {['', '', '', 'Real', 'Pron.'].map((h, i) => (
          <span key={i} style={{ fontSize: '0.7rem', fontWeight: 700, color: '#dcfce7', textAlign: 'center', letterSpacing: '0.04em' }}>{h}</span>
        ))}
      </div>

      {/* Partidos por fecha */}
      {[...byDate.entries()].map(([dateLabel, dayMatches]) => (
        <section key={dateLabel}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', padding: '8px 0', marginBottom: '6px', borderBottom: '1px solid var(--color-border)', textTransform: 'capitalize' }}>
            {dateLabel}
          </div>

          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {dayMatches.map((match, i) => {
              const locked = isPredictionLocked(match.kickoff_at) || !!preds[match.id]?.locked
              const timeLeft = timeUntilLock(match.kickoff_at)
              const pred = preds[match.id]
              const hasScore = match.home_score !== null && match.away_score !== null
              const isLast = i === dayMatches.length - 1
              const cotTime = utcToCot(match.kickoff_at)
              const timeStr = cotTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })
              const status = pred?.status ?? 'idle'

              const inputStyle = (val: string) => ({
                width: '44px', height: '38px', textAlign: 'center' as const,
                background: 'var(--color-bg-elevated)',
                border: `1px solid ${val !== '' ? 'var(--color-green)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-display)',
                fontSize: '1.25rem',
                outline: 'none',
              })

              return (
                <div key={match.id} style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  opacity: locked ? 0.7 : 1,
                }}>
                  {!locked && timeLeft && (
                    <div style={{ padding: '3px 14px 0', fontSize: '0.7rem', color: 'var(--color-gold)' }}>
                      ⏱ Cierra en {timeLeft}
                    </div>
                  )}

                  {/* Fila local */}
                  <div style={{ display: 'grid', gridTemplateColumns: '32px 52px 1fr 48px 48px', alignItems: 'center', padding: '10px 14px 4px', gap: '0 8px' }}>
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{flagEmoji(match.home_team)}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.04em' }}>{teamCode(match.home_team)}</span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {timeStr}
                      {['live','extra_time','penalties'].includes(match.status) && <span style={{ color: 'var(--color-live)', marginLeft: '6px', fontWeight: 600 }}>● VIVO</span>}
                      {locked && <span style={{ marginLeft: '4px' }}>🔒</span>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {hasScore ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text)', lineHeight: 1 }}>{match.home_score}</span>
                        : <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>–</span>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {locked
                        ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>{pred?.home ?? '–'}</span>
                        : <input type="number" min={0} max={20} value={pred?.home ?? ''} placeholder="–" onChange={e => handleChange(match.id, 'home', e.target.value)} style={inputStyle(pred?.home ?? '')} />
                      }
                    </div>
                  </div>

                  {/* Fila visitante */}
                  <div style={{ display: 'grid', gridTemplateColumns: '32px 52px 1fr 48px 48px', alignItems: 'center', padding: '4px 14px 10px', gap: '0 8px' }}>
                    <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{flagEmoji(match.away_team)}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.04em' }}>{teamCode(match.away_team)}</span>
                    {/* Indicador de estado */}
                    <div style={{ fontSize: '0.7rem', color: status === 'saved' ? 'var(--color-green)' : status === 'saving' ? 'var(--color-text-muted)' : status === 'error' ? 'var(--color-error)' : 'transparent' }}>
                      {status === 'saved' ? '✓ guardado' : status === 'saving' ? 'guardando…' : status === 'error' ? 'error al guardar' : '.'}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {hasScore ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text)', lineHeight: 1 }}>{match.away_score}</span>
                        : <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>–</span>}
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      {locked
                        ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text-muted)' }}>{pred?.away ?? '–'}</span>
                        : <input type="number" min={0} max={20} value={pred?.away ?? ''} placeholder="–" onChange={e => handleChange(match.id, 'away', e.target.value)} style={inputStyle(pred?.away ?? '')} />
                      }
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{ padding: '8px 16px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'baseline', gap: '6px' }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  )
}
