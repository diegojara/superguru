'use client'
// src/app/(auth)/login/LoginForm.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      })

      if (authError) {
        // Mensaje amigable en español
        if (authError.message.includes('Invalid login credentials')) {
          setError('Email o contraseña incorrectos.')
        } else if (authError.message.includes('Email not confirmed')) {
          setError('Debes confirmar tu email antes de ingresar.')
        } else {
          setError('Ocurrió un error. Intenta de nuevo.')
        }
        return
      }

      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="animate-fade-up"
      style={{
        width: '100%',
        maxWidth: '400px',
      }}
    >
      {/* Card */}
      <div style={{
        background: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        padding: '36px 32px',
        boxShadow: 'var(--shadow-card), var(--shadow-green)',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          letterSpacing: '0.06em',
          marginBottom: '6px',
          color: 'var(--color-text)',
        }}>
          BIENVENIDO
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-muted)',
          marginBottom: '28px',
        }}>
          Ingresa a tu cuenta para ver tus Pollas
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Email */}
            <div className="animate-fade-up">
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className={`input${error ? ' error' : ''}`}
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>

            {/* Contraseña */}
            <div className="animate-fade-up">
              <label htmlFor="password" className="label">Contraseña</label>
              <input
                id="password"
                type="password"
                className={`input${error ? ' error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={loading}
              />
            </div>

            {/* Error global */}
            {error && (
              <div className="animate-fade-up" style={{
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

            {/* Submit */}
            <div className="animate-fade-up">
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !email || !password}
              >
                {loading ? 'Ingresando…' : 'Ingresar'}
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Link a registro */}
      <p style={{
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
      }}>
        ¿No tienes cuenta?{' '}
        <Link
          href="/register"
          style={{
            color: 'var(--color-green)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Regístrate aquí
        </Link>
      </p>
    </div>
  )
}
