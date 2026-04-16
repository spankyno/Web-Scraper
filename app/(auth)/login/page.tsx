// app/(auth)/login/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d0f14',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '10px 14px',
  color: '#e8eaf0', fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
}

function LoginForm() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [info,     setInfo]     = useState('')
  const router       = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      setInfo('Email verificado. Ya puedes iniciar sesión.')
    }
    const err = searchParams.get('error')
    if (err) setError(decodeURIComponent(err))
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Llamar al Route Handler del servidor para que las cookies
    // queden seteadas correctamente (httpOnly) y el middleware las lea.
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    setLoading(false)

    if (!res.ok) {
      const json = await res.json().catch(() => ({}))
      if (json.error === 'EMAIL_NOT_VERIFIED') {
        setError('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.')
      } else {
        setError(json.error ?? 'Email o contraseña incorrectos')
      }
      return
    }

    // Login correcto — redirigir
    const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🕸</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#00d4aa', fontFamily: 'monospace' }}>WebScraper Pro</h1>
          <p style={{ fontSize: 13, color: '#555c6e', marginTop: 4 }}>Inicia sesión para continuar</p>
        </div>

        {info && (
          <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, background: 'rgba(0,212,170,0.08)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.2)' }}>
            ✓ {info}
          </div>
        )}

        <div style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px' }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              style={inputStyle} type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required autoComplete="email"
            />
            <input
              style={inputStyle} type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Contraseña" required autoComplete="current-password"
            />

            <div style={{ textAlign: 'right', marginTop: -4 }}>
              <a href="/forgot-password" style={{ fontSize: 12, color: '#555c6e', textDecoration: 'none' }}>
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {error && (
              <div style={{ padding: '9px 12px', borderRadius: 7, fontSize: 12, background: 'rgba(255,77,109,0.08)', color: '#ff6b87', border: '1px solid rgba(255,77,109,0.2)' }}>
                ⚠ {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: '#00d4aa', color: '#000', border: 'none',
                cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
                fontFamily: 'inherit', marginTop: 4,
              }}
            >
              {loading ? 'Iniciando…' : 'Iniciar sesión'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#555c6e', marginTop: 16 }}>
          ¿No tienes cuenta?{' '}
          <a href="/signup" style={{ color: '#00d4aa', textDecoration: 'none', fontWeight: 500 }}>Regístrate gratis</a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
