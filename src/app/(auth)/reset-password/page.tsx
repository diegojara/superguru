// src/app/(auth)/reset-password/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking]   = useState(true)

  useEffect(() => {
    // Verificar que hay una sesión de recuperación válida
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true)
      }
      setChecking(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password })
      if (err) throw err
      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    } catch (err: any) {
      setError(err.message ?? 'No se pudo actualizar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-hex-pattern" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div className="animate-fade-in" style={{ marginBottom: '40px', textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 3.5rem)', letterSpacing: '0.05em', color: 'var(--color-text)', lineHeight: 1 }}>
          SUPER<span style={{ color: 'var(--color-green)' }}>GURÚ</span>
        </div>
        <div style={{ fontSize: '0.75rem', letterSpacing: '0.2em', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '6px' }}>
          Mundial 2026
        </div>
      </div>

      <div className="animate-fade-up" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '36px 32px', boxShadow: 'var(--shadow-card), var(--shadow-green)' }}>

          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', letterSpacing: '0.06em', marginBottom: '6px' }}>
            NUEVA CONTRASEÑA
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '28px' }}>
            Ingresa tu nueva contraseña
          </p>

          {checking ? (
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>Verificando...</p>
          ) : !validSession ? (
            <div>
              <p style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginBottom: '16px' }}>
                El link de recuperación no es válido o ya expiró.
              </p>
              <Link href="/login" style={{ color: 'var(--color-green)', textDecoration: 'none', fontSize: '0.875rem' }}>
                Volver al inicio de sesión
              </Link>
            </div>
          ) : success ? (
            <div style={{ padding: '14px', background: 'var(--color-green-deep)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--color-green)', fontSize: '0.9rem' }}>
              ✓ Contraseña actualizada. Redirigiendo...
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div>
                  <label className="label">Nueva contraseña</label>
                  <input
                    type="password" className="input"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label">Confirmar contraseña</label>
                  <input
                    type="password" className="input"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                </div>

                {error && (
                  <div style={{ padding: '10px 14px', background: 'var(--color-error-bg)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', color: 'var(--color-error)' }}>
                    {error}
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={loading || !password || !confirm}>
                  {loading ? 'Guardando…' : 'Guardar contraseña'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
