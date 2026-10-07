const { query } = require('../config/db');

/**
 * List all defect codes in Defect Master
 */
async function getDefects(req, res) {
  try {
    const { category, search, activeOnly } = req.query;
    let sql = 'SELECT * FROM defect_masters WHERE 1=1';
    const params = [];

    if (activeOnly === 'true' || activeOnly === '1') {
      sql += ' AND is_active = 1';
    }

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      sql += ' AND (code LIKE ? OR name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY CAST(code AS UNSIGNED) ASC, sort_order ASC, id ASC';

    const defects = await query(sql, params);
    const parsed = defects.map(d => ({
      ...d,
      reference_images: typeof d.reference_images === 'string' ? JSON.parse(d.reference_images || '[]') : (d.reference_images || [])
    }));

    return res.json({ success: true, count: parsed.length, defects: parsed });
  } catch (err) {
    console.error('Error fetching defect master:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve defect master.' });
  }
}

/**
 * Get distinct defect categories
 */
async function getDefectCategories(req, res) {
  try {
    const rows = await query('SELECT DISTINCT category FROM defect_masters WHERE is_active = 1 ORDER BY category ASC');
    const categories = rows.map(r => r.category);
    return res.json({ success: true, categories });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories.' });
  }
}

/**
 * Create a new defect item in master
 */
async function createDefect(req, res) {
  try {
    const { code, name, category, description, severity_default, reference_images, sort_order } = req.body;

    if (!code || !name || !category) {
      return res.status(400).json({ success: false, message: 'Defect code, name, and category are required.' });
    }

    // Check duplicate code
    const existing = await query('SELECT id FROM defect_masters WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: `Defect code "${code}" already exists.` });
    }

    const refJson = reference_images ? (typeof reference_images === 'string' ? reference_images : JSON.stringify(reference_images)) : '[]';

    const result = await query(
      `INSERT INTO defect_masters (code, name, category, description, severity_default, reference_images, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        code,
        name,
        category,
        description || '',
        severity_default || 'minor',
        refJson,
        parseInt(sort_order || 0, 10)
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Defect created successfully in Defect Master.',
      defectId: result.insertId
    });
  } catch (err) {
    console.error('Error creating defect:', err);
    return res.status(500).json({ success: false, message: 'Failed to create defect.' });
  }
}

/**
 * Update defect item
 */
async function updateDefect(req, res) {
  try {
    const { id } = req.params;
    const { code, name, category, description, severity_default, reference_images, is_active, sort_order } = req.body;

    const refJson = reference_images !== undefined ? (typeof reference_images === 'string' ? reference_images : JSON.stringify(reference_images)) : undefined;

    await query(
      `UPDATE defect_masters SET
        code = COALESCE(?, code),
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        description = COALESCE(?, description),
        severity_default = COALESCE(?, severity_default),
        reference_images = COALESCE(?, reference_images),
        is_active = COALESCE(?, is_active),
        sort_order = COALESCE(?, sort_order)
      WHERE id = ?`,
      [code, name, category, description, severity_default, refJson, is_active, sort_order, id]
    );

    return res.json({ success: true, message: 'Defect master updated successfully.' });
  } catch (err) {
    console.error('Error updating defect:', err);
    return res.status(500).json({ success: false, message: 'Failed to update defect.' });
  }
}

/**
 * Delete / Deactivate defect item
 */
async function deleteDefect(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM defect_masters WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Defect deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete defect.' });
  }
}

/**
 * Upload reference photo for defect master
 */
async function uploadReferenceImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No reference image uploaded.' });
    }
    const imageUrl = `/media/inspections/${req.file.filename}`;
    return res.json({ success: true, imageUrl, message: 'Reference image uploaded successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to upload reference image.' });
  }
}

module.exports = {
  getDefects,
  getDefectCategories,
  createDefect,
  updateDefect,
  deleteDefect,
  uploadReferenceImage
};
