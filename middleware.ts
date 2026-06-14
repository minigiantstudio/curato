import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Start with a pass-through response we can attach refreshed cookies to.
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refresh the session (rotates the cookie) and read the user.
  const { data: { user } } = await supabase.auth.getUser()

  // Gate: no user on a protected route → redirect to /login.
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Authenticated: return the response carrying refreshed auth cookies.
  return response
}

export const config = {
  // Run on everything EXCEPT: Next internals, the auth entry points (/login,
  // /auth/*), the public share route, API routes (they enforce their own RLS),
  // and static asset files.
  matcher: [
    '/((?!_next/static|_next/image|login|auth|share|api|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|otf|woff|woff2|ico)).*)',
  ],
}
