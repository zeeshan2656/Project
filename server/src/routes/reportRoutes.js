const express = require('express');
const router = express.Router();
const {
  exportInspectionPDF,
  exportInspectionExcel,
  exportOrdersExcel,
  getDashboardMetrics
} = require('../controllers/reportController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Dashboard fast aggregate metrics (authenticated)
router.get('/metrics', authenticate, getDashboardMetrics);

// Download inspection reports (optionalAuth: allows browser link downloads with/without query token)
router.get('/inspection/:id/pdf', optionalAuth, exportInspectionPDF);
router.get('/inspection/:id/excel', optionalAuth, exportInspectionExcel);
router.get('/orders/excel', optionalAuth, exportOrdersExcel);

module.exports = router;

