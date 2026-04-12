// app/api/scrape/route.ts
// POST /api/scrape
// Ejecuta el motor de scraping y guarda el job en Supabase

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { scrape, suggestMethod } from '@/lib/scrapers/hybrid'
import { supabaseAdmin } from '@/lib/supabase'
import { checkAnonLimit } from '@/lib/rateLimiter'
import type { ScrapeRequest } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: ScrapeRequest = await req.json()
    const { url, method, selector, aiInstruction } = body

    if (!url || !URL.canParse(url)) {
      return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    }

    // ── Autenticación ──────────────────────────────────────────
    const session = await getServerSession(authOptions)
    const userId = (session?.user as { id?: string })?.id ?? null

    // ── Rate limit para anónimos ───────────────────────────────
    if (!userId) {
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? req.headers.get('x-real-ip')
        ?? '0.0.0.0'

      const limit = await checkAnonLimit(ip)

      if (!limit.allowed) {
        return NextResponse.json(
          {
            error: 'Límite de extracciones alcanzado',
            resetAt: limit.resetAt,
            message: 'Regístrate gratis para extracciones ilimitadas',
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': limit.resetAt,
            },
          },
        )
      }
    }

    // ── Crear job en Supabase ──────────────────────────────────
    const { data: job } = await supabaseAdmin
      .from('scrape_jobs')
      .insert({
        user_id: userId,
        url,
        method: method ?? suggestMethod(url),
        status: 'running',
      })
      .select('id')
      .single()

    const jobId = job?.id

    // ── Ejecutar scraping ──────────────────────────────────────
    const t0 = Date.now()
    const result = await scrape({
      url,
      method: method ?? 'hybrid',
      selector,
      aiInstruction,
    })
    const durationMs = Date.now() - t0

    // ── Actualizar job con resultado ───────────────────────────
    if (jobId) {
      await supabaseAdmin
        .from('scrape_jobs')
        .update({
          status: result.success ? 'done' : 'error',
          result: result.data,
          rows_count: result.data.length,
          duration_ms: durationMs,
          error_msg: result.error ?? null,
        })
        .eq('id', jobId)
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? 'Extracción fallida' },
        { status: 422 },
      )
    }

    return NextResponse.json({
      jobId,
      ...result,
      suggestedMethod: suggestMethod(url),
    })
  } catch (err) {
    console.error('[/api/scrape]', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    )
  }
}
