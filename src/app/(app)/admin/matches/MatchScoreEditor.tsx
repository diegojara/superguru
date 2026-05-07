'use client'
// src/app/(app)/admin/matches/MatchScoreEditor.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatKickoff } from '@/lib/utils/datetime'
import type { Match, MatchStatus } from '@/types/database'

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: 'scheduled',   label: 'Programado' },
  { value: 'live',        label: 'En vivo' },
  { value: 'extra_time',  label: 'Tiempo extra' },
  { value: 'penalties',   label: 'Penales' },
  { value: 'finished',    label: 'Finalizado' },
]

const STATUS_COLORS: Record<MatchStatus, string> = {
  scheduled:  'var(--color-text-muted)',
  live:       'var(--color-live)',
  extra_time: 'var(--color-gold)',
  penalties:  'var(--color-gold)',
  finished:   'var(--color-text-muted)',
}

export default function MatchScoreEditor({ match }: { match: Match }) {
  const router = useRouter()
  const supabase = createClient()

  const [homeScore, setHomeScore] = useState(String(match.home_score ?? ''))
  const [awayScore, setAwayScore] = useState(String(match.away_score ?? ''))
  const [status, setStatus]       = useState<MatchStatus>(match.status)
  const [wentExtra, setWentExtra] = useState(match.went_to_extra_time)
  const [wentPens, setWentPens]   = useState(match.went_to_penalties)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [saved, setSaved]         = useState(false)

  async function handleSave() {
    const home = parseInt(homeScore)
    const away = parseInt(awayScore)

    if (isNaN(home) || isNaN(away) || home < 0 || away < 0) {
      setError('Ingresa marcadores válidos.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { error: rpcError } = await (supabase.rpc as any)('update_match_score', {
        p_match_id:            match.id,
        p_home_score:          home,
        p_away_score:          away,
        p_status:              status,
        p_went_to_extra_time:  wentExtra,
        p_went_to_penalties:   wentPens,
      })

      if (rpcError) throw rpcError

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const statusColor = STATUS_COLORS[match.status]
  const isLive = ['live', 'extra_time', 'penalties'].includes(match.status)

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: `1px solid ${isLive ? 'rgba(239,68,68,0.2)' : 'var(--color-border)'}`,
      borderRadius: 'var(--radius-md)',
      padding: '14px 18px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
    }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <span style={{ fontSize: '0.9375rem', fontWeight: 500 }}>
          {match.home_team} vs {match.away_team}
        </span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: statusColor }}>
            {STATUS_OPTIONS.find(s => s.value === match.status)?.label}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            {formatKickoff(match.kickoff_at)}
          </span>
        </div>
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>

        {/* Marcador */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="number"
            min={0}
            max={30}
            value={homeScore}
            onChange={e => { setHomeScore(e.target.value); setSaved(false) }}
            className="input"
            style={{ width: '64px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}
            placeholder="–"
          />
          <span style={{ color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>–</span>
          <input
            type="number"
            min={0}
            max={30}
            value={awayScore}
            onChange={e => { setAwayScore(e.target.value); setSaved(false) }}
            className="input"
            style={{ width: '64px', textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}
            placeholder="–"
          />
        </div>

        {/* Estado */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label className="label">Estado</label>
          <select
            value={status}
            onChange={e => { setStatus(e.target.value as MatchStatus); setSaved(false) }}
            className="input"
            style={{ width: 'auto', paddingRight: '32px' }}
          >
            {STATUS_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Flags */}
        <div style={{ display: 'flex', gap: '12px', paddingBottom: '2px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={wentExtra}
              onChange={e => setWentExtra(e.target.checked)}
              style={{ accentColor: 'var(--color-green)' }}
            />
            Tiempo extra
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8125rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={wentPens}
              onChange={e => setWentPens(e.target.checked)}
              style={{ accentColor: 'var(--color-green)' }}
            />
            Penales
          </label>
        </div>

        {/* Guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary"
          style={{
            width: 'auto',
            padding: '10px 20px',
            background: saved ? 'var(--color-green-deep)' : 'var(--color-gold)',
            color: saved ? 'var(--color-green)' : '#000',
          }}
        >
          {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
    </div>
  )
}
