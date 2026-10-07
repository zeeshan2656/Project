const express = require('express');
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  getEmployees,
  createEmployee,
  updateUser,
  updateUserPassword,
  getCustomerDetailsAndOrders,
  getEmployeeDetailsAndInspections,
  toggleUserStatus
} = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/customers', authenticate, requireRole(['admin']), getCustomers);
router.post('/customers', authenticate, requireRole(['admin']), createCustomer);
router.get('/customers/:id/orders', authenticate, requireRole(['admin']), getCustomerDetailsAndOrders);

router.get('/employees', authenticate, requireRole(['admin']), getEmployees);
router.post('/employees', authenticate, requireRole(['admin']), createEmployee);
router.get('/employees/:id/inspections', authenticate, requireRole(['admin']), getEmployeeDetailsAndInspections);

router.put('/:id', authenticate, requireRole(['admin']), updateUser);
router.put('/:id/password', authenticate, requireRole(['admin']), updateUserPassword);
router.put('/:id/status', authenticate, requireRole(['admin']), toggleUserStatus);

module.exports = router;
