// src/app/(auth)/layout.tsx
// Layout compartido para /login y /register.
// Fondo oscuro con patrón hexagonal y el logotipo centrado arriba.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-hex-pattern" style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      {/* Logo */}
      <div className="animate-fade-in" style={{
        marginBottom: '40px',
        textAlign: 'center',
      }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 6vw, 3.5rem)',
          letterSpacing: '0.05em',
          color: 'var(--color-text)',
          lineHeight: 1,
        }}>
          SUPER<span style={{ color: 'var(--color-green)' }}>GURÚ</span>
        </div>
        <div style={{
          fontSize: '0.75rem',
          letterSpacing: '0.2em',
          color: 'var(--color-text-muted)',
          textTransform: 'uppercase',
          marginTop: '6px',
        }}>
          Mundial 2026
        </div>
      </div>

      {/* Contenido de la página (formulario) */}
      {children}

      {/* Footer */}
      <p style={{
        marginTop: '40px',
        fontSize: '0.75rem',
        color: 'var(--color-text-subtle)',
        letterSpacing: '0.05em',
      }}>
        © 2026 SuperGurú
      </p>
    </div>
  )
}
