// src/app/(app)/admin/scoring/page.tsx
import { createClient } from '@/lib/supabase/server'
import ScoringConfigClient from './ScoringConfigClient'

export default async function AdminScoringPage() {
  const supabase = await createClient()
  const { data: configs } = await supabase.from('scoring_config').select('*').order('stage').order('tier') as any
  const { data: startedMatch } = await supabase.from('matches').select('id').neq('status', 'scheduled').limit(1).maybeSingle() as any
  const isLocked = !!startedMatch

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {isLocked && (
        <div style={{ padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-gold)' }}>
          🔒 El torneo ya ha comenzado. La configuración de puntuación está bloqueada.
        </div>
      )}
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
        Modifica los puntos por criterio y ronda. Solo disponible antes del inicio del torneo.
      </p>
      <ScoringConfigClient configs={configs ?? []} isLocked={isLocked} />
    </div>
  )
}
