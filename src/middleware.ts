import { NextRequest, NextResponse } from 'next/server'

// Routes accessible without login
const PUBLIC_PREFIXES = [
  '/guide',        // city food guides
  '/life/share',   // shared calendar links
  '/login',        // login page itself
  '/api/auth',     // login/logout API
  '/_next',
  '/favicon',
  '/icons',
  '/manifest',
]

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (PUBLIC_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const session = req.cookies.get('life_session')?.value
  const secret  = process.env.SESSION_SECRET

  if (!secret || session !== secret) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.svg$).*)'],
}
