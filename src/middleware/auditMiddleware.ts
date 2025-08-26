import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog, getRequestInfo, AUDIT_ACTIONS, ENTITY_TYPES } from '@/lib/audit';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Routes that should be audited
const AUDITED_ROUTES = [
  '/api/members',
  '/api/payments',
  '/api/transactions',
  '/api/dues',
  '/api/organizations',
  '/api/users',
  '/api/backup',
  '/api/export'
];

// Map HTTP methods to audit actions
const METHOD_TO_ACTION: Record<string, string> = {
  'POST': AUDIT_ACTIONS.CREATE,
  'PUT': AUDIT_ACTIONS.UPDATE,
  'PATCH': AUDIT_ACTIONS.UPDATE,
  'DELETE': AUDIT_ACTIONS.DELETE,
  'GET': AUDIT_ACTIONS.READ
};

// Extract entity type from URL path
function getEntityTypeFromPath(pathname: string): string {
  if (pathname.includes('/members')) return ENTITY_TYPES.MEMBER;
  if (pathname.includes('/payments')) return ENTITY_TYPES.PAYMENT;
  if (pathname.includes('/transactions')) return ENTITY_TYPES.TRANSACTION;
  if (pathname.includes('/dues')) return ENTITY_TYPES.DUES;
  if (pathname.includes('/organizations')) return ENTITY_TYPES.ORGANIZATION;
  if (pathname.includes('/users')) return ENTITY_TYPES.USER;
  if (pathname.includes('/backup')) return 'BACKUP';
  if (pathname.includes('/export')) return 'EXPORT';
  return 'UNKNOWN';
}

// Extract entity ID from URL path
function getEntityIdFromPath(pathname: string): string | null {
  const segments = pathname.split('/');
  const apiIndex = segments.indexOf('api');
  
  if (apiIndex !== -1 && segments.length > apiIndex + 2) {
    const potentialId = segments[apiIndex + 2];
    // Check if it's a valid ID (not a nested route like 'unpaid', 'summary', etc.)
    if (potentialId && !['unpaid', 'summary', 'monthly', 'invite'].includes(potentialId)) {
      return potentialId;
    }
  }
  
  return null;
}

// Create audit middleware function
export async function auditMiddleware(request: NextRequest, response: NextResponse) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // Check if this route should be audited
  const shouldAudit = AUDITED_ROUTES.some(route => pathname.startsWith(route));
  
  if (!shouldAudit || method === 'OPTIONS') {
    return;
  }

  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return; // Skip audit for unauthenticated requests
    }

    // Get organization ID from request
    let organizationId: string | null = null;
    
    if (method === 'GET') {
      organizationId = request.nextUrl.searchParams.get('organizationId');
    } else {
      try {
        const body = await request.clone().json();
        organizationId = body.organizationId;
      } catch {
        // Body might not be JSON or might be empty
      }
    }

    if (!organizationId) {
      return; // Skip audit if no organization context
    }

    const action = METHOD_TO_ACTION[method] || method;
    const entityType = getEntityTypeFromPath(pathname);
    const entityId = getEntityIdFromPath(pathname);
    const { ipAddress, userAgent } = getRequestInfo(request);

    // Create audit log entry
    await createAuditLog({
      organizationId,
      userId: session.user.id,
      action,
      entityType,
      entityId,
      details: {
        method,
        path: pathname,
        query: Object.fromEntries(request.nextUrl.searchParams),
        statusCode: response.status
      },
      ipAddress,
      userAgent
    });
  } catch (error) {
    console.error('Error creating audit log:', error);
    // Don't throw error to avoid breaking the main request
  }
}

// Wrapper function for API routes
export function withAudit<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const request = args[0] as NextRequest;
    const response = await handler(...args);
    
    // Create audit log after successful response
    await auditMiddleware(request, response);
    
    return response;
  };
}

// Higher-order function for API route handlers
export function createAuditedHandler(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const response = await handler(request, context);
    
    // Only audit successful responses (2xx status codes)
    if (response.status >= 200 && response.status < 300) {
      await auditMiddleware(request, response);
    }
    
    return response;
  };
}