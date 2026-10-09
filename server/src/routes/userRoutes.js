const express = require('express');
const router = express.Router();
const {
  getCustomers,
  createCustomer,
  getEmployees,
  createEmployee,
  getAdmins,
  createAdmin,
  updateUser,
  updateUserPassword,
  getCustomerDetailsAndOrders,
  getEmployeeDetailsAndInspections,
  toggleUserStatus,
  deleteCustomer,
  deleteEmployee
} = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/customers', authenticate, requireRole(['admin']), getCustomers);
router.post('/customers', authenticate, requireRole(['admin']), createCustomer);
router.get('/customers/:id/orders', authenticate, requireRole(['admin']), getCustomerDetailsAndOrders);
router.delete('/customers/:id', authenticate, requireRole(['admin']), deleteCustomer);

router.get('/employees', authenticate, requireRole(['admin']), getEmployees);
router.post('/employees', authenticate, requireRole(['admin']), createEmployee);
router.get('/employees/:id/inspections', authenticate, requireRole(['admin']), getEmployeeDetailsAndInspections);
router.delete('/employees/:id', authenticate, requireRole(['admin']), deleteEmployee);

router.get('/admins', authenticate, requireRole(['admin']), getAdmins);
router.post('/admins', authenticate, requireRole(['admin']), createAdmin);

router.put('/:id', authenticate, requireRole(['admin']), updateUser);
router.put('/:id/password', authenticate, requireRole(['admin']), updateUserPassword);
router.put('/:id/status', authenticate, requireRole(['admin']), toggleUserStatus);
router.delete('/:id', authenticate, requireRole(['admin']), deleteCustomer);

module.exports = router;

