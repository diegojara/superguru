'use client'
// src/app/(app)/pools/[poolId]/predictions/PredictionsClient.tsx
// Vista unificada: ingreso de pronósticos + comparación con otros participantes.

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { utcToCot, isPredictionLocked, timeUntilLock } from '@/lib/utils/datetime'
import { TIER_LABELS } from '@/lib/utils/scoring'

// ---------------------------------------------------------------------------
// Helpers de banderas y códigos
// ---------------------------------------------------------------------------
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
  return f[name] ?? ''
}

function FlagImg({ name }: { name: string }) {
  const iso = flagIso(name)
  if (!iso) return <span style={{ width: '20px', display: 'inline-block' }} />
  return <img src={`https://flagcdn.com/w20/${iso}.png`} width={20} height={15} alt={name} style={{ objectFit: 'cover', borderRadius: '2px', display: 'block' }} />
}

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
    'Inglaterra': 'ENG','Croacia': 'CRO','Ghana': 'GHA','Panamá': 'PAN', 'Atlético Nacional': 'Nacional',
    'Inter Bogotá': 'Inter',
    'Internacional de Bogotá': 'Inter',
    'Independiente Santa Fe': 'Santa Fe',
    'América de Cali': 'América',
    'Deportivo Pasto': 'Pasto',
    'Deportes Tolima': 'Tolima',
    'Junior de Barranquilla': 'Junior',
'Atlético Junior': 'Junior',
    'Once Caldas': 'Caldas',
    'Arsenal': 'Arsenal',
    'PSG': 'PSG',
  }
  if (o[name]) return o[name]
  const p1 = name.match(/^1ro Grupo ([A-Z])$/); if (p1) return `1° ${p1[1]}`
  const p2 = name.match(/^2do Grupo ([A-Z])$/); if (p2) return `2° ${p2[1]}`
  const pm = name.match(/^Mejor 3ro (.+)$/);    if (pm) return `M3 ${pm[1]}`
  const pg = name.match(/^Gan\. M(\d+)$/);      if (pg) return `G${pg[1]}`
  const pp = name.match(/^Perd\. M(\d+)$/);     if (pp) return `P${pp[1]}`
  return name.slice(0, 4)
}

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
interface Member { id: string; display_name: string }
interface Match  { id: string; home_team: string; away_team: string; kickoff_at: string; home_score: number | null; away_score: number | null; status: string; stage: string }
interface Pred   { match_id: string; predicted_home: number; predicted_away: number; locked_at: string | null }
interface Score  { match_id: string; points_earned: number; breakdown: any }
interface OtherPred { pool_member_id: string; match_id: string; predicted_home: number; predicted_away: number }

interface Props {
  poolId: string
  myMember: Member
  matches: Match[]
  myPredictions: Pred[]
  myScores: Score[]
  allMembers: Member[]
  otherPredictions: OtherPred[]
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'
type PredState  = { home: string; away: string; locked: boolean; status: SaveStatus }

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export default function PredictionsClient({
  myMember, matches, myPredictions, myScores, allMembers, otherPredictions,
}: Props) {
  const supabase = createClient()

  // Estado de mis pronósticos
  const [preds, setPreds] = useState<Record<string, PredState>>(() => {
    const map: Record<string, PredState> = {}
    for (const p of myPredictions) {
      map[p.match_id] = { home: String(p.predicted_home), away: String(p.predicted_away), locked: !!p.locked_at, status: 'saved' }
    }
    return map
  })

  // Participantes seleccionados para comparar (máx 2)
  const [selected, setSelected] = useState<string[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

const router = useRouter()

  // Realtime — actualiza automáticamente cuando cambia el marcador
  useEffect(() => {
    const supabaseRT = createClient()
    const channel = supabaseRT
      .channel('matches-changes')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
      }, () => {
        router.refresh()
      })
      .subscribe()

    return () => { supabaseRT.removeChannel(channel) }
  }, [router])
  
  // Mapas de acceso rápido
  const scoreMap = Object.fromEntries(myScores.map(s => [s.match_id, s]))
  const otherPredMap: Record<string, Record<string, OtherPred>> = {}
  for (const p of otherPredictions) {
    if (!otherPredMap[p.match_id]) otherPredMap[p.match_id] = {}
    otherPredMap[p.match_id][p.pool_member_id] = p
  }

  // Autoguardado
  const save = useCallback(async (matchId: string, home: string, away: string) => {
    const h = parseInt(home), a = parseInt(away)
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return
    setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], status: 'saving' } }))
    try {
      const { error } = await (supabase.rpc as any)('save_prediction', {
        p_pool_member_id: myMember.id, p_match_id: matchId,
        p_predicted_home: h, p_predicted_away: a,
      })
      if (error) throw error
      setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], status: 'saved' } }))
    } catch {
      setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], status: 'error' } }))
    }
  }, [myMember.id, supabase])

  const handleChange = useCallback((matchId: string, field: 'home' | 'away', value: string) => {
    setPreds(prev => {
      const cur = prev[matchId] ?? { home: '', away: '', locked: false, status: 'idle' as SaveStatus }
      return { ...prev, [matchId]: { ...cur, [field]: value, status: 'idle' } }
    })
    if (timers.current[matchId]) clearTimeout(timers.current[matchId])
    timers.current[matchId] = setTimeout(() => {
      setPreds(prev => {
        const p = prev[matchId]; if (!p) return prev
        const nh = field === 'home' ? value : p.home
        const na = field === 'away' ? value : p.away
        if (nh !== '' && na !== '') save(matchId, nh, na)
        return prev
      })
    }, 800)
  }, [save])

  // Selector de participantes
  function toggleMember(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id)
      : prev.length < 4 ? [...prev, id]
      : prev
    )
  }

  // Deduplicar y agrupar por fecha
  const seen = new Set<string>()
  const uniqueMatches = matches.filter(m => { if (seen.has(m.id)) return false; seen.add(m.id); return true })
  const byDate = new Map<string, Match[]>()
  for (const m of uniqueMatches) {
    const cot = utcToCot(m.kickoff_at)
    const key = cot.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(m)
  }

  const savedCount = Object.values(preds).filter(p => p.status === 'saved').length
  const pending    = uniqueMatches.filter(m => !isPredictionLocked(m.kickoff_at) && preds[m.id]?.status !== 'saved').length
  const visibleMembers = allMembers.filter(m => selected.includes(m.id))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Resumen */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <StatPill value={savedCount} label="guardados" color="var(--color-green)" />
        <StatPill value={pending} label="pendientes" color={pending > 0 ? 'var(--color-gold)' : 'var(--color-text-muted)'} />
      </div>

      {/* Selector de participantes para comparar */}
      {allMembers.length > 0 && (
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '14px 18px' }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '10px', letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 600 }}>
            Comparar con (máx. 4):
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allMembers.map((m: Member) => {
              const isSelected = selected.includes(m.id)
              const isDisabled = !isSelected && selected.length >= 2
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  disabled={isDisabled}
                  style={{
                    padding: '5px 14px',
                    borderRadius: '99px',
                    border: `1px solid ${isSelected ? 'var(--color-green)' : 'var(--color-border)'}`,
                    background: isSelected ? 'var(--color-green-deep)' : 'transparent',
                    color: isSelected ? 'var(--color-green)' : isDisabled ? 'var(--color-text-subtle)' : 'var(--color-text-muted)',
                    fontSize: '0.875rem',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {m.display_name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Partidos por fecha */}
      {[...byDate.entries()].map(([dateLabel, dayMatches]) => (
        <section key={dateLabel}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', padding: '8px 0', marginBottom: '6px', borderBottom: '1px solid var(--color-border)', textTransform: 'capitalize' }}>
            {dateLabel}
          </div>

          <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {dayMatches.map((match, i) => {
              const locked    = isPredictionLocked(match.kickoff_at) || !!preds[match.id]?.locked
              const isVisible = ['live','extra_time','penalties','finished'].includes(match.status)
              const timeLeft  = timeUntilLock(match.kickoff_at)
              const pred      = preds[match.id]
              const score     = scoreMap[match.id]
              const hasScore  = match.home_score !== null && match.away_score !== null
              const isLast    = i === dayMatches.length - 1
              const cotTime   = utcToCot(match.kickoff_at)
              const timeStr   = cotTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' })
              const status    = pred?.status ?? 'idle'
              const isLive    = ['live','extra_time','penalties'].includes(match.status)

              const inputStyle = (val: string) => ({
                width: '44px', height: '36px', textAlign: 'center' as const,
                background: 'var(--color-bg-elevated)',
                border: `1px solid ${val !== '' ? 'rgba(34,197,94,0.5)' : 'var(--color-border)'}`,
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text)',
                fontFamily: 'var(--font-display)',
                fontSize: '1.2rem',
                outline: 'none',
              })

              return (
                <div key={match.id} style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--color-border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  opacity: locked && !isVisible ? 0.65 : 1,
                }}>

                  {!locked && timeLeft && (
                    <div style={{ padding: '3px 14px 0', fontSize: '0.7rem', color: 'var(--color-gold)' }}>
                      ⏱ Cierra en {timeLeft}
                    </div>
                  )}

                  {/* Grid: bandera | código | real | mi pred | [otros...] | pts | estado */}
                  {/* Fila local */}
                  <div style={{ display: 'grid', gridTemplateColumns: `24px 52px 40px 48px ${score ? '36px' : ''} ${selected.map(() => '48px').join(' ')} 1fr`, alignItems: 'center', padding: '10px 14px 3px', gap: '0 8px' }}>
                    <FlagImg name={match.home_team} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.04em' }}>{teamCode(match.home_team)}</span>

                    {/* Marcador real */}
                    <div style={{ textAlign: 'center' }}>
                      {hasScore
                        ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: isLive ? 'var(--color-live)' : 'var(--color-text)' }}>{match.home_score}</span>
                        : <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>{timeStr}</span>
                      }
                    </div>

                    {/* Mi pronóstico */}
                    <div style={{ textAlign: 'center' }}>
                      {locked
                        ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>{pred?.home ?? '–'}</span>
                        : <input type="number" min={0} max={20} value={pred?.home ?? ''} placeholder="–" onChange={e => handleChange(match.id, 'home', e.target.value)} style={inputStyle(pred?.home ?? '')} />
                      }
                    </div>

                    {/* Puntos — antes de los otros participantes */}
                    {score && (
                      <div style={{ textAlign: 'center', gridRow: 'span 1' }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: score.points_earned > 0 ? 'var(--color-green)' : 'var(--color-text-subtle)' }}>
                          {score.points_earned}
                        </span>
                      </div>
                    )}

                    {/* Pronósticos de otros (solo si visible) */}
                    {selected.map(memberId => {
                      const op = otherPredMap[match.id]?.[memberId]
                      return (
                        <div key={memberId} style={{ textAlign: 'center' }}>
                          {isVisible && op
                            ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>{op.predicted_home}</span>
                            : <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>–</span>
                          }
                        </div>
                      )
                    })}

                    {/* Horario / estado */}
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingLeft: '4px' }}>
                      {isLive && <span style={{ color: 'var(--color-live)', fontWeight: 600 }}>● VIVO</span>}
                      {locked && !isLive && match.status !== 'finished' && '🔒'}
                    </div>
                  </div>

                  {/* Fila visitante */}
                  <div style={{ display: 'grid', gridTemplateColumns: `24px 52px 40px 48px ${score ? '36px' : ''} ${selected.map(() => '48px').join(' ')} 1fr`, alignItems: 'center', padding: '3px 14px 10px', gap: '0 8px' }}>
                    <FlagImg name={match.away_team} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.04em' }}>{teamCode(match.away_team)}</span>

                    {/* Marcador real */}
                    <div style={{ textAlign: 'center' }}>
                      {hasScore
                        ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: isLive ? 'var(--color-live)' : 'var(--color-text)' }}>{match.away_score}</span>
                        : <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>–</span>
                      }
                    </div>

                    {/* Mi pronóstico */}
                    <div style={{ textAlign: 'center' }}>
                      {locked
                        ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>{pred?.away ?? '–'}</span>
                        : <input type="number" min={0} max={20} value={pred?.away ?? ''} placeholder="–" onChange={e => handleChange(match.id, 'away', e.target.value)} style={inputStyle(pred?.away ?? '')} />
                      }
                    </div>

                    {/* Espacio para puntos */}
                    {score && <div />}

                    {/* Pronósticos de otros */}
                    {selected.map(memberId => {
                      const op = otherPredMap[match.id]?.[memberId]
                      return (
                        <div key={memberId} style={{ textAlign: 'center' }}>
                          {isVisible && op
                            ? <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--color-text-muted)' }}>{op.predicted_away}</span>
                            : <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>–</span>
                          }
                        </div>
                      )
                    })}

                    {/* Estado de guardado */}
                    <div style={{ fontSize: '0.7rem', paddingLeft: '4px',
                      color: status === 'saved' ? 'var(--color-green)' : status === 'saving' ? 'var(--color-text-muted)' : status === 'error' ? 'var(--color-error)' : 'transparent'
                    }}>
                      {status === 'saved' ? '✓ guardado' : status === 'saving' ? 'guardando…' : status === 'error' ? 'error' : '.'}
                    </div>
                  </div>

                  {/* Leyenda de columnas (solo primer partido del día) */}
                  {i === 0 && (selected.length > 0 || true) && (
                    <div style={{ display: 'grid', gridTemplateColumns: `24px 52px 40px 48px ${score ? '36px' : ''} ${selected.map(() => '48px').join(' ')} 1fr`, padding: '0 14px 6px', gap: '0 8px' }}>
                      <div /><div />
                      <div style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--color-text-subtle)', letterSpacing: '0.04em' }}>REAL</div>
                      <div style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--color-green)', letterSpacing: '0.04em' }}>YO</div>
                      {score && <div style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--color-text-subtle)' }}>PTS</div>}
                      {visibleMembers.map(m => (
                        <div key={m.id} style={{ textAlign: 'center', fontSize: '0.6rem', color: 'var(--color-text-muted)', letterSpacing: '0.04em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.display_name.split(' ')[0].slice(0,6).toUpperCase()}
                        </div>
                      ))}
                      <div />
                    </div>
                  )}
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
