import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

console.log('🚀 MIDDLEWARE LOADED - SRC FOLDER VERSION');

// Role-based permissions for UI pages only (API routes are allowed for all authenticated users)
const ROLE_PERMISSIONS = {
  VIEWER: ['/dashboard', '/chat'],
  TREASURER: ['/dashboard', '/chat', '/transactions', '/dues'],
  ADMIN: ['/dashboard', '/chat', '/transactions', '/dues', '/users', '/settings'],
  OWNER: ['/dashboard', '/chat', '/transactions', '/dues', '/users', '/settings']
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🔒 MIDDLEWARE START: ${pathname}`);
  
  // Allow access to public pages and all API routes
  const publicPages = ['/', '/unauthorized', '/api', '/onboarding'];
  const isPublicPage = publicPages.some(page => {
    if (page === '/') {
      return pathname === '/' || pathname.startsWith('/_next') || pathname === '/favicon.ico';
    }
    return pathname.startsWith(page);
  });
  
  if (isPublicPage) {
    console.log(`✅ PUBLIC PAGE OR API: ${pathname}`);
    return NextResponse.next();
  }
  
  // Get token
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  console.log(`🎫 TOKEN CHECK: ${token ? 'Found' : 'Not found'}`);
  
  // If user is not authenticated, redirect to login page
  if (!token) {
    console.log(`❌ NO TOKEN - REDIRECT TO LOGIN`);
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }
  
  // Check role-based access control
  const userRole = token.userRole as keyof typeof ROLE_PERMISSIONS;
  console.log(`👤 USER ROLE: ${userRole}`);
  
  if (userRole && ROLE_PERMISSIONS[userRole]) {
    const allowedPaths = ROLE_PERMISSIONS[userRole];
    const hasAccess = allowedPaths.some(allowedPath => 
      pathname.startsWith(allowedPath)
    );
    
    console.log(`🔍 ACCESS CHECK: ${hasAccess ? 'ALLOWED' : 'DENIED'} for ${userRole} to ${pathname}`);
    
    if (!hasAccess) {
      console.log(`🚫 ACCESS DENIED - REDIRECT TO UNAUTHORIZED`);
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      url.searchParams.set('error', 'insufficient_permissions');
      return NextResponse.redirect(url);
    }
  }
  
  console.log(`✅ MIDDLEWARE PASSED: ${pathname}`);
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