// app/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import type { MonitoredItemRow } from '@/types'

function formatPrice(p: number | null) {
  if (p === null) return '—'
  return `€${p.toFixed(2)}`
}

function pctDiff(curr: number | null, prev: number | null): string | null {
  if (!curr || !prev || prev === curr) return null
  const d = ((curr - prev) / prev) * 100
  return (d > 0 ? '+' : '') + d.toFixed(1) + '%'
}

interface ItemWithHistory extends MonitoredItemRow {
  price_history?: { price: number; in_stock: boolean; scraped_at: string }[]
}

export default function DashboardPage() {
  const [items, setItems] = useState<ItemWithHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState<string | null>(null)

  useEffect(() => { fetchItems() }, [])

  async function fetchItems() {
    setLoading(true)
    const res = await fetch('/api/monitor')
    if (res.ok) {
      const { items } = await res.json()
      setItems(items ?? [])
    }
    setLoading(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este item?')) return
    await fetch(`/api/monitor?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function toggleActive(item: ItemWithHistory) {
    const res = await fetch(`/api/monitor?id=${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    })
    if (res.ok) {
      const { item: updated } = await res.json()
      setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
    }
  }

  async function checkNow(item: ItemWithHistory) {
    setChecking(item.id)
    // Lanzar un scrape manual para este item
    const res = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: item.url, method: item.method, selector: item.price_selector }),
    })
    if (res.ok) {
      await fetchItems()  // recargar con nuevos precios
    }
    setChecking(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ color: '#555c6e' }}>
        Cargando...
      </div>
    )
  }

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#00d4aa' }}>📡 Monitorización</h1>
          <p className="text-sm mt-1" style={{ color: '#555c6e' }}>{items.length} items en seguimiento</p>
        </div>
        <a href="/" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: '#00d4aa', color: '#000' }}>
          ＋ Nueva extracción
        </a>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-20" style={{ color: '#555c6e' }}>
          <p className="text-4xl mb-4">📭</p>
          <p>No tienes items monitorizados todavía.</p>
          <a href="/" className="mt-4 inline-block text-sm" style={{ color: '#00d4aa' }}>
            → Extrae una URL y añádela a monitorización
          </a>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {items.map(item => {
            const diff = pctDiff(item.current_price, item.previous_price)
            const isDown = diff && diff.startsWith('-')
            const isUp = diff && diff.startsWith('+')
            const isChecking = checking === item.id

            return (
              <div
                key={item.id}
                className="rounded-xl p-4 flex flex-col gap-3 transition-all"
                style={{
                  background: '#1e2330',
                  border: `1px solid ${item.active ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)'}`,
                  opacity: item.active ? 1 : 0.6,
                }}
              >
                {/* Header */}
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#e8eaf0' }}>{item.name}</p>
                    <p className="text-xs truncate font-mono mt-0.5" style={{ color: '#555c6e' }}>
                      {new URL(item.url).hostname}{new URL(item.url).pathname.slice(0, 20)}
                    </p>
                  </div>
                  {/* Badge estado */}
                  {!item.in_stock ? (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(255,77,109,0.1)', color: '#ff6b87', border: '1px solid rgba(255,77,109,0.25)' }}>Sin stock</span>
                  ) : isDown ? (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)' }}>↓ Bajó</span>
                  ) : isUp ? (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(245,158,11,0.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.25)' }}>↑ Subió</span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(139,147,166,0.1)', color: '#555c6e', border: '1px solid rgba(255,255,255,0.07)' }}>Sin cambios</span>
                  )}
                </div>

                {/* Precios */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono" style={{ color: item.in_stock ? '#00d4aa' : '#ff6b87' }}>
                    {formatPrice(item.current_price)}
                  </span>
                  {item.previous_price && item.previous_price !== item.current_price && (
                    <span className="text-xs line-through font-mono" style={{ color: '#555c6e' }}>
                      {formatPrice(item.previous_price)}
                    </span>
                  )}
                  {diff && (
                    <span className="text-xs font-bold font-mono px-1.5 py-0.5 rounded"
                      style={{
                        background: isDown ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                        color: isDown ? '#34d399' : '#fbbf24',
                      }}>
                      {diff}
                    </span>
                  )}
                </div>

                {/* Mini info */}
                <div className="flex gap-3 text-xs" style={{ color: '#555c6e' }}>
                  <span>⏱ {item.check_interval}</span>
                  <span>🎯 alerta {item.alert_threshold}%</span>
                  {item.notify_telegram && <span>📱 TG</span>}
                  {item.notify_email && <span>📧 Email</span>}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => checkNow(item)}
                    disabled={isChecking}
                    className="flex-1 py-1.5 rounded text-xs font-medium transition-colors"
                    style={{ background: 'rgba(0,212,170,0.1)', color: '#00d4aa', border: '1px solid rgba(0,212,170,0.25)' }}
                  >
                    {isChecking ? '⏳' : '🔄'} Verificar
                  </button>
                  <button
                    onClick={() => toggleActive(item)}
                    className="px-3 py-1.5 rounded text-xs transition-colors"
                    style={{ background: '#0d0f14', color: '#555c6e', border: '1px solid rgba(255,255,255,0.07)' }}
                  >
                    {item.active ? '⏸' : '▶'}
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="px-3 py-1.5 rounded text-xs transition-colors"
                    style={{ background: 'rgba(255,77,109,0.05)', color: '#ff6b87', border: '1px solid rgba(255,77,109,0.2)' }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </main>
  )
}
