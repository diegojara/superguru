'use client'
// src/app/(app)/dashboard/JoinByLinkButton.tsx

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function JoinByLinkButton() {
  const [open, setOpen] = useState(false)
  const [url, setUrl]   = useState('')
  const router          = useRouter()

  function handleGo() {
    try {
      const urlObj = new URL(url.trim())
      const match  = urlObj.pathname.match(/\/pools\/([a-f0-9-]{36})/)
      if (match) {
        router.push(`/pools/${match[1]}`)
        setOpen(false)
      } else {
        alert('Enlace no válido. Debe ser un enlace de Polla de SuperGurú.')
      }
    } catch {
      // Intentar como path directo
      const match = url.trim().match(/\/pools\/([a-f0-9-]{36})/)
      if (match) {
        router.push(`/pools/${match[1]}`)
        setOpen(false)
      } else {
        alert('Enlace no válido.')
      }
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '9px 18px', background: 'transparent',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-md)',
          fontFamily: 'var(--font-body)', fontSize: '0.875rem',
          cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border-hover)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--color-border)'
          ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--color-text-muted)'
        }}
      >
        Tengo un enlace
      </button>

      {open && (
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
            padding: '28px', maxWidth: '420px', width: '100%',
            boxShadow: 'var(--shadow-card)',
          }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem', letterSpacing: '0.05em', marginBottom: '10px',
            }}>
              UNIRME A UNA POLLA
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '16px', lineHeight: 1.6 }}>
              Pega el enlace de la Polla que te compartieron:
            </p>
            <input
              type="text"
              className="input"
              placeholder="https://superguru.vercel.app/pools/..."
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGo()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button
                className="btn-ghost"
                onClick={() => { setOpen(false); setUrl('') }}
                style={{ flex: 1 }}
              >
                Cancelar
              </button>
              <button
                className="btn-primary"
                onClick={handleGo}
                disabled={!url.trim()}
                style={{ flex: 1 }}
              >
                Ir a la Polla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
