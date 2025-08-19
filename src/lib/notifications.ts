// Store active connections
const connections = new Map<string, ReadableStreamDefaultController>();

// Function to send notification to specific user/organization
export function sendNotification(userId: string, organizationId: string, notification: any) {
  const connectionId = `${userId}-${organizationId}`;
  const controller = connections.get(connectionId);
  
  if (controller) {
    try {
      controller.enqueue(`data: ${JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString()
      })}\n\n`);
    } catch (error) {
      console.error('Error sending notification:', error);
      connections.delete(connectionId);
    }
  }
}

// Function to broadcast notification to all users in an organization
export function broadcastToOrganization(organizationId: string, notification: any) {
  for (const [connectionId, controller] of connections.entries()) {
    if (connectionId.endsWith(`-${organizationId}`)) {
      try {
        controller.enqueue(`data: ${JSON.stringify({
          ...notification,
          timestamp: new Date().toISOString()
        })}\n\n`);
      } catch (error) {
        console.error('Error broadcasting notification:', error);
        connections.delete(connectionId);
      }
    }
  }
}

// Function to store connection
export function storeConnection(connectionId: string, controller: ReadableStreamDefaultController) {
  connections.set(connectionId, controller);
}

// Function to remove connection
export function removeConnection(connectionId: string) {
  connections.delete(connectionId);
}

// Function to get connection
export function getConnection(connectionId: string) {
  return connections.get(connectionId);
}