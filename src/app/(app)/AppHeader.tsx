'use client'
// src/app/(app)/AppHeader.tsx

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface AppHeaderProps {
  fullName: string
  isSuperAdmin: boolean
}

export default function AppHeader({ fullName, isSuperAdmin }: AppHeaderProps) {
  const router   = useRouter()
  const pathname = usePathname()
  const [loggingOut, setLoggingOut]       = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  async function handleLogOut() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 14, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          padding: '0 16px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>

          {/* Logo */}
          <Link href="/dashboard" style={{ textDecoration: 'none', flexShrink: 0 }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              letterSpacing: '0.05em',
              color: 'var(--color-text)',
            }}>
              SUPER<span style={{ color: 'var(--color-green)' }}>GURÚ</span>
            </span>
          </Link>

          {/* Nav central */}
          <nav style={{ display: 'flex', gap: '4px', flex: 1, justifyContent: 'center' }}>
            <NavLink href="/dashboard" active={pathname === '/dashboard'}>
              Mis Pollas
            </NavLink>
            {isSuperAdmin && (
              <NavLink href="/admin" active={pathname.startsWith('/admin')}>
                Admin
              </NavLink>
            )}
          </nav>

          {/* Derecha: avatar + contraseña + log off */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

            {/* Avatar */}
            <div
              title={fullName}
              style={{
                width: '34px', height: '34px',
                borderRadius: '50%',
                background: 'var(--color-green-deep)',
                border: '1.5px solid var(--color-green)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 600,
                color: 'var(--color-green)',
                letterSpacing: '0.05em',
                cursor: 'default', flexShrink: 0,
              }}
            >
              {initials}
            </div>

            {/* Cambiar contraseña */}
            <button
              onClick={() => setShowPasswordModal(true)}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                (e.currentTarget).style.color = 'var(--color-text)'
                ;(e.currentTarget).style.borderColor = 'var(--color-border-hover)'
              }}
              onMouseLeave={e => {
                (e.currentTarget).style.color = 'var(--color-text-muted)'
                ;(e.currentTarget).style.borderColor = 'var(--color-border)'
              }}
            >
              Mi cuenta
            </button>

            {/* Log Off */}
            <button
              onClick={handleLogOut}
              disabled={loggingOut}
              style={{
                padding: '6px 14px',
                background: 'transparent',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                cursor: loggingOut ? 'not-allowed' : 'pointer',
                transition: 'color 0.2s, border-color 0.2s',
                opacity: loggingOut ? 0.5 : 1,
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                if (!loggingOut) {
                  (e.currentTarget).style.color = 'var(--color-error)'
                  ;(e.currentTarget).style.borderColor = 'rgba(239, 68, 68, 0.4)'
                }
              }}
              onMouseLeave={e => {
                (e.currentTarget).style.color = 'var(--color-text-muted)'
                ;(e.currentTarget).style.borderColor = 'var(--color-border)'
              }}
            >
              {loggingOut ? 'Saliendo…' : 'Log Off'}
            </button>
          </div>
        </div>
      </header>

      {/* Modal de cambio de contraseña */}
      {showPasswordModal && (
        <PasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------
// Modal de cambio de contraseña
// ---------------------------------------------------------------------------
function PasswordModal({ onClose }: { onClose: () => void }) {
  const supabase = createClient()
  const [current, setCurrent]   = useState('')
  const [newPass, setNewPass]   = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPass.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (newPass !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPass })
      if (err) throw err
      setSuccess(true)
      setTimeout(() => { setSuccess(false); onClose() }, 2000)
    } catch (err: any) {
      setError(err.message ?? 'No se pudo cambiar la contraseña.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200, padding: '16px',
    }}>
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '28px', maxWidth: '380px', width: '100%',
        boxShadow: 'var(--shadow-card)',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.25rem', letterSpacing: '0.05em', marginBottom: '20px',
        }}>
          CAMBIAR CONTRASEÑA
        </h3>

        {success ? (
          <div style={{
            padding: '14px', background: 'var(--color-green-deep)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-green)', textAlign: 'center', fontSize: '0.9rem',
          }}>
            ✓ Contraseña actualizada correctamente
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

              <div>
                <label className="label">Nueva contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Mínimo 8 caracteres"
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div>
                <label className="label">Confirmar nueva contraseña</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={loading}
                />
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px',
                  background: 'var(--color-error-bg)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.875rem', color: 'var(--color-error)',
                }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={onClose}
                  disabled={loading}
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading || !newPass || !confirm}
                  style={{ flex: 1 }}
                >
                  {loading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// NavLink helper
// ---------------------------------------------------------------------------
function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      style={{
        padding: '6px 14px',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.875rem',
        fontWeight: active ? 500 : 400,
        color: active ? 'var(--color-green)' : 'var(--color-text-muted)',
        background: active ? 'var(--color-green-deep)' : 'transparent',
        border: active ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid transparent',
        textDecoration: 'none',
        transition: 'color 0.2s, background 0.2s',
      }}
    >
      {children}
    </Link>
  )
}

