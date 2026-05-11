'use client'
// src/app/(app)/pools/new/NewPoolForm.tsx

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const WC_START = '2026-06-11'
const WC_END   = '2026-07-19'

const STAGES = [
  { value: 'group', label: 'Fase de grupos',   dates: '11 Jun – 28 Jun' },
  { value: 'r32',   label: '16avos de final',  dates: '28 Jun – 4 Jul'  },
  { value: 'r16',   label: 'Octavos de final', dates: '4 Jul – 7 Jul'   },
  { value: 'qf',    label: 'Cuartos de final', dates: '9 Jul – 12 Jul'  },
  { value: 'sf',    label: 'Semifinales',       dates: '14 Jul – 15 Jul' },
  { value: '3rd',   label: 'Tercer puesto',    dates: '18 Jul'          },
  { value: 'final', label: 'Final',             dates: '19 Jul'          },
]

type SelectionMode = 'dates' | 'stages' | 'matches'

interface Match {
  id: string
  home_team: string
  away_team: string
  kickoff_at: string
  stage: string
  group_name: string | null
}

export default function NewPoolForm() {
  const router = useRouter()

  // Campos básicos
  const [name, setName]                           = useState('')
  const [welcomeMessage, setWelcomeMessage]       = useState('')
  const [inviteCode, setInviteCode]               = useState('')
  const [includesChampion, setIncludesChampion]   = useState(false)
  const [includesTopScorer, setIncludesTopScorer] = useState(false)

  // Selección de partidos
  const [mode, setMode]             = useState<SelectionMode>('dates')
  const [startsAt, setStartsAt]     = useState(WC_START)
  const [endsAt, setEndsAt]         = useState(WC_END)
  const [selectedStages, setSelectedStages] = useState<string[]>([])
  const [allMatches, setAllMatches] = useState<Match[]>([])
  const [selectedMatches, setSelectedMatches] = useState<string[]>([])
  const [loadingMatches, setLoadingMatches] = useState(false)

  // Estado del formulario
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)

  // Cargar partidos cuando se cambia a modo "por partido"
  useEffect(() => {
    if (mode === 'matches' && allMatches.length === 0) {
      setLoadingMatches(true)
      const supabase = createClient()
      supabase.from('matches').select('id, home_team, away_team, kickoff_at, stage, group_name')
        .order('kickoff_at', { ascending: true })
        .then(({ data }) => {
          setAllMatches((data ?? []) as Match[])
          setLoadingMatches(false)
        })
    }
  }, [mode, allMatches.length])

  function toggleStage(stage: string) {
    setSelectedStages(prev =>
      prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]
    )
  }

  function toggleMatch(id: string) {
    setSelectedMatches(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  function toggleAllMatchesInStage(stage: string) {
    const stageIds = allMatches.filter(m => m.stage === stage).map(m => m.id)
    const allSelected = stageIds.every(id => selectedMatches.includes(id))
    if (allSelected) {
      setSelectedMatches(prev => prev.filter(id => !stageIds.includes(id)))
    } else {
      setSelectedMatches(prev => [...new Set([...prev, ...stageIds])])
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 3)
      e.name = 'El nombre debe tener al menos 3 caracteres.'
    if (!inviteCode.trim())
      e.inviteCode = 'El código de invitación es obligatorio.'
    if (mode === 'dates') {
      if (!startsAt) e.startsAt = 'Selecciona la fecha de inicio.'
      if (!endsAt)   e.endsAt   = 'Selecciona la fecha de fin.'
      if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt))
        e.endsAt = 'La fecha de fin debe ser posterior a la de inicio.'
    }
    if (mode === 'stages' && selectedStages.length === 0)
      e.stages = 'Selecciona al menos una etapa.'
    if (mode === 'matches' && selectedMatches.length === 0)
      e.matches = 'Selecciona al menos un partido.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)
    if (!validate()) return
    setLoading(true)

    try {
      const supabase = createClient()

      // Crear la Polla con fechas placeholder (se actualizan según modo)
      let startsAtUtc = new Date(`${WC_START}T05:00:00Z`).toISOString()
      let endsAtUtc   = new Date(`${WC_END}T23:59:59-05:00`).toISOString()

      if (mode === 'dates') {
        startsAtUtc = new Date(`${startsAt}T05:00:00Z`).toISOString()
        endsAtUtc   = new Date(`${endsAt}T23:59:59-05:00`).toISOString()
      }

      const { data: poolId, error } = await (supabase.rpc as any)('create_pool', {
        p_name:                      name.trim(),
        p_welcome_message:           welcomeMessage.trim() || null,
        p_starts_at:                 startsAtUtc,
        p_ends_at:                   endsAtUtc,
        p_includes_champion_guess:   includesChampion,
        p_includes_top_scorer_guess: includesTopScorer,
        p_invite_code:               inviteCode.trim().toUpperCase(),
      })
      if (error) throw error

      // Agregar partidos según el modo seleccionado
      if (mode === 'dates') {
        await (supabase.rpc as any)('add_pool_matches_by_range', { p_pool_id: poolId })
      } else if (mode === 'stages') {
        // Insertar partidos de las etapas seleccionadas
        const { data: stageMatches } = await supabase
          .from('matches').select('id')
          .in('stage', selectedStages)
        if (stageMatches && stageMatches.length > 0) {
          await (supabase.from('pool_matches') as any).insert(
            stageMatches.map((m: any) => ({ pool_id: poolId, match_id: m.id }))
          )
        }
      } else if (mode === 'matches') {
        if (selectedMatches.length > 0) {
          await (supabase.from('pool_matches') as any).insert(
            selectedMatches.map(id => ({ pool_id: poolId, match_id: id }))
          )
        }
      }

      router.push(`/pools/${poolId}`)
      router.refresh()
    } catch (err) {
      console.error(err)
      setGlobalError('No se pudo crear la Polla. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Agrupar partidos por etapa para la vista de checkboxes
  const matchesByStage = STAGES.map(s => ({
    ...s,
    matches: allMatches.filter(m => m.stage === s.value),
  }))

  const formatMatchDate = (kickoff: string) => {
    const d = new Date(kickoff)
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' })
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <Link href="/dashboard" style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '16px' }}>
          ← Volver
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', letterSpacing: '0.05em', lineHeight: 1, marginBottom: '6px' }}>
          CREAR POLLA
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Serás el administrador. Podrás invitar participantes después.
        </p>
      </div>

      <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-card)' }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>

            {/* Nombre */}
            <div>
              <label htmlFor="name" className="label">Nombre de la Polla *</label>
              <input id="name" type="text" className={`input${errors.name ? ' error' : ''}`}
                placeholder="Ej: Los Cracks de la Oficina"
                value={name} onChange={e => setName(e.target.value)}
                maxLength={80} disabled={loading} />
              {errors.name
                ? <p className="error-message">{errors.name}</p>
                : <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>{name.length}/80</p>
              }
            </div>

            {/* Mensaje de bienvenida */}
            <div>
              <label htmlFor="welcome" className="label">Mensaje de bienvenida</label>
              <textarea id="welcome" className="input"
                placeholder="Mensaje que verán los participantes al entrar (opcional)"
                value={welcomeMessage} onChange={e => setWelcomeMessage(e.target.value)}
                rows={2} maxLength={500} disabled={loading} style={{ resize: 'vertical' }} />
            </div>

            {/* Código de invitación */}
            <div>
              <label htmlFor="inviteCode" className="label">Código de invitación *</label>
              <input id="inviteCode" type="text" className={`input${errors.inviteCode ? ' error' : ''}`}
                placeholder="Ej: AMIGOS2026"
                value={inviteCode} onChange={e => setInviteCode(e.target.value.toUpperCase())}
                maxLength={20} disabled={loading}
                style={{ letterSpacing: '0.1em', fontWeight: 600 }} />
              {errors.inviteCode
                ? <p className="error-message">{errors.inviteCode}</p>
                : <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>Los participantes necesitarán este código para unirse.</p>
              }
            </div>

            {/* Separador */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '22px' }}>
              <p className="label" style={{ marginBottom: '14px' }}>Selección de partidos *</p>

              {/* Radio buttons para el modo */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                {[
                  { value: 'dates',   label: '🗓 Por rango de fechas' },
                  { value: 'stages',  label: '🏆 Por etapa del torneo' },
                  { value: 'matches', label: '⚽ Seleccionar partidos individuales' },
                ].map(opt => (
                  <label key={opt.value} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', padding: '10px 14px',
                    background: mode === opt.value ? 'var(--color-green-deep)' : 'var(--color-bg-elevated)',
                    border: `1px solid ${mode === opt.value ? 'rgba(34,197,94,0.3)' : 'var(--color-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    transition: 'all 0.15s',
                  }}>
                    <input
                      type="radio" name="mode" value={opt.value}
                      checked={mode === opt.value}
                      onChange={() => setMode(opt.value as SelectionMode)}
                      style={{ accentColor: 'var(--color-green)' }}
                    />
                    <span style={{ fontSize: '0.9rem', color: mode === opt.value ? 'var(--color-green)' : 'var(--color-text)' }}>
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Modo: por fechas */}
              {mode === 'dates' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label htmlFor="startsAt" className="label">Inicio *</label>
                    <input id="startsAt" type="date" className={`input${errors.startsAt ? ' error' : ''}`}
                      value={startsAt} min={WC_START} max={WC_END}
                      onChange={e => setStartsAt(e.target.value)} disabled={loading} />
                    {errors.startsAt && <p className="error-message">{errors.startsAt}</p>}
                  </div>
                  <div>
                    <label htmlFor="endsAt" className="label">Fin *</label>
                    <input id="endsAt" type="date" className={`input${errors.endsAt ? ' error' : ''}`}
                      value={endsAt} min={WC_START} max={WC_END}
                      onChange={e => setEndsAt(e.target.value)} disabled={loading} />
                    {errors.endsAt && <p className="error-message">{errors.endsAt}</p>}
                  </div>
                  <p style={{ gridColumn: 'span 2', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-6px' }}>
                    Se agregarán todos los partidos que comiencen dentro de ese rango.
                  </p>
                </div>
              )}

              {/* Modo: por etapa */}
              {mode === 'stages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {errors.stages && <p className="error-message">{errors.stages}</p>}
                  {STAGES.map(s => (
                    <label key={s.value} style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      cursor: 'pointer', padding: '10px 14px',
                      background: selectedStages.includes(s.value) ? 'var(--color-green-deep)' : 'var(--color-bg-elevated)',
                      border: `1px solid ${selectedStages.includes(s.value) ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
                      borderRadius: 'var(--radius-md)',
                      transition: 'all 0.15s',
                    }}>
                      <input
                        type="checkbox"
                        checked={selectedStages.includes(s.value)}
                        onChange={() => toggleStage(s.value)}
                        style={{ accentColor: 'var(--color-green)', width: '16px', height: '16px' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 500, color: selectedStages.includes(s.value) ? 'var(--color-green)' : 'var(--color-text)' }}>
                          {s.label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{s.dates}</div>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {/* Modo: por partido */}
              {mode === 'matches' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {errors.matches && <p className="error-message">{errors.matches}</p>}
                  {loadingMatches ? (
                    <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Cargando partidos…</p>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        {selectedMatches.length} partido{selectedMatches.length !== 1 ? 's' : ''} seleccionado{selectedMatches.length !== 1 ? 's' : ''}
                      </p>
                      {matchesByStage.filter(s => s.matches.length > 0).map(s => (
                        <div key={s.value}>
                          {/* Encabezado de etapa con "seleccionar todos" */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <button
                              type="button"
                              onClick={() => toggleAllMatchesInStage(s.value)}
                              style={{
                                padding: '3px 10px', fontSize: '0.75rem',
                                background: 'transparent',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-text-muted)',
                                cursor: 'pointer',
                              }}
                            >
                              {s.matches.every(m => selectedMatches.includes(m.id)) ? 'Quitar todos' : 'Seleccionar todos'}
                            </button>
                            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', letterSpacing: '0.08em', color: 'var(--color-green)' }}>
                              {s.label}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {s.matches.map(m => {
                              const isSelected = selectedMatches.includes(m.id)
                              return (
                                <label key={m.id} style={{
                                  display: 'flex', alignItems: 'center', gap: '10px',
                                  cursor: 'pointer', padding: '8px 12px',
                                  background: isSelected ? 'var(--color-green-deep)' : 'var(--color-bg-elevated)',
                                  border: `1px solid ${isSelected ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
                                  borderRadius: 'var(--radius-sm)',
                                  transition: 'all 0.15s',
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleMatch(m.id)}
                                    style={{ accentColor: 'var(--color-green)', width: '14px', height: '14px', flexShrink: 0 }}
                                  />
                                  <span style={{ fontSize: '0.85rem', color: isSelected ? 'var(--color-green)' : 'var(--color-text)', flex: 1 }}>
                                    {m.home_team} vs {m.away_team}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                    {formatMatchDate(m.kickoff_at)}
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pronósticos especiales */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '22px' }}>
              <p className="label" style={{ marginBottom: '14px' }}>Pronósticos especiales</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Toggle id="champion" checked={includesChampion} onChange={setIncludesChampion} disabled={loading}
                  label="Campeón del Mundial" description="15 puntos si aciertan el campeón" />
                <Toggle id="topScorer" checked={includesTopScorer} onChange={setIncludesTopScorer} disabled={loading}
                  label="Goleador del Mundial" description="10 puntos si aciertan el máximo goleador" />
              </div>
            </div>

            {/* Error global */}
            {globalError && (
              <div style={{ padding: '10px 14px', background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-error)' }}>
                {globalError}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
              <Link href="/dashboard" style={{ textDecoration: 'none', flex: 1 }}>
                <button type="button" className="btn-ghost" disabled={loading} style={{ width: '100%' }}>Cancelar</button>
              </Link>
              <button type="submit" className="btn-primary" disabled={loading || !name.trim()} style={{ flex: 2 }}>
                {loading ? 'Creando…' : 'Crear Polla'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}

function Toggle({ id, checked, onChange, disabled, label, description }: {
  id: string; checked: boolean; onChange: (v: boolean) => void
  disabled: boolean; label: string; description: string
}) {
  return (
    <label htmlFor={id} style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      padding: '10px 14px',
      background: checked ? 'var(--color-green-deep)' : 'var(--color-bg-elevated)',
      border: `1px solid ${checked ? 'rgba(34,197,94,0.2)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)', transition: 'background 0.2s, border-color 0.2s',
    }}>
      <div style={{ width: '40px', height: '22px', borderRadius: '99px', background: checked ? 'var(--color-green)' : 'var(--color-text-subtle)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '3px', left: checked ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </div>
      <input id={id} type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} style={{ display: 'none' }} />
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>{description}</div>
      </div>
    </label>
  )
}
