// app/api/auth/[...nextauth]/route.ts
// Handler principal de NextAuth — gestiona todas las rutas:
// /api/auth/signin, /api/auth/signout, /api/auth/session,
// /api/auth/callback/*, /api/auth/error, /api/auth/csrf

import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
