'use client'
// src/app/(app)/pools/[poolId]/settings/PoolSettingsClient.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: string
  display_name: string
  joined_at: string
  users: { email: string; full_name: string } | null
}

interface Props {
  pool: any
  members: Member[]
  myMember: { id: string; display_name: string } | null
  userId: string
}

export default function PoolSettingsClient({ pool, members, myMember, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const poolUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/pools/${pool.id}`
    : `/pools/${pool.id}`

  // Mensaje de bienvenida
  const [welcome, setWelcome] = useState(pool.welcome_message ?? '')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  // Código de invitación
  const [inviteCode, setInviteCode]       = useState(pool.invite_code ?? '')
  const [savingCode, setSavingCode]       = useState(false)
  const [savedCode, setSavedCode]         = useState(false)
  const [copied, setCopied]               = useState(false)
  const [copiedCode, setCopiedCode]       = useState(false)

  // Inscribirse como participante
  const [displayName, setDisplayName]   = useState('')
  const [joiningSelf, setJoiningSelf]   = useState(false)
  const [joinError, setJoinError]       = useState<string | null>(null)

  async function saveWelcome() {
    setSaving(true); setSaved(false); setError(null)
    try {
      const { error: err } = await (supabase.from('pools') as any)
        .update({ welcome_message: welcome.trim() || null })
        .eq('id', pool.id)
      if (err) throw err
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    } catch { setError('No se pudo guardar.') }
    finally { setSaving(false) }
  }

  async function saveInviteCode() {
    if (!inviteCode.trim()) return
    setSavingCode(true); setSavedCode(false)
    try {
      const { error: err } = await (supabase.from('pools') as any)
        .update({ invite_code: inviteCode.trim().toUpperCase() })
        .eq('id', pool.id)
      if (err) throw err
      setSavedCode(true)
      setTimeout(() => setSavedCode(false), 2500)
      router.refresh()
    } catch { alert('No se pudo guardar el código.') }
    finally { setSavingCode(false) }
  }

  async function copyToClipboard(text: string, type: 'url' | 'code') {
    await navigator.clipboard.writeText(text)
    if (type === 'url') { setCopied(true); setTimeout(() => setCopied(false), 2000) }
    else { setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000) }
  }

  async function joinAsMember() {
    if (!displayName.trim()) return
    setJoiningSelf(true); setJoinError(null)
    try {
      const { error: err } = await (supabase.from('pool_members') as any)
        .insert({ pool_id: pool.id, user_id: userId, display_name: displayName.trim() })
      if (err) {
        if (err.code === '23505') setJoinError('Ya estás inscrito.')
        else throw err
      } else { router.refresh() }
    } catch { setJoinError('No se pudo inscribir.') }
    finally { setJoiningSelf(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px' }}>

      {/* --- Invitar participantes --- */}
      <Section title="Invitar participantes">
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
          Comparte el enlace y el código con los participantes. Solo quien tenga ambos puede unirse.
        </p>

        {/* Enlace */}
        <div style={{ marginBottom: '12px' }}>
          <label className="label">Enlace de la Polla</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              readOnly
              value={poolUrl}
              className="input"
              style={{ flex: 1, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}
            />
            <button
              onClick={() => copyToClipboard(poolUrl, 'url')}
              style={{
                padding: '10px 16px', background: copied ? 'var(--color-green-deep)' : 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                color: copied ? 'var(--color-green)' : 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: '0.8125rem', whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >
              {copied ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Código */}
        <div>
          <label className="label">Código de invitación</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value.toUpperCase())}
              maxLength={20}
              placeholder="Ej: POLLOS2026"
              style={{ flex: 1, letterSpacing: '0.1em', fontWeight: 600, fontSize: '1rem' }}
            />
            <button
              onClick={() => copyToClipboard(inviteCode, 'code')}
              disabled={!inviteCode}
              style={{
                padding: '10px 16px', background: copiedCode ? 'var(--color-green-deep)' : 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                color: copiedCode ? 'var(--color-green)' : 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: '0.8125rem', whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}
            >
              {copiedCode ? '✓ Copiado' : 'Copiar'}
            </button>
            <button
              onClick={saveInviteCode}
              disabled={savingCode || !inviteCode.trim()}
              className="btn-primary"
              style={{ width: 'auto', padding: '10px 16px', whiteSpace: 'nowrap' }}
            >
              {savingCode ? '…' : savedCode ? '✓' : 'Guardar'}
            </button>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '6px' }}>
            Puedes cambiar el código cuando quieras — los participantes ya inscritos no se verán afectados.
          </p>
        </div>

        {/* Mensaje para compartir */}
        {inviteCode && (
          <div style={{
            marginTop: '12px', padding: '12px 16px',
            background: 'var(--color-green-deep)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 1.7,
          }}>
            <p style={{ marginBottom: '4px', fontWeight: 500 }}>Mensaje para compartir:</p>
            <p style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
              "Únete a mi Polla del Mundial en SuperGurú 🏆{'\n'}
              Enlace: {poolUrl}{'\n'}
              Código: {inviteCode}"
            </p>
          </div>
        )}
      </Section>

      {/* --- Mensaje de bienvenida --- */}
      <Section title="Mensaje de bienvenida">
        <textarea
          className="input"
          value={welcome}
          onChange={e => setWelcome(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Visible para todos los participantes al entrar"
          style={{ resize: 'vertical' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '10px' }}>
          <button className="btn-primary" onClick={saveWelcome} disabled={saving} style={{ maxWidth: '160px' }}>
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
              type="text" className="input"
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
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Aún no hay participantes.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {members.map((m, i) => (
              <div key={m.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px',
                background: 'var(--color-bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)', gap: '12px',
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{m.display_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {m.users?.full_name ?? ''} · {m.users?.email ?? ''}
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>#{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </Section>

    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '24px' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.08em', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '16px' }}>
        {title}
      </h2>
      {children}
    </div>
  )
}
