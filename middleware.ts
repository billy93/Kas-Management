import { withAuth } from "next-auth/middleware";
import { NextRequest, NextResponse } from "next/server";
import { organizationMiddleware } from "./src/middleware/organizationMiddleware";

export default withAuth(
  async function middleware(request: NextRequest) {
    // First run organization validation
    const orgResponse = await organizationMiddleware(request);
    
    // If organization middleware returns a redirect, use it
    if (orgResponse.status === 307 || orgResponse.status === 302) {
      return orgResponse;
    }
    
    // Otherwise continue with normal flow
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Allow access to public pages
        const { pathname } = req.nextUrl;
        const publicPages = ['/', '/unauthorized', '/api/auth', '/onboarding'];
        
        if (publicPages.some(page => pathname.startsWith(page))) {
          return true;
        }
        
        // If user is not authenticated, redirect to login page
        if (!token) {
          return false; // This will trigger redirect to signin page
        }
        
        // User is authenticated, allow access
        return true;
      },
    },
    pages: {
      signIn: '/', // Redirect unauthenticated users to home page
    },
  }
);

export const config = { 
  matcher: ["/((?!api/auth|api/chat|_next|.*\\..*|favicon.ico|$).*)"] 
};
