// app/(auth)/reset-password/page.tsx
// Supabase incluye el access_token en el hash de la URL (#access_token=xxx&type=recovery)
// Este componente lo lee en el cliente y lo envía al API route para actualizar la contraseña.
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d0f14',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '10px 14px',
  color: '#e8eaf0', fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
}

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState('')
  const [password,    setPassword]    = useState('')
  const [confirm,     setConfirm]     = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [done,        setDone]        = useState(false)
  const router = useRouter()

  // Extraer access_token del hash de la URL (solo disponible en el cliente)
  useEffect(() => {
    const hash   = window.location.hash.slice(1)
    const params = new URLSearchParams(hash)
    const token  = params.get('access_token')
    const type   = params.get('type')

    if (!token || type !== 'recovery') {
      setError('Enlace inválido o expirado. Solicita uno nuevo.')
    } else {
      setAccessToken(token)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (password.length < 8)  { setError('Mínimo 8 caracteres'); return }

    setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ accessToken, password }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) setError(json.error ?? 'Error al actualizar')
    else setDone(true)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>✅</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf0', marginBottom: 10 }}>Contraseña actualizada</h2>
          <p style={{ fontSize: 13, color: '#8b909e', marginBottom: 20 }}>
            Ya puedes iniciar sesión con tu nueva contraseña.
          </p>
          <button onClick={() => router.push('/login')} style={{
            padding: '9px 24px', borderRadius: 8, background: '#00d4aa',
            color: '#000', fontSize: 13, fontWeight: 600, border: 'none',
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
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e8eaf0' }}>Nueva contraseña</h1>
          <p style={{ fontSize: 13, color: '#555c6e', marginTop: 6 }}>Elige una contraseña segura</p>
        </div>

        <div style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px' }}>
          {!accessToken && error ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <p style={{ fontSize: 13, color: '#ff6b87', marginBottom: 16 }}>⚠ {error}</p>
              <a href="/forgot-password" style={{ fontSize: 13, color: '#00d4aa', textDecoration: 'none' }}>
                Solicitar nuevo enlace
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Nueva contraseña</label>
                <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required autoComplete="new-password" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 11, color: '#555c6e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Confirmar contraseña</label>
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
              </div>

              {error && (
                <div style={{ padding: '9px 12px', borderRadius: 7, fontSize: 12, background: 'rgba(255,77,109,0.08)', color: '#ff6b87', border: '1px solid rgba(255,77,109,0.2)' }}>
                  ⚠ {error}
                </div>
              )}

              <button type="submit" disabled={loading || !accessToken} style={{
                padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: '#00d4aa', color: '#000', border: 'none',
                cursor: loading || !accessToken ? 'default' : 'pointer',
                opacity: loading || !accessToken ? 0.6 : 1,
                fontFamily: 'inherit',
              }}>
                {loading ? 'Actualizando…' : 'Actualizar contraseña'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
