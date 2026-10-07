const express = require('express');
const router = express.Router();
const {
  getOrders,
  getOrderById,
  getOrderInspections,
  createOrder,
  updateOrder,
  deleteOrder
} = require('../controllers/orderController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, getOrders);
router.get('/:id', authenticate, getOrderById);
router.get('/:id/inspections', authenticate, getOrderInspections);
router.post('/', authenticate, requireRole(['admin', 'customer']), createOrder);
router.put('/:id', authenticate, requireRole(['admin', 'customer']), updateOrder);
router.delete('/:id', authenticate, requireRole(['admin']), deleteOrder);

module.exports = router;
