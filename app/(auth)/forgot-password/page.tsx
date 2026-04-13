// app/(auth)/forgot-password/page.tsx
'use client'

import { useState } from 'react'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d0f14',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '10px 14px',
  color: '#e8eaf0', fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
}

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [done,    setDone]    = useState(false)
  const [error,   setError]   = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth/forgot-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) setDone(true)
    else {
      const json = await res.json()
      setError(json.error ?? 'Error al enviar el email')
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center', maxWidth: 380 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🔑</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf0', marginBottom: 10 }}>Email enviado</h2>
          <p style={{ fontSize: 13, color: '#8b909e', lineHeight: 1.7, marginBottom: 20 }}>
            Si <strong style={{ color: '#00d4aa' }}>{email}</strong> está registrado,
            recibirás un enlace para restablecer tu contraseña en breve.
          </p>
          <a href="/login" style={{ fontSize: 13, color: '#00d4aa', textDecoration: 'none' }}>← Volver al login</a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔑</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf0' }}>¿Olvidaste tu contraseña?</h1>
          <p style={{ fontSize: 13, color: '#555c6e', marginTop: 6, lineHeight: 1.6 }}>
            Introduce tu email y te enviaremos un enlace para restablecerla.
          </p>
        </div>

        <div style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Email</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email" />
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
              fontFamily: 'inherit',
            }}>
              {loading ? 'Enviando…' : 'Enviar enlace'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#555c6e', marginTop: 16 }}>
          <a href="/login" style={{ color: '#00d4aa', textDecoration: 'none' }}>← Volver al login</a>
        </p>
      </div>
    </div>
  )
}
