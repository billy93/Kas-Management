import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { sendNotification, broadcastToOrganization, storeConnection } from "@/lib/notifications";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: "Organization ID is required" }, { status: 400 });
    }

    // Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId }
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const connectionId = `${user.id}-${organizationId}`;

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        // Store connection
        storeConnection(connectionId, controller);

        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({
          type: 'connected',
          message: 'Connected to notifications',
          timestamp: new Date().toISOString()
        })}\n\n`);

        // Send heartbeat every 30 seconds
        const heartbeat = setInterval(() => {
          try {
            controller.enqueue(`data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: new Date().toISOString()
            })}\n\n`);
          } catch (error) {
            clearInterval(heartbeat);
            connections.delete(connectionId);
          }
        }, 30000);

        // Cleanup on close
        req.signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          connections.delete(connectionId);
          try {
            controller.close();
          } catch (error) {
            // Connection already closed
          }
        });
      },
      cancel() {
        connections.delete(connectionId);
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });
  } catch (error) {
    console.error('Error setting up SSE:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { organizationId, type, message, targetUserId, data } = await req.json();

    if (!organizationId || !type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Verify user has access to this organization
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        memberships: {
          where: { organizationId }
        }
      }
    });

    if (!user || user.memberships.length === 0) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const notification = {
      type,
      message,
      data: data || {},
      from: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    };

    if (targetUserId) {
      // Send to specific user
      sendNotification(targetUserId, organizationId, notification);
    } else {
      // Broadcast to all users in organization
      broadcastToOrganization(organizationId, notification);
    }

    return NextResponse.json({ message: 'Notification sent successfully' });
  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}