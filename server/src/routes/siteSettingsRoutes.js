const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  getAdminSlides,
  createSlide,
  updateSlide,
  deleteSlide
} = require('../controllers/siteSettingsController');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload, convertToWebp } = require('../middleware/upload');

// Public endpoints
router.get('/', getSettings);

// Admin CMS endpoints
router.put('/', authenticate, requireRole(['admin']), upload.single('logo'), convertToWebp, updateSettings);

// Slider endpoints
router.get('/slides/admin', authenticate, requireRole(['admin']), getAdminSlides);
router.post('/slides', authenticate, requireRole(['admin']), upload.single('image'), convertToWebp, createSlide);
router.put('/slides/:id', authenticate, requireRole(['admin']), upload.single('image'), convertToWebp, updateSlide);
router.delete('/slides/:id', authenticate, requireRole(['admin']), deleteSlide);

module.exports = router;
