let io = null;

/**
 * Initializes Socket.io with HTTP server
 */
function initSocket(server, clientOrigin = true) {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join room based on role or user id
    socket.on('join_role_room', (role) => {
      if (['admin', 'customer', 'employee'].includes(role)) {
        socket.join(`role_${role}`);
        console.log(`[WebSocket] Socket ${socket.id} joined room role_${role}`);
      }
    });

    socket.on('join_user_room', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`[WebSocket] Socket ${socket.id} joined room user_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Helper to emit live events across system
 */
function emitEvent(eventName, payload, targetRooms = []) {
  if (!io) return;

  if (targetRooms.length > 0) {
    targetRooms.forEach(room => {
      io.to(room).emit(eventName, payload);
    });
  } else {
    // Broadcast to all connected clients
    io.emit(eventName, payload);
  }
}

/**
 * Broadcast inspection status change
 */
function broadcastInspectionStatus(inspectionData, action, actorName) {
  const payload = {
    inspection: inspectionData,
    action,
    actorName,
    timestamp: new Date().toISOString()
  };

  emitEvent('inspection:status_changed', payload);
  emitEvent('admin:notification', {
    type: 'inspection_update',
    message: `Inspection ${inspectionData.sheet_number} status updated to "${inspectionData.status}" by ${actorName}`,
    data: payload
  }, ['role_admin']);

  if (inspectionData.assigned_employee_id) {
    emitEvent('employee:notification', {
      type: 'task_update',
      message: `Inspection ${inspectionData.sheet_number} updated: ${inspectionData.status}`,
      data: payload
    }, [`user_${inspectionData.assigned_employee_id}`, 'role_employee']);
  }
}

/**
 * Broadcast new order created
 */
function broadcastOrderCreated(orderData, actorName) {
  const payload = {
    order: orderData,
    actorName,
    timestamp: new Date().toISOString()
  };

  emitEvent('order:created', payload);
  emitEvent('admin:notification', {
    type: 'order_created',
    message: `New Order ${orderData.order_number} created for ${orderData.factory_name} (${orderData.factory_city})`,
    data: payload
  }, ['role_admin']);
}

module.exports = {
  initSocket,
  emitEvent,
  broadcastInspectionStatus,
  broadcastOrderCreated,
  getIO: () => io
};
