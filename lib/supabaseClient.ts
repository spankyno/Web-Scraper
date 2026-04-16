// lib/supabaseClient.ts
// Cliente con anon_key → respeta RLS
// Usar en componentes del cliente y en rutas server-side para auth de usuario

import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ?? ''

const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.SUPABASE_ANON_KEY ?? ''

if (!supabaseUrl) console.error('[supabaseClient] Falta NEXT_PUBLIC_SUPABASE_URL')
if (!anonKey)     console.error('[supabaseClient] Falta NEXT_PUBLIC_SUPABASE_ANON_KEY')

export const supabase = createClient(supabaseUrl, anonKey)
