import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to login, unauthorized, and API routes
  if (pathname.startsWith('/login') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/unauthorized') ||
    pathname === '/') {
    return NextResponse.next();
  }

  // For protected routes, let the client-side auth handle the redirects
  // This prevents the middleware from interfering with our custom auth system
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
