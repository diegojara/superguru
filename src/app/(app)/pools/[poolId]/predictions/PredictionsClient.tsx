'use client'
// src/app/(app)/pools/[poolId]/predictions/PredictionsClient.tsx
// Panel de ingreso de pronósticos.
// Mismo layout visual que la vista de partidos:
// bandera | código | [input pronóstico] | [horario/estado] agrupado por fecha.

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { utcToCot, isPredictionLocked, timeUntilLock } from '@/lib/utils/datetime'
import type { Match, Prediction } from '@/types/database'

// Reutilizamos las mismas funciones de la vista de partidos
function teamCode(name: string): string {
  const o: Record<string, string> = {
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
  return o[name] ?? name.slice(0, 3).toUpperCase()
}

function flagEmoji(name: string): string {
  const f: Record<string, string> = {
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

type PredMap = Record<string, { home: string; away: string; locked: boolean; saved: boolean }>

export default function PredictionsClient({
  poolMemberId, matches, initialPredictions, otherMemberships,
}: Props) {
  const supabase = createClient()

  const [preds, setPreds] = useState<PredMap>(() => {
    const map: PredMap = {}
    for (const p of initialPredictions) {
      map[p.match_id] = {
        home: String(p.predicted_home),
        away: String(p.predicted_away),
        locked: !!p.locked_at,
        saved: true,
      }
    }
    return map
  })

  const [saving,           setSaving]           = useState<Record<string, boolean>>({})
  const [errors,           setErrors]           = useState<Record<string, string>>({})
  const [replicateMatchId, setReplicateMatchId] = useState<string | null>(null)

  const savePrediction = useCallback(async (matchId: string, replicate: boolean) => {
    const p = preds[matchId]
    if (!p) return
    const home = parseInt(p.home)
    const away = parseInt(p.away)
    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setErrors(prev => ({ ...prev, [matchId]: 'Ingresa valores válidos.' }))
      return
    }
    setSaving(prev => ({ ...prev, [matchId]: true }))
    setErrors(prev => ({ ...prev, [matchId]: '' }))
    try {
      const { error } = await supabase.from('predictions').upsert({
        pool_member_id: poolMemberId,
        match_id: matchId,
        predicted_home: home,
        predicted_away: away,
        submitted_at: new Date().toISOString(),
      }, { onConflict: 'pool_member_id,match_id' })
      if (error) throw error
      if (replicate) {
        await supabase.rpc('replicate_prediction', {
          p_source_pool_member_id: poolMemberId,
          p_match_id: matchId,
          p_predicted_home: home,
          p_predicted_away: away,
        })
      }
      setPreds(prev => ({ ...prev, [matchId]: { ...prev[matchId], saved: true } }))
      setReplicateMatchId(null)
    } catch {
      setErrors(prev => ({ ...prev, [matchId]: 'No se pudo guardar.' }))
    } finally {
      setSaving(prev => ({ ...prev, [matchId]: false }))
    }
  }, [preds, poolMemberId, supabase])

  // Agrupar por fecha COT
  const byDate = new Map<string, Match[]>()
  for (const m of matches) {
    const cot = utcToCot(m.kickoff_at)
    const dateKey = cot.toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    })
    if (!byDate.has(dateKey)) byDate.set(dateKey, [])
    byDate.get(dateKey)!.push(m)
  }

  const pending = matches.filter(m => !isPredictionLocked(m.kickoff_at) && !preds[m.id]?.saved).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Resumen rápido */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <StatPill value={Object.values(preds).filter(p => p.saved).length} label="guardados" color="var(--color-green)" />
        <StatPill value={pending} label="pendientes" color={pending > 0 ? 'var(--color-gold)' : 'var(--color-text-muted)'} />
      </div>

      {/* Leyenda de columnas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '32px 52px 1fr 48px 48px 44px',
        gap: '0 8px',
        padding: '6px 14px',
        background: 'var(--color-green-dim)',
        borderRadius: 'var(--radius-md)',
      }}>
        {['', '', '', 'Real', 'Pron.', ''].map((h, i) => (
          <span key={i} style={{
            fontSize: '0.7rem', fontWeight: 700, color: '#dcfce7',
            textAlign: 'center', letterSpacing: '0.04em',
          }}>
            {h}
          </span>
        ))}
      </div>

      {/* Partidos agrupados por fecha */}
      {[...byDate.entries()].map(([dateLabel, dayMatches]) => (
        <section key={dateLabel}>
          <div style={{
            fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)',
            padding: '8px 0', marginBottom: '6px',
            borderBottom: '1px solid var(--color-border)',
            textTransform: 'capitalize',
          }}>
            {dateLabel}
          </div>

          <div style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {dayMatches.map((match, i) => {
              const locked   = isPredictionLocked(match.kickoff_at) || !!preds[match.id]?.locked
              const timeLeft = timeUntilLock(match.kickoff_at)
              const pred     = preds[match.id]
              const hasScore = match.home_score !== null && match.away_score !== null
              const isLast   = i === dayMatches.length - 1

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
                    opacity: locked ? 0.7 : 1,
                  }}
                >
                  {/* Indicador de cierre (encima del bloque) */}
                  {!locked && timeLeft && (
                    <div style={{
                      padding: '3px 14px 0',
                      fontSize: '0.7rem',
                      color: 'var(--color-gold)',
                    }}>
                      ⏱ Cierra en {timeLeft}
                    </div>
                  )}

                  {/* Fila local */}
                  <PredRow
                    flag={flagEmoji(match.home_team)}
                    code={teamCode(match.home_team)}
                    realScore={match.home_score}
                    predValue={pred?.home ?? ''}
                    isTop={true}
                    locked={locked}
                    timeStr={timeStr}
                    hasScore={hasScore}
                    isSaved={!!pred?.saved}
                    isSaving={!!saving[match.id]}
                    showSave={true}
                    onSave={() => {
                      if (otherMemberships.length > 0 && pred?.home && pred?.away) {
                        setReplicateMatchId(match.id)
                      } else {
                        savePrediction(match.id, false)
                      }
                    }}
                    canSave={!!(pred?.home !== '' && pred?.away !== '')}
                    onChange={val => setPreds(prev => ({
                      ...prev,
                      [match.id]: { home: val, away: prev[match.id]?.away ?? '', locked: false, saved: false },
                    }))}
                  />

                  {/* Fila visitante */}
                  <PredRow
                    flag={flagEmoji(match.away_team)}
                    code={teamCode(match.away_team)}
                    realScore={match.away_score}
                    predValue={pred?.away ?? ''}
                    isTop={false}
                    locked={locked}
                    timeStr=""
                    hasScore={hasScore}
                    isSaved={!!pred?.saved}
                    isSaving={false}
                    showSave={false}
                    onSave={() => {}}
                    canSave={false}
                    onChange={val => setPreds(prev => ({
                      ...prev,
                      [match.id]: { home: prev[match.id]?.home ?? '', away: val, locked: false, saved: false },
                    }))}
                  />

                  {errors[match.id] && (
                    <div style={{ padding: '2px 14px 6px' }}>
                      <p className="error-message">{errors[match.id]}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* Modal de replicación */}
      {replicateMatchId && (
        <ReplicateModal
          memberships={otherMemberships}
          onConfirm={replicate => savePrediction(replicateMatchId, replicate)}
          onClose={() => setReplicateMatchId(null)}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fila de pronóstico — refleja el mismo grid que la vista de partidos
// ---------------------------------------------------------------------------
function PredRow({
  flag, code, realScore, predValue, isTop, locked,
  timeStr, hasScore, isSaved, isSaving, showSave,
  onSave, canSave, onChange,
}: {
  flag: string; code: string; realScore: number | null; predValue: string
  isTop: boolean; locked: boolean; timeStr: string; hasScore: boolean
  isSaved: boolean; isSaving: boolean; showSave: boolean
  onSave: () => void; canSave: boolean; onChange: (v: string) => void
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 52px 1fr 48px 48px 44px',
      alignItems: 'center',
      padding: isTop ? '10px 14px 4px' : '4px 14px 10px',
      gap: '0 8px',
    }}>
      <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>{flag}</span>

      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)', letterSpacing: '0.04em' }}>
        {code}
      </span>

      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
        {isTop && timeStr}
        {isTop && locked && (
          <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }}>🔒</span>
        )}
      </div>

      {/* Marcador real */}
      <div style={{ textAlign: 'center' }}>
        {hasScore ? (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text)', lineHeight: 1 }}>
            {realScore}
          </span>
        ) : (
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)' }}>–</span>
        )}
      </div>

      {/* Input de pronóstico */}
      <div style={{ textAlign: 'center' }}>
        {locked ? (
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-text-muted)', lineHeight: 1 }}>
            {predValue !== '' ? predValue : '–'}
          </span>
        ) : (
          <input
            type="number"
            min={0}
            max={20}
            value={predValue}
            onChange={e => onChange(e.target.value)}
            style={{
              width: '44px',
              height: '38px',
              textAlign: 'center',
              background: 'var(--color-bg-elevated)',
              border: `1px solid ${predValue !== '' && !isSaved ? 'var(--color-green)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-sm)',
              color: 'var(--color-text)',
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              outline: 'none',
              transition: 'border-color 0.15s',
            }}
            placeholder="–"
          />
        )}
      </div>

      {/* Botón guardar (solo en fila superior) */}
      <div style={{ textAlign: 'center' }}>
        {showSave && !locked && (
          <button
            onClick={onSave}
            disabled={isSaving || !canSave}
            title="Guardar"
            style={{
              width: '36px',
              height: '36px',
              background: isSaved ? 'var(--color-green-deep)' : 'var(--color-green)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              color: isSaved ? 'var(--color-green)' : '#052e16',
              cursor: !canSave ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: !canSave ? 0.4 : 1,
              transition: 'background 0.2s, opacity 0.2s',
            }}
          >
            {isSaving ? '…' : isSaved ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M17 21v-8H7v8M7 3v5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            )}
          </button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function StatPill({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      padding: '8px 16px',
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-md)',
      display: 'flex',
      alignItems: 'baseline',
      gap: '6px',
    }}>
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{label}</span>
    </div>
  )
}

// ---------------------------------------------------------------------------
function ReplicateModal({
  memberships, onConfirm, onClose,
}: {
  memberships: OtherMembership[]
  onConfirm: (replicate: boolean) => void
  onClose: () => void
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '16px',
    }}>
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px', maxWidth: '360px', width: '100%',
        boxShadow: 'var(--shadow-card)',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem', letterSpacing: '0.05em', marginBottom: '10px',
        }}>
          ¿REPLICAR EN OTRAS POLLAS?
        </h3>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '14px', lineHeight: 1.6 }}>
          También estás inscrito en estas Pollas con este partido:
        </p>
        <ul style={{ listStyle: 'none', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {memberships.map(m => (
            <li key={m.id} style={{
              padding: '8px 12px',
              background: 'var(--color-bg-elevated)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
            }}>
              {m.pools?.name ?? m.pool_id}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-ghost" onClick={() => { onConfirm(false); onClose() }} style={{ flex: 1 }}>
            Solo aquí
          </button>
          <button className="btn-primary" onClick={() => { onConfirm(true); onClose() }} style={{ flex: 1 }}>
            Replicar en todas
          </button>
        </div>
      </div>
    </div>
  )
}
