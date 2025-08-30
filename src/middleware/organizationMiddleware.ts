import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// Pages that don't require organization membership
const PUBLIC_PAGES = [
  '/',
  '/api/auth',
  '/unauthorized',
  '/onboarding',
  '/_next',
  '/favicon.ico'
];

// API routes that don't require organization membership
const PUBLIC_API_ROUTES = [
  '/api/auth',
  '/api/user/organizations',
  '/api/onboarding'
];

// Role-based permissions are now defined in main middleware

export async function organizationMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`Middleware called for path: ${pathname}`);
  
  // Skip middleware for public pages and static assets
  if (PUBLIC_PAGES.some(page => pathname.startsWith(page))) {
    return NextResponse.next();
  }

  // Skip middleware for public API routes
  if (PUBLIC_API_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  try {
    // Get the token from the request
    const token = await getToken({ 
      req: request, 
      secret: process.env.NEXTAUTH_SECRET 
    });

    // If no token, let NextAuth middleware handle it
    if (!token) {
      return NextResponse.next();
    }

    // Check if user's email is verified
    const emailVerified = token.emailVerified;
    
    // If user's email is not verified, redirect to unauthorized page with error
    if (emailVerified === false) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      url.searchParams.set('error', 'email_not_verified');
      return NextResponse.redirect(url);
    }

    // Check if user has organizations
    const hasOrganizations = token.hasOrganizations;
    
    // If user doesn't have organizations, redirect to unauthorized page
    if (hasOrganizations === false) {
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }

    // Role-based access control is now handled in main middleware

    // If hasOrganizations is undefined or true, allow access
    return NextResponse.next();
    
  } catch (error) {
    console.error('Error in organization middleware:', error);
    // On error, allow access to avoid blocking legitimate users
    return NextResponse.next();
  }
}