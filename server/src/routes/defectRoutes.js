const express = require('express');
const router = express.Router();
const {
  getDefects,
  getDefectCategories,
  createDefect,
  updateDefect,
  deleteDefect,
  uploadReferenceImage
} = require('../controllers/defectController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload, convertToWebp } = require('../middleware/upload');

// Public or Authenticated read
router.get('/', authenticate, getDefects);
router.get('/categories', authenticate, getDefectCategories);

// Admin-only management
router.post('/', authenticate, requireRole(['admin']), createDefect);
router.put('/:id', authenticate, requireRole(['admin']), updateDefect);
router.delete('/:id', authenticate, requireRole(['admin']), deleteDefect);

// Reference image upload
router.post('/upload-reference', authenticate, requireRole(['admin']), upload.single('photo'), convertToWebp, uploadReferenceImage);

module.exports = router;
