// lib/auth.ts
// Configuración de NextAuth con Google OAuth + credenciales email/password

import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase'

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    // ── Google OAuth ────────────────────────────────────────────
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    // ── Email + password ────────────────────────────────────────
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        // Buscar usuario en Supabase auth
        const { data: users } = await supabaseAdmin.auth.admin.listUsers()
        const user = users?.users?.find(u => u.email === credentials.email)

        if (!user) return null

        // Verificar password con bcrypt (guardado en user_metadata)
        const hash = user.user_metadata?.password_hash
        if (!hash) return null

        const valid = await bcrypt.compare(credentials.password, hash)
        if (!valid) return null

        return {
          id: user.id,
          email: user.email ?? '',
          name: user.user_metadata?.name ?? user.email ?? '',
        }
      },
    }),
  ],

  callbacks: {
    // Añadir el id del usuario al token JWT
    async jwt({ token, user, account }) {
      if (user) {
        token.userId = user.id
      }
      // En login con Google, sincronizar perfil en Supabase
      if (account?.provider === 'google' && user?.email) {
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .single()

        if (!existing) {
          await supabaseAdmin.from('profiles').upsert({
            id: user.id,
            email: user.email,
            name: user.name ?? '',
            plan: 'free',
          })
        }
      }
      return token
    },

    // Exponer userId en la sesión del cliente
    async session({ session, token }) {
      if (token?.userId && session.user) {
        (session.user as { id?: string }).id = token.userId as string
      }
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,  // 30 días
  },
}
