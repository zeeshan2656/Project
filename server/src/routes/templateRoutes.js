const express = require('express');
const router = express.Router();
const {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = require('../controllers/templateController');
const { authenticate, requireRole } = require('../middleware/auth');

router.get('/', authenticate, getTemplates);
router.get('/:id', authenticate, getTemplateById);
router.post('/', authenticate, requireRole(['admin']), createTemplate);
router.put('/:id', authenticate, requireRole(['admin']), updateTemplate);
router.delete('/:id', authenticate, requireRole(['admin']), deleteTemplate);

module.exports = router;
