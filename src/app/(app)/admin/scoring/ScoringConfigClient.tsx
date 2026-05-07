'use client'
// src/app/(app)/admin/scoring/ScoringConfigClient.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { STAGE_LABELS } from '@/lib/utils/scoring'
import type { ScoringConfig, MatchStage, ScoringTier } from '@/types/database'

const TIER_LABELS: Record<ScoringTier, string> = {
  exact:       'Exacto',
  partial_win: 'Ganador + goles parciales',
  winner:      'Solo ganador',
  partial:     'Goles parciales',
}

const STAGE_ORDER: MatchStage[] = ['group', 'r32', 'r16', 'qf', 'sf', '3rd', 'final']
const TIER_ORDER: ScoringTier[] = ['exact', 'partial_win', 'winner', 'partial']

interface Props {
  configs: ScoringConfig[]
  isLocked: boolean
}

export default function ScoringConfigClient({ configs, isLocked }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Map stage+tier → points (editable)
  const [points, setPoints] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {}
    for (const c of configs) map[`${c.stage}:${c.tier}`] = c.points
    return map
  })

  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      const updates = configs.map(c => ({
        id:         c.id,
        stage:      c.stage,
        tier:       c.tier,
        points:     points[`${c.stage}:${c.tier}`] ?? c.points,
        updated_at: new Date().toISOString(),
      }))

      const { error: err } = await (supabase.from('scoring_config') as any)
        .upsert(updates, { onConflict: 'stage,tier' })

      if (err) throw err

      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } catch {
      setError('No se pudo guardar la configuración.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Tabla */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, textAlign: 'left' }}>Ronda</th>
              {TIER_ORDER.map(tier => (
                <th key={tier} style={{ ...thStyle, minWidth: '90px' }}>
                  {TIER_LABELS[tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAGE_ORDER.map((stage, i) => (
              <tr key={stage} style={{ background: i % 2 === 0 ? 'var(--color-bg-card)' : 'var(--color-bg-elevated)' }}>
                <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--color-text)' }}>
                  {STAGE_LABELS[stage]}
                </td>
                {TIER_ORDER.map(tier => {
                  const key = `${stage}:${tier}`
                  const val = points[key] ?? 0
                  return (
                    <td key={tier} style={{ ...tdStyle, textAlign: 'center' }}>
                      <input
                        type="number"
                        min={0}
                        max={99}
                        value={val}
                        disabled={isLocked}
                        onChange={e => {
                          const n = parseInt(e.target.value)
                          if (!isNaN(n) && n >= 0) {
                            setPoints(prev => ({ ...prev, [key]: n }))
                            setSaved(false)
                          }
                        }}
                        style={{
                          width: '64px',
                          padding: '6px',
                          textAlign: 'center',
                          background: 'var(--color-bg)',
                          border: '1px solid var(--color-border)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--color-text)',
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.1rem',
                          outline: 'none',
                          opacity: isLocked ? 0.5 : 1,
                        }}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Botón guardar */}
      {!isLocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ maxWidth: '200px', background: 'var(--color-gold)', color: '#000' }}
          >
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: 'var(--color-bg-elevated)',
  color: 'var(--color-text-muted)',
  fontWeight: 600,
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  borderBottom: '1px solid var(--color-border)',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderBottom: '1px solid var(--color-border)',
  color: 'var(--color-text-muted)',
}
