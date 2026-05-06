// src/app/(app)/admin/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { count: poolCount },
    { count: userCount },
    { count: predCount },
    { data: liveMatches },
  ] = await Promise.all([
    supabase.from('pools').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('predictions').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('id, home_team, away_team, home_score, away_score, status')
      .in('status', ['live', 'extra_time', 'penalties'])
      .limit(10),
  ])

  const stats = [
    { label: 'Pollas activas',     value: poolCount ?? 0,  color: 'var(--color-green)' },
    { label: 'Usuarios',           value: userCount ?? 0,  color: 'var(--color-text)' },
    { label: 'Pronósticos totales',value: predCount ?? 0,  color: 'var(--color-text)' },
    { label: 'Partidos en vivo',   value: liveMatches?.length ?? 0, color: 'var(--color-live)' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            padding: '20px',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', color: s.color, lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Partidos en vivo */}
      {liveMatches && liveMatches.length > 0 && (
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1rem',
            letterSpacing: '0.08em',
            color: 'var(--color-live)',
            marginBottom: '14px',
          }}>
            ● EN VIVO AHORA
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {liveMatches.map(m => (
              <div key={m.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontSize: '0.9rem' }}>
                  {m.home_team} vs {m.away_team}
                </span>
                <span style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  color: 'var(--color-live)',
                }}>
                  {m.home_score} – {m.away_score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
