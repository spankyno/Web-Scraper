// lib/supabaseClient.ts
// Cliente con anon_key → respeta RLS
// Usar en componentes del cliente

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  ?? process.env.VITE_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? process.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, anonKey)
