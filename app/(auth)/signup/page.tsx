// app/(auth)/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d0f14',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '10px 14px',
  color: '#e8eaf0', fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const strength = checks.filter(Boolean).length
  const colors = ['#ff4d6d', '#ff4d6d', '#f59e0b', '#34d399', '#00d4aa']
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
  if (!password) return null
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 3, marginBottom: 4 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < strength ? colors[strength] : 'rgba(255,255,255,0.08)',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 10, color: colors[strength] }}>{labels[strength]}</span>
    </div>
  )
}

export default function SignupPage() {
  const [name,     setName]     = useState('')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [done,     setDone]     = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8)  { setError('Mínimo 8 caracteres'); return }

    setLoading(true)
    const res = await fetch('/api/auth/signup', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password, name }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) setError(json.error ?? 'Error al registrarse')
    else setDone(true)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>📬</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#e8eaf0', marginBottom: 10 }}>
            Revisa tu email
          </h2>
          <p style={{ fontSize: 14, color: '#8b909e', lineHeight: 1.7, marginBottom: 20 }}>
            Enviamos un enlace de verificación a{' '}
            <strong style={{ color: '#00d4aa' }}>{email}</strong>.<br />
            Haz clic en él para activar tu cuenta.
          </p>
          <p style={{ fontSize: 12, color: '#555c6e', marginBottom: 20 }}>
            ¿No lo encuentras? Revisa la carpeta de spam.
          </p>
          <button onClick={() => router.push('/login')} style={{
            padding: '9px 24px', borderRadius: 8, background: '#1e2330',
            color: '#8b909e', fontSize: 13, border: '1px solid rgba(255,255,255,0.08)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            Ir al login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🕸</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#00d4aa', fontFamily: 'monospace' }}>WebScraper Pro</h1>
          <p style={{ fontSize: 13, color: '#555c6e', marginTop: 4 }}>Crea tu cuenta gratis</p>
        </div>

        <div style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px 24px 20px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Nombre</label>
              <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre" autoComplete="name" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Email *</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email" />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Contraseña *</label>
              <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required autoComplete="new-password" />
              <PasswordStrength password={password} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Confirmar contraseña *</label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: confirm && confirm !== password ? 'rgba(255,77,109,0.5)'
                    : confirm && confirm === password ? 'rgba(0,212,170,0.4)'
                    : 'rgba(255,255,255,0.12)',
                }}
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                placeholder="Repite la contraseña" required autoComplete="new-password"
              />
              {confirm && confirm !== password && (
                <p style={{ fontSize: 11, color: '#ff6b87', marginTop: 4 }}>Las contraseñas no coinciden</p>
              )}
            </div>

            {error && (
              <div style={{ padding: '9px 12px', borderRadius: 7, fontSize: 12, background: 'rgba(255,77,109,0.08)', color: '#ff6b87', border: '1px solid rgba(255,77,109,0.2)' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#00d4aa', color: '#000', border: 'none',
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit', marginTop: 4,
            }}>
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#555c6e', marginTop: 16 }}>
          ¿Ya tienes cuenta?{' '}
          <a href="/login" style={{ color: '#00d4aa', textDecoration: 'none', fontWeight: 500 }}>Inicia sesión</a>
        </p>
      </div>
    </div>
  )
}
