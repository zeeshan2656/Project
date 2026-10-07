import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const listenersRef = useRef(new Map());

  // Show a toast message with automatic dismissal
  const addToast = (message, type = 'info', title = 'Live Notification') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, title, message, type, time: new Date() }]);
    setTimeout(() => {
      removeToast(id);
    }, 5500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io('/', {
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

    // Employee direct notification
    socketInstance.on('employee:notification', (data) => {
      addToast(data.message, 'employee', 'Task Notification');
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
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
