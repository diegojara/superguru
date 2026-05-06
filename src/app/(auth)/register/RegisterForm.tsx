'use client'
// src/app/(auth)/register/RegisterForm.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Step = 'form' | 'success'

export default function RegisterForm() {
  const router = useRouter()
  const [step, setStep]             = useState<Step>('form')
  const [fullName, setFullName]     = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [password2, setPassword2]   = useState('')
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)

  // ---------------------------------------------------------------------------
  // Validación client-side
  // ---------------------------------------------------------------------------
  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim() || fullName.trim().length < 2) {
      newErrors.fullName = 'Ingresa tu nombre completo.'
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Ingresa un correo válido.'
    }
    if (password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres.'
    }
    if (password !== password2) {
      newErrors.password2 = 'Las contraseñas no coinciden.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setGlobalError(null)

    if (!validate()) return

    setLoading(true)
    try {
      const supabase = createClient()

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { full_name: fullName.trim() },
          // Sin emailRedirectTo: Supabase Auth puede estar en modo autoconfirm en staging
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setErrors(prev => ({
            ...prev,
            email: 'Este correo ya está registrado.',
          }))
        } else {
          setGlobalError('Ocurrió un error al crear tu cuenta. Intenta de nuevo.')
        }
        return
      }

      // Si Supabase está en autoconfirm (staging), redirigir directo al dashboard.
      // Si requiere confirmación de email, mostrar pantalla de éxito.
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
        router.refresh()
      } else {
        setStep('success')
      }
    } finally {
      setLoading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Pantalla de éxito (requiere confirmación de email)
  // ---------------------------------------------------------------------------
  if (step === 'success') {
    return (
      <div className="animate-fade-up" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{
          background: 'var(--color-bg-card)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px 32px',
          boxShadow: 'var(--shadow-card), var(--shadow-green)',
          textAlign: 'center',
        }}>
          {/* Ícono check */}
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--color-green-deep)',
            border: '2px solid var(--color-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            animation: 'pulse-green 2s ease infinite',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="var(--color-green)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            letterSpacing: '0.06em',
            marginBottom: '10px',
          }}>
            ¡CUENTA CREADA!
          </h2>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.6,
          }}>
            Te enviamos un correo a{' '}
            <strong style={{ color: 'var(--color-text)' }}>{email}</strong>.
            <br />
            Confirma tu cuenta para ingresar.
          </p>

          <div style={{ marginTop: '28px' }}>
            <Link href="/login" style={{ textDecoration: 'none' }}>
              <button className="btn-primary">Ir al inicio de sesión</button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Formulario
  // ---------------------------------------------------------------------------
  return (
    <div className="animate-fade-up" style={{ width: '100%', maxWidth: '400px' }}>
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
        }}>
          CREAR CUENTA
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-muted)',
          marginBottom: '28px',
        }}>
          Un solo registro para todas tus Pollas
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Nombre completo */}
            <div className="animate-fade-up">
              <label htmlFor="fullName" className="label">Nombre completo</label>
              <input
                id="fullName"
                type="text"
                className={`input${errors.fullName ? ' error' : ''}`}
                placeholder="Juan Pérez"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                autoComplete="name"
                disabled={loading}
              />
              {errors.fullName && <p className="error-message">{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div className="animate-fade-up">
              <label htmlFor="email" className="label">Correo electrónico</label>
              <input
                id="email"
                type="email"
                className={`input${errors.email ? ' error' : ''}`}
                placeholder="tu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={loading}
              />
              {errors.email && <p className="error-message">{errors.email}</p>}
            </div>

            {/* Contraseña */}
            <div className="animate-fade-up">
              <label htmlFor="password" className="label">Contraseña</label>
              <input
                id="password"
                type="password"
                className={`input${errors.password ? ' error' : ''}`}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              {errors.password && <p className="error-message">{errors.password}</p>}
            </div>

            {/* Confirmar contraseña */}
            <div className="animate-fade-up">
              <label htmlFor="password2" className="label">Confirmar contraseña</label>
              <input
                id="password2"
                type="password"
                className={`input${errors.password2 ? ' error' : ''}`}
                placeholder="••••••••"
                value={password2}
                onChange={e => setPassword2(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              {errors.password2 && <p className="error-message">{errors.password2}</p>}
            </div>

            {/* Error global */}
            {globalError && (
              <div className="animate-fade-up" style={{
                padding: '10px 14px',
                background: 'var(--color-error-bg)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                color: 'var(--color-error)',
              }}>
                {globalError}
              </div>
            )}

            {/* Submit */}
            <div className="animate-fade-up">
              <button
                type="submit"
                className="btn-primary"
                disabled={loading || !fullName || !email || !password || !password2}
              >
                {loading ? 'Creando cuenta…' : 'Crear cuenta'}
              </button>
            </div>

          </div>
        </form>
      </div>

      {/* Link a login */}
      <p style={{
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '0.875rem',
        color: 'var(--color-text-muted)',
      }}>
        ¿Ya tienes cuenta?{' '}
        <Link
          href="/login"
          style={{
            color: 'var(--color-green)',
            textDecoration: 'none',
            fontWeight: 500,
          }}
        >
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
