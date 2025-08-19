import { useState, useEffect, useCallback } from 'react';
import { useOrganization } from '@/contexts/OrganizationContext';

export interface Notification {
  type: string;
  message: string;
  data?: any;
  from?: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);
  const { selectedOrganization } = useOrganization();

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50 notifications
  }, []);

  const removeNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const sendNotification = useCallback(async (type: string, message: string, targetUserId?: string, data?: any) => {
    if (!selectedOrganization) return;

    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: selectedOrganization.id,
          type,
          message,
          targetUserId,
          data
        })
      });
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [selectedOrganization]);

  useEffect(() => {
    if (!selectedOrganization) {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
        setIsConnected(false);
      }
      return;
    }

    // Close existing connection
    if (eventSource) {
      eventSource.close();
    }

    // Create new SSE connection
    const newEventSource = new EventSource(
      `/api/notifications?organizationId=${selectedOrganization.id}`
    );

    newEventSource.onopen = () => {
      setIsConnected(true);
      console.log('Connected to notifications');
    };

    newEventSource.onmessage = (event) => {
      try {
        const notification = JSON.parse(event.data);
        
        if (notification.type === 'connected' || notification.type === 'heartbeat') {
          return; // Skip system messages
        }

        addNotification(notification);
        
        // Show browser notification if permission granted
        if (Notification.permission === 'granted') {
          new Notification(notification.message, {
            icon: '/favicon.ico',
            tag: notification.type
          });
        }
      } catch (error) {
        console.error('Error parsing notification:', error);
      }
    };

    newEventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (newEventSource.readyState === EventSource.CLOSED) {
          console.log('Attempting to reconnect...');
          // The useEffect will handle reconnection when selectedOrganization changes
        }
      }, 5000);
    };

    setEventSource(newEventSource);

    // Cleanup on unmount or organization change
    return () => {
      newEventSource.close();
      setIsConnected(false);
    };
  }, [selectedOrganization, addNotification]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return {
    notifications,
    isConnected,
    addNotification,
    removeNotification,
    clearNotifications,
    sendNotification
  };
}