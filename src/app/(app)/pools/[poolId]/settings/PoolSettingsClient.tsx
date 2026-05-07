'use client'
// src/app/(app)/pools/[poolId]/settings/PoolSettingsClient.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Pool } from '@/types/database'

interface Member {
  id: string
  display_name: string
  joined_at: string
  users: { email: string; full_name: string } | null
}

interface Props {
  pool: Pool
  members: Member[]
  myMember: { id: string; display_name: string } | null
  userId: string
}

export default function PoolSettingsClient({ pool, members, myMember, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  // Editar mensaje de bienvenida
  const [welcome, setWelcome]   = useState(pool.welcome_message ?? '')
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)

  // Inscribirse como participante
  const [displayName, setDisplayName]   = useState('')
  const [joiningSelf, setJoiningSelf]   = useState(false)
  const [joinError, setJoinError]       = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  async function saveWelcome() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const { error: err } = await (supabase.from('pools') as any)
        .update({ welcome_message: welcome.trim() || null })
        .eq('id', pool.id)
      if (err) throw err
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } catch {
      setError('No se pudo guardar.')
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  async function joinAsMember() {
    if (!displayName.trim()) return
    setJoiningSelf(true)
    setJoinError(null)
    try {
      const { error: err } = await (supabase.from('pool_members') as any)
        .insert({ pool_id: pool.id, user_id: userId, display_name: displayName.trim() })
      if (err) {
        if (err.code === '23505') setJoinError('Ya estás inscrito en esta Polla.')
        else throw err
      } else {
        router.refresh()
      }
    } catch {
      setJoinError('No se pudo inscribir. Intenta de nuevo.')
    } finally {
      setJoiningSelf(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '600px' }}>

      {/* --- Mensaje de bienvenida --- */}
      <Section title="Mensaje de bienvenida">
        <textarea
          className="input"
          value={welcome}
          onChange={e => setWelcome(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Visible para todos los participantes al entrar a la Polla"
          style={{ resize: 'vertical' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
          <button
            className="btn-primary"
            onClick={saveWelcome}
            disabled={saving}
            style={{ maxWidth: '160px' }}
          >
            {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
      </Section>

      {/* --- Inscribirme como participante --- */}
      {!myMember && (
        <Section title="Participar en esta Polla">
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '12px' }}>
            Eres admin pero no estás inscrito como participante. Elige un alias para unirte.
          </p>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input"
              placeholder="Tu alias en esta Polla"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={40}
            />
            <button
              className="btn-primary"
              onClick={joinAsMember}
              disabled={joiningSelf || !displayName.trim()}
              style={{ whiteSpace: 'nowrap', width: 'auto', padding: '12px 20px' }}
            >
              {joiningSelf ? 'Uniéndome…' : 'Unirme'}
            </button>
          </div>
          {joinError && <p className="error-message" style={{ marginTop: '8px' }}>{joinError}</p>}
        </Section>
      )}

      {/* --- Participantes --- */}
      <Section title={`Participantes (${members.length})`}>
        {members.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            Aún no hay participantes inscritos.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m, i) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: 'var(--color-bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  gap: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.display_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {m.users?.full_name ?? ''} · {m.users?.email ?? ''}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  color: 'var(--color-text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  #{i + 1}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

    </div>
  )
}

// ---------------------------------------------------------------------------
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '24px',
    }}>
      <h2 style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1rem',
        letterSpacing: '0.08em',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        marginBottom: '16px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
