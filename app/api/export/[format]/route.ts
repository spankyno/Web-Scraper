// app/api/export/[format]/route.ts
// GET /api/export/json?jobId=xxx
// GET /api/export/csv?jobId=xxx
// GET /api/export/xml?jobId=xxx
// GET /api/export/xlsx?jobId=xxx

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { ExportFormat } from '@/types'

async function getJobData(jobId: string, userId: string | null) {
  const query = supabaseAdmin
    .from('scrape_jobs')
    .select('result, url, created_at')
    .eq('id', jobId)

  if (userId) query.eq('user_id', userId)

  const { data, error } = await query.single()
  if (error || !data?.result) return null
  return data
}

// ── JSON ──────────────────────────────────────────────────────
function toJSON(data: Record<string, unknown>[]): string {
  return JSON.stringify(data, null, 2)
}

// ── CSV ───────────────────────────────────────────────────────
function toCSV(data: Record<string, unknown>[]): string {
  if (!data.length) return ''
  const keys = Object.keys(data[0])
  const header = keys.join(',')
  const rows = data.map(row =>
    keys.map(k => {
      const v = row[k]
      const str = v == null ? '' : String(v)
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str
    }).join(',')
  )
  return [header, ...rows].join('\n')
}

// ── XML ───────────────────────────────────────────────────────
function toXML(data: Record<string, unknown>[], url: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const items = data.map(row => {
    const fields = Object.entries(row)
      .map(([k, v]) => `    <${k}>${escape(String(v ?? ''))}</${k}>`)
      .join('\n')
    return `  <item>\n${fields}\n  </item>`
  }).join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<scrape_results source="${escape(url)}">`,
    items,
    '</scrape_results>',
  ].join('\n')
}

// ── XLSX ──────────────────────────────────────────────────────
async function toXLSX(data: Record<string, unknown>[]): Promise<Buffer> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Resultados')

  if (!data.length) return Buffer.from(await wb.xlsx.writeBuffer())

  const keys = Object.keys(data[0])

  // Cabecera con color
  ws.addRow(keys)
  const headerRow = ws.getRow(1)
  headerRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E2330' },
    }
    cell.font = { bold: true, color: { argb: 'FF00D4AA' } }
    cell.alignment = { horizontal: 'center' }
  })
  headerRow.commit()

  // Datos
  data.forEach(row => ws.addRow(keys.map(k => row[k] ?? '')))

  // Autofit columns (aproximado)
  ws.columns.forEach((col, i) => {
    const maxLen = Math.max(
      keys[i].length,
      ...data.map(r => String(r[keys[i]] ?? '').length),
    )
    col.width = Math.min(maxLen + 2, 50)
  })

  return Buffer.from(await wb.xlsx.writeBuffer())
}

export async function GET(
  req: NextRequest,
  { params }: { params: { format: string } },
) {
  const format = params.format as ExportFormat
  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return NextResponse.json({ error: 'Falta jobId' }, { status: 400 })
  }

  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string })?.id ?? null

  const job = await getJobData(jobId, userId)
  if (!job) {
    return NextResponse.json({ error: 'Job no encontrado' }, { status: 404 })
  }

  const data = job.result as Record<string, unknown>[]
  const ts = new Date(job.created_at).toISOString().slice(0, 10)
  const filename = `webscraper-${ts}`

  switch (format) {
    case 'json':
      return new NextResponse(toJSON(data), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}.json"`,
        },
      })

    case 'csv':
      return new NextResponse(toCSV(data), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.csv"`,
        },
      })

    case 'xml':
      return new NextResponse(toXML(data, job.url), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.xml"`,
        },
      })

    case 'xlsx': {
      const buffer = await toXLSX(data)
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      })
    }

    default:
      return NextResponse.json({ error: `Formato no soportado: ${format}` }, { status: 400 })
  }
}
