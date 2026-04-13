// app/(auth)/login/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

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

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)

    if (res?.error) {
      if (res.error === 'EMAIL_NOT_VERIFIED') {
        setError('Debes verificar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.')
      } else {
        setError('Email o contraseña incorrectos')
      }
    } else {
      router.push('/dashboard')
    }
  }

  async function handleGoogle() {
    setLoading(true)
    await signIn('google', { callbackUrl: '/dashboard' })
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 380 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🕸</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#00d4aa', fontFamily: 'monospace' }}>WebScraper Pro</h1>
          <p style={{ fontSize: 13, color: '#555c6e', marginTop: 4 }}>Inicia sesión para continuar</p>
        </div>

        {/* Mensaje de verificación exitosa */}
        {info && (
          <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 14, background: 'rgba(0,212,170,0.08)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.2)' }}>
            ✓ {info}
          </div>
        )}

        <div style={{ background: '#1e2330', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '24px' }}>

          {/* Google */}
          <button onClick={handleGoogle} disabled={loading} style={{
            width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: '#0d0f14', border: '1px solid rgba(255,255,255,0.12)',
            color: '#e8eaf0', cursor: 'pointer', fontFamily: 'inherit',
            opacity: loading ? 0.6 : 1, marginBottom: 16,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
            <span style={{ fontSize: 11, color: '#555c6e' }}>o con email</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <form onSubmit={handleCredentials} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoComplete="email" />
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" required autoComplete="current-password" />

            {/* Forgot password */}
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

            <button type="submit" disabled={loading} style={{
              padding: '11px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: '#00d4aa', color: '#000', border: 'none',
              cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
              fontFamily: 'inherit', marginTop: 4,
            }}>
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

// useSearchParams necesita Suspense
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
