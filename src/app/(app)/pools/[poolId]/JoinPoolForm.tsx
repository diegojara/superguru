'use client'
// src/app/(app)/pools/[poolId]/JoinPoolForm.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Props {
  poolId: string
  userId: string
  inviteCode: string  // código esperado (en mayúsculas)
}

export default function JoinPoolForm({ poolId, userId, inviteCode }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [displayName, setDisplayName] = useState('')
  const [code, setCode]               = useState('')
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!displayName.trim()) {
      setError('Ingresa tu alias.')
      return
    }

    if (code.trim().toUpperCase() !== inviteCode.toUpperCase()) {
      setError('Código de invitación incorrecto.')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await (supabase.from('pool_members') as any).insert({
        pool_id:      poolId,
        user_id:      userId,
        display_name: displayName.trim(),
      })

      if (err) {
        if (err.code === '23505') setError('Ya estás inscrito en esta Polla.')
        else throw err
        return
      }

      router.refresh()
    } catch {
      setError('No se pudo inscribir. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-xl)',
      padding: '32px',
      boxShadow: 'var(--shadow-card), var(--shadow-green)',
    }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', letterSpacing: '0.06em', marginBottom: '8px' }}>
        ÚNETE A LA POLLA
      </h2>
      <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>
        Ingresa el código de invitación y elige tu alias.
      </p>

      <form onSubmit={handleJoin} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Código de invitación */}
          <div>
            <label htmlFor="code" className="label">Código de invitación</label>
            <input
              id="code"
              type="text"
              className={`input${error && error.includes('Código') ? ' error' : ''}`}
              placeholder="Ej: POLLOS2026"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={20}
              disabled={loading}
              autoFocus
              style={{ letterSpacing: '0.1em', fontWeight: 600 }}
            />
          </div>

          {/* Alias */}
          <div>
            <label htmlFor="displayName" className="label">Tu alias en esta Polla</label>
            <input
              id="displayName"
              type="text"
              className={`input${error && error.includes('alias') ? ' error' : ''}`}
              placeholder="Ej: El Crack, Messi Fan, Tigre..."
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              maxLength={40}
              disabled={loading}
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              {displayName.length}/40
            </p>
          </div>

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'var(--color-error-bg)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.875rem',
              color: 'var(--color-error)',
            }}>
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading || !displayName.trim() || !code.trim()}>
            {loading ? 'Inscribiendo…' : 'Unirme a la Polla'}
          </button>
        </div>
      </form>
    </div>
  )
}
