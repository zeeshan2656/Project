import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const listenersRef = useRef(new Map());
  const recentToastsRef = useRef(new Map());

  // Show a toast message with automatic deduplication & dismissal
  const addToast = (message, type = 'info', title = 'Live Notification') => {
    if (!message) return;
    const now = Date.now();
    const dedupeKey = `${title}:${message}`;
    const lastTime = recentToastsRef.current.get(dedupeKey) || 0;
    // Prevent duplicate toast storms within 4 seconds
    if (now - lastTime < 4000) {
      return;
    }
    recentToastsRef.current.set(dedupeKey, now);

    const id = Date.now() + Math.random();
    // Keep at most 2 previous toasts visible so they do not stack excessively
    setToasts(prev => [...prev.slice(-2), { id, title, message, type, time: new Date() }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    // Only connect WebSocket for authenticated users (admin, customer, inspector)
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    let isMounted = true;
    let socketInstance = null;

    // Lazy load socket.io-client on-demand so landing page loads instantly without it
    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return;

      socketInstance = io('/', {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000
      });

      socketInstance.on('connect', () => {
        console.log('Connected to WebSocket server:', socketInstance.id);
        if (user?.role) {
          socketInstance.emit('join_role_room', user.role);
        }
        if (user?.id) {
          socketInstance.emit('join_user_room', user.id);
        }
      });

      // Real-time inspection status change
      socketInstance.on('inspection:status_changed', (data) => {
        console.log('Live inspection status change received:', data);
        setLiveEvents(prev => [data, ...prev.slice(0, 49)]);

        // Notify registered listeners
        const cbs = listenersRef.current.get('inspection:status_changed') || [];
        cbs.forEach(cb => cb(data));
      });

      // Real-time order created
      socketInstance.on('order:created', (data) => {
        console.log('Live order created received:', data);
        setLiveEvents(prev => [data, ...prev.slice(0, 49)]);

        const cbs = listenersRef.current.get('order:created') || [];
        cbs.forEach(cb => cb(data));
      });

      // Admin direct notification
      socketInstance.on('admin:notification', (data) => {
        addToast(data.message, 'admin', 'Live Operations Alert');
      });

      // Employee direct notification (suppress self-notification to avoid spamming the current user)
      socketInstance.on('employee:notification', (data) => {
        if (data.actorName && user?.name && data.actorName === user.name) {
          // Current user already performed this action and has direct UI feedback
          return;
        }
        addToast(data.message, 'employee', 'Task Notification');
      });

      setSocket(socketInstance);
    }).catch(err => {
      console.warn('[WebSocket] Dynamic import error:', err);
    });

    return () => {
      isMounted = false;
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, [user]);

  // Subscription helper for components to register listeners
  const subscribe = (eventName, callback) => {
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, []);
    }
    listenersRef.current.get(eventName).push(callback);

    return () => {
      const arr = listenersRef.current.get(eventName) || [];
      listenersRef.current.set(eventName, arr.filter(cb => cb !== callback));
    };
  };

  return (
    <SocketContext.Provider value={{ socket, toasts, addToast, removeToast, liveEvents, subscribe }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
