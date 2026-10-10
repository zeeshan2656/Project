const express = require('express');
const router = express.Router();
const {
  getInspections,
  getInspectionById,
  createInspection,
  startInspection,
  saveDraft,
  submitInspection,
  reviewInspection,
  uploadPhoto,
  deletePhotos,
  deleteInspection
} = require('../controllers/inspectionController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload, convertToWebp } = require('../middleware/upload');

// General inspection list & read
router.get('/', authenticate, getInspections);
router.get('/:id', authenticate, getInspectionById);

// Admin: Generate and assign sheet to employee
router.post('/', authenticate, requireRole(['admin']), createInspection);

// Admin: Delete inspection sheet
router.delete('/:id', authenticate, requireRole(['admin']), deleteInspection);

// Field Employee Workflow:
// 1. Open sheet -> In Progress
router.put('/:id/start', authenticate, requireRole(['employee', 'admin']), startInspection);

// 2. Save Draft progress
router.put('/:id/draft', authenticate, requireRole(['employee', 'admin']), saveDraft);

// 3. Submit completed inspection
router.post('/:id/submit', authenticate, requireRole(['employee', 'admin']), submitInspection);

// 4. Upload photo evidence
router.post('/:id/photos', authenticate, requireRole(['employee', 'admin']), upload.single('photo'), convertToWebp, uploadPhoto);
router.delete('/:id/photos', authenticate, requireRole(['employee', 'admin']), deletePhotos);

// Admin Review & Approval
router.post('/:id/review', authenticate, requireRole(['admin']), reviewInspection);

module.exports = router;

