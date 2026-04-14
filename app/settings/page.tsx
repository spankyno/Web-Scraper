// app/settings/page.tsx
'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d1117',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, padding: '10px 14px',
  color: '#e8eaf0', fontSize: 13,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#555c6e',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
}
const cardStyle: React.CSSProperties = {
  background: '#161b22', border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12, overflow: 'hidden',
}
const sectionHeader = (title: string, desc: string) => (
  <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
    <p style={{ fontSize: 14, fontWeight: 600, color: '#e8eaf0', marginBottom: 3 }}>{title}</p>
    <p style={{ fontSize: 12, color: '#555c6e' }}>{desc}</p>
  </div>
)

const INTERVALS = [
  { value: '1h',  label: 'Cada hora' },
  { value: '6h',  label: 'Cada 6 horas' },
  { value: '12h', label: 'Cada 12 horas' },
  { value: '24h', label: 'Cada 24 horas' },
  { value: '48h', label: 'Cada 2 días' },
]

export default function SettingsPage() {
  const { data: session } = useSession()
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState('')
  const [testing,  setTesting]  = useState(false)
  const [testMsg,  setTestMsg]  = useState('')

  // Config state
  const [telegramChatId,   setTelegramChatId]   = useState('')
  const [defaultInterval,  setDefaultInterval]  = useState('6h')
  const [defaultChannel,   setDefaultChannel]   = useState('telegram')
  const [emailNotif,       setEmailNotif]       = useState('')

  // Contraseña
  const [currentPass, setCurrentPass] = useState('')
  const [newPass,     setNewPass]     = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passError,   setPassError]   = useState('')
  const [passSaved,   setPassSaved]   = useState(false)

  // Cargar config: primero Supabase (fuente de verdad), luego localStorage para prefs locales
  useEffect(() => {
    // Prefs locales (intervalo y canal no se guardan en Supabase)
    try {
      const local = JSON.parse(localStorage.getItem('ws_settings') ?? '{}')
      if (local.defaultInterval) setDefaultInterval(local.defaultInterval)
      if (local.defaultChannel)  setDefaultChannel(local.defaultChannel)
    } catch {}

    // Telegram y email desde Supabase
    fetch('/api/profile')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        if (json?.profile) {
          if (json.profile.telegram_chat_id) setTelegramChatId(json.profile.telegram_chat_id)
          if (json.profile.email_notif)      setEmailNotif(json.profile.email_notif)
        }
      })
      .catch(() => {})
  }, [])

  async function handleSaveGeneral() {
    setSaving(true)
    localStorage.setItem('ws_settings', JSON.stringify({
      telegramChatId, defaultInterval, defaultChannel, emailNotif,
    }))
    // También actualizar perfil en Supabase via API
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telegram_chat_id: telegramChatId, email_notif: emailNotif }),
    }).catch(() => {})
    setSaving(false)
    setSaved('Configuración guardada')
    setTimeout(() => setSaved(''), 3000)
  }

  async function handleTestTelegram() {
    setTesting(true); setTestMsg('')
    const res = await fetch('/api/profile/test-telegram', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: telegramChatId }),
    })
    setTesting(false)
    setTestMsg(res.ok ? '✓ Mensaje enviado correctamente' : '✕ Error al enviar. Verifica el Chat ID')
    setTimeout(() => setTestMsg(''), 5000)
  }

  async function handleChangePassword() {
    setPassError(''); setPassSaved(false)
    if (!newPass || newPass.length < 8) { setPassError('Mínimo 8 caracteres'); return }
    if (newPass !== confirmPass) { setPassError('Las contraseñas no coinciden'); return }
    const res = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPass }),
    })
    if (res.ok) {
      setPassSaved(true)
      setCurrentPass(''); setNewPass(''); setConfirmPass('')
      setTimeout(() => setPassSaved(false), 4000)
    } else {
      const json = await res.json()
      setPassError(json.error ?? 'Error al cambiar contraseña')
    }
  }

  const user = session?.user as { id?: string; name?: string; email?: string } | undefined

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f14', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Topbar */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12, background: '#0d0f14', position: 'sticky', top: 0, zIndex: 10 }}>
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🕸</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#00d4aa', fontFamily: 'monospace' }}>WebScraper Pro</span>
        </a>
        <div style={{ flex: 1 }} />
        <a href="/"         style={{ fontSize: 12, color: '#555c6e', textDecoration: 'none' }}>⚡ Extracción</a>
        <a href="/dashboard" style={{ fontSize: 12, color: '#555c6e', textDecoration: 'none' }}>📡 Dashboard</a>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#e8eaf0', marginBottom: 4 }}>Configuración</h1>
          <p style={{ fontSize: 13, color: '#555c6e' }}>Gestiona tus preferencias de notificación y cuenta</p>
        </div>

        {/* ── PERFIL ── */}
        <div style={cardStyle}>
          {sectionHeader('Perfil', 'Tu información de cuenta')}
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <div style={{ ...inputStyle, color: '#8b909e', cursor: 'default' }}>{user?.name ?? '—'}</div>
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <div style={{ ...inputStyle, color: '#8b909e', cursor: 'default' }}>{user?.email ?? '—'}</div>
              </div>
            </div>
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, color: '#00d4aa', fontWeight: 600 }}>Plan Free</span>
              <span style={{ fontSize: 12, color: '#555c6e' }}>· Hasta 3 items monitorizados</span>
            </div>
          </div>
        </div>

        {/* ── NOTIFICACIONES ── */}
        <div style={cardStyle}>
          {sectionHeader('Notificaciones', 'Configura cómo y cuándo recibes alertas de precio')}
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Telegram */}
            <div>
              <label style={labelStyle}>Telegram Chat ID</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }}
                  type="text" value={telegramChatId}
                  onChange={e => setTelegramChatId(e.target.value)}
                  placeholder="Ej: 123456789"
                />
                <button onClick={handleTestTelegram} disabled={!telegramChatId || testing}
                  style={{ padding: '10px 14px', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: '#1e2330', color: '#8b909e', border: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap', opacity: !telegramChatId ? 0.5 : 1 }}>
                  {testing ? 'Enviando…' : '🧪 Test'}
                </button>
              </div>
              {testMsg && (
                <p style={{ fontSize: 12, marginTop: 6, color: testMsg.startsWith('✓') ? '#34d399' : '#ff6b87' }}>{testMsg}</p>
              )}
              <p style={{ fontSize: 11, color: '#555c6e', marginTop: 5 }}>
                Obtén tu Chat ID hablando con <span style={{ color: '#00d4aa', fontFamily: 'monospace' }}>@userinfobot</span> en Telegram
              </p>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email de notificaciones</label>
              <input style={inputStyle} type="email" value={emailNotif}
                onChange={e => setEmailNotif(e.target.value)}
                placeholder="tu@email.com (opcional)"
              />
            </div>

            {/* Canal por defecto */}
            <div>
              <label style={labelStyle}>Canal por defecto</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { value: 'telegram', label: '📱 Telegram' },
                  { value: 'email',    label: '📧 Email' },
                  { value: 'both',     label: '📱📧 Ambos' },
                  { value: 'none',     label: '🔇 Ninguno' },
                ].map(ch => (
                  <button key={ch.value} onClick={() => setDefaultChannel(ch.value)}
                    style={{ flex: 1, padding: '8px 4px', borderRadius: 7, fontSize: 11, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', background: defaultChannel === ch.value ? 'rgba(0,212,170,0.1)' : '#0d1117', color: defaultChannel === ch.value ? '#00d4aa' : '#8b909e', border: `1px solid ${defaultChannel === ch.value ? 'rgba(0,212,170,0.3)' : 'rgba(255,255,255,0.08)'}` }}>
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frecuencia por defecto */}
            <div>
              <label style={labelStyle}>Frecuencia de rastreo por defecto</label>
              <select style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}
                value={defaultInterval} onChange={e => setDefaultInterval(e.target.value)}>
                {INTERVALS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>
          </div>

          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0d1117', display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'flex-end' }}>
            {saved && <span style={{ fontSize: 12, color: '#34d399' }}>✓ {saved}</span>}
            <button onClick={handleSaveGeneral} disabled={saving}
              style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: '#00d4aa', color: '#000', border: 'none', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {/* ── CONTRASEÑA ── */}
        <div style={cardStyle}>
          {sectionHeader('Seguridad', 'Cambia tu contraseña de acceso')}
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Nueva contraseña</label>
                <input style={inputStyle} type="password" value={newPass}
                  onChange={e => setNewPass(e.target.value)} placeholder="Mínimo 8 caracteres" autoComplete="new-password" />
              </div>
              <div>
                <label style={labelStyle}>Confirmar contraseña</label>
                <input style={{ ...inputStyle, borderColor: confirmPass && confirmPass !== newPass ? 'rgba(255,77,109,0.5)' : 'rgba(255,255,255,0.12)' }}
                  type="password" value={confirmPass}
                  onChange={e => setConfirmPass(e.target.value)} placeholder="Repite la contraseña" autoComplete="new-password" />
              </div>
            </div>
            {passError && <p style={{ fontSize: 12, color: '#ff6b87' }}>⚠ {passError}</p>}
            {passSaved && <p style={{ fontSize: 12, color: '#34d399' }}>✓ Contraseña actualizada correctamente</p>}
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0d1117', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleChangePassword} disabled={!newPass}
              style={{ padding: '8px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', background: '#00d4aa', color: '#000', border: 'none', opacity: !newPass ? 0.5 : 1 }}>
              Cambiar contraseña
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
