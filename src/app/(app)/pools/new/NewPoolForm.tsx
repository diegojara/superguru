'use client'
// src/app/(app)/pools/new/NewPoolForm.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// Límites del Mundial 2026
const WC_START = '2026-06-11'
const WC_END   = '2026-07-19'

export default function NewPoolForm() {
  const router = useRouter()

  const [name, setName]                         = useState('')
  const [welcomeMessage, setWelcomeMessage]     = useState('')
  const [startsAt, setStartsAt]                 = useState(WC_START)
  const [endsAt, setEndsAt]                     = useState(WC_END)
  const [includesChampion, setIncludesChampion] = useState(false)
  const [includesTopScorer, setIncludesTopScorer] = useState(false)
  const [errors, setErrors]                     = useState<Record<string, string>>({})
  const [globalError, setGlobalError]           = useState<string | null>(null)
  const [loading, setLoading]                   = useState(false)

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 3)
      e.name = 'El nombre debe tener al menos 3 caracteres.'
    if (!startsAt)
      e.startsAt = 'Selecciona la fecha de inicio.'
    if (!endsAt)
      e.endsAt = 'Selecciona la fecha de fin.'
    if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt))
      e.endsAt = 'La fecha de fin debe ser posterior a la de inicio.'
    if (startsAt && new Date(startsAt) < new Date(WC_START))
      e.startsAt = `No puede ser antes del inicio del Mundial (${WC_START}).`
    if (endsAt && new Date(endsAt) > new Date(WC_END))
      e.endsAt = `No puede ser después de la Final del Mundial (${WC_END}).`
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

      // Convertir fechas locales a timestamptz UTC
      // Los inputs date dan "YYYY-MM-DD" — interpretamos como medianoche COT (UTC-5)
      // starts_at = inicio del día en COT = 05:00 UTC
      // ends_at   = fin del día en COT = 04:59:59 UTC del día siguiente
      const startsAtUtc = new Date(`${startsAt}T05:00:00Z`).toISOString()
      const endsAtUtc   = new Date(`${endsAt}T04:59:59Z`).toISOString()

      const { data: poolId, error } = await supabase.rpc('create_pool', {
        p_name:                      name.trim(),
        p_welcome_message:           welcomeMessage.trim() || null,
        p_starts_at:                 startsAtUtc,
        p_ends_at:                   endsAtUtc,
        p_includes_champion_guess:   includesChampion,
        p_includes_top_scorer_guess: includesTopScorer,
      })

      if (error) throw error

      // Agregar automáticamente todos los partidos del rango
      await supabase.rpc('add_pool_matches_by_range', { p_pool_id: poolId })

      router.push(`/pools/${poolId}`)
      router.refresh()
    } catch (err) {
      console.error(err)
      setGlobalError('No se pudo crear la Polla. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '560px', margin: '0 auto' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: '28px' }}>
        <Link
          href="/dashboard"
          style={{
            fontSize: '0.8125rem',
            color: 'var(--color-text-muted)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginBottom: '16px',
          }}
        >
          ← Volver
        </Link>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)',
          letterSpacing: '0.05em',
          lineHeight: 1,
          marginBottom: '6px',
        }}>
          CREAR POLLA
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          Serás el administrador. Podrás invitar participantes después.
        </p>
      </div>

      {/* Card formulario */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px',
        boxShadow: 'var(--shadow-card)',
      }}>
        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* Nombre */}
            <div>
              <label htmlFor="name" className="label">Nombre de la Polla *</label>
              <input
                id="name"
                type="text"
                className={`input${errors.name ? ' error' : ''}`}
                placeholder="Ej: Los Cracks de la Oficina"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={80}
                disabled={loading}
              />
              {errors.name
                ? <p className="error-message">{errors.name}</p>
                : <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                    {name.length}/80
                  </p>
              }
            </div>

            {/* Mensaje de bienvenida */}
            <div>
              <label htmlFor="welcome" className="label">Mensaje de bienvenida</label>
              <textarea
                id="welcome"
                className="input"
                placeholder="Escribe un mensaje que verán los participantes al entrar a la Polla (opcional)"
                value={welcomeMessage}
                onChange={e => setWelcomeMessage(e.target.value)}
                rows={3}
                maxLength={500}
                disabled={loading}
                style={{ resize: 'vertical', minHeight: '80px' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                {welcomeMessage.length}/500
              </p>
            </div>

            {/* Fechas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label htmlFor="startsAt" className="label">Inicio *</label>
                <input
                  id="startsAt"
                  type="date"
                  className={`input${errors.startsAt ? ' error' : ''}`}
                  value={startsAt}
                  min={WC_START}
                  max={WC_END}
                  onChange={e => setStartsAt(e.target.value)}
                  disabled={loading}
                />
                {errors.startsAt && <p className="error-message">{errors.startsAt}</p>}
              </div>
              <div>
                <label htmlFor="endsAt" className="label">Fin *</label>
                <input
                  id="endsAt"
                  type="date"
                  className={`input${errors.endsAt ? ' error' : ''}`}
                  value={endsAt}
                  min={WC_START}
                  max={WC_END}
                  onChange={e => setEndsAt(e.target.value)}
                  disabled={loading}
                />
                {errors.endsAt && <p className="error-message">{errors.endsAt}</p>}
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '-8px' }}>
              Los partidos dentro de ese rango se agregarán automáticamente.
            </p>

            {/* Separador */}
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
              <p className="label" style={{ marginBottom: '14px' }}>Pronósticos especiales</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <Toggle
                  id="champion"
                  checked={includesChampion}
                  onChange={setIncludesChampion}
                  disabled={loading}
                  label="Campeón del Mundial"
                  description="15 puntos si aciertan el campeón"
                />
                <Toggle
                  id="topScorer"
                  checked={includesTopScorer}
                  onChange={setIncludesTopScorer}
                  disabled={loading}
                  label="Goleador del Mundial"
                  description="10 puntos si aciertan el máximo goleador"
                />
              </div>
            </div>

            {/* Error global */}
            {globalError && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--color-error-bg)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                color: 'var(--color-error)',
              }}>
                {globalError}
              </div>
            )}

            {/* Botones */}
            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
              <Link href="/dashboard" style={{ textDecoration: 'none', flex: 1 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={loading}
                  style={{ width: '100%' }}
                >
                  Cancelar
                </button>
              </Link>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !name.trim()}
                style={{ flex: 2 }}
              >
                {loading ? 'Creando…' : 'Crear Polla'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Toggle helper
// ---------------------------------------------------------------------------
function Toggle({
  id, checked, onChange, disabled, label, description,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled: boolean
  label: string
  description: string
}) {
  return (
    <label
      htmlFor={id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '10px 14px',
        background: checked ? 'var(--color-green-deep)' : 'var(--color-bg-elevated)',
        border: `1px solid ${checked ? 'rgba(34, 197, 94, 0.2)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      {/* Switch visual */}
      <div style={{
        width: '40px',
        height: '22px',
        borderRadius: '99px',
        background: checked ? 'var(--color-green)' : 'var(--color-text-subtle)',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '21px' : '3px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }} />
      </div>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        disabled={disabled}
        style={{ display: 'none' }}
      />
      <div>
        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
          {label}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
          {description}
        </div>
      </div>
    </label>
  )
}
