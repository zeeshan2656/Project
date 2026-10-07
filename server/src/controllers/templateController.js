const { query, transaction } = require('../config/db');

// Safe JSON parser helper
function parseJSON(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

// Safe JSON stringify helper
function stringifyJSON(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

function formatTemplateRecord(t) {
  return {
    ...t,
    disposition_config: parseJSON(t.disposition_config, []),
    auditor_config: parseJSON(t.auditor_config, {}),
    order_autofill_config: parseJSON(t.order_autofill_config, {}),
    sampling_plan_config: parseJSON(t.sampling_plan_config, {}),
    defect_master_config: parseJSON(t.defect_master_config, []),
    severity_config: parseJSON(t.severity_config, []),
    calculations_config: parseJSON(t.calculations_config, {}),
    aql_config: parseJSON(t.aql_config, {}),
    dimensional_config: parseJSON(t.dimensional_config, {}),
    sections_config: parseJSON(t.sections_config, []),
    validation_config: parseJSON(t.validation_config, {})
  };
}

/**
 * List all inspection templates with their dynamic fields & advanced configs
 */
async function getTemplates(req, res) {
  try {
    const templates = await query(`
      SELECT t.*, u.name AS creator_name,
             (SELECT COUNT(*) FROM template_fields WHERE template_id = t.id) AS field_count,
             (SELECT COUNT(*) FROM inspection_sheets WHERE template_id = t.id) AS usage_count
      FROM inspection_templates t
      JOIN users u ON t.created_by = u.id
      WHERE t.is_active = 1
      ORDER BY t.id DESC
    `);

    // Fetch fields for each template
    for (const t of templates) {
      const fields = await query(
        'SELECT * FROM template_fields WHERE template_id = ? ORDER BY sort_order ASC, id ASC',
        [t.id]
      );
      t.fields = fields.map(f => ({
        ...f,
        options: parseJSON(f.options, [])
      }));
    }

    const formatted = templates.map(formatTemplateRecord);
    return res.json({ success: true, count: formatted.length, templates: formatted });
  } catch (err) {
    console.error('Error fetching templates:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve templates.' });
  }
}

/**
 * Get single template by ID with all dynamic fields & advanced configs
 */
async function getTemplateById(req, res) {
  try {
    const { id } = req.params;
    const templates = await query('SELECT * FROM inspection_templates WHERE id = ?', [id]);
    if (templates.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection template not found.' });
    }

    const template = templates[0];
    const fields = await query(
      'SELECT * FROM template_fields WHERE template_id = ? ORDER BY sort_order ASC, id ASC',
      [id]
    );

    template.fields = fields.map(f => ({
      ...f,
      options: parseJSON(f.options, [])
    }));

    const formatted = formatTemplateRecord(template);
    return res.json({ success: true, template: formatted });
  } catch (err) {
    console.error('Error fetching template by ID:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve template details.' });
  }
}

/**
 * Create Inspection Template with Dynamic Fields & Advanced Configurations (Admin only)
 */
async function createTemplate(req, res) {
  try {
    const adminUser = req.user;
    const {
      title,
      product_type,
      description,
      fields,
      disposition_config,
      auditor_config,
      order_autofill_config,
      sampling_plan_config,
      defect_master_config,
      severity_config,
      calculations_config,
      aql_config,
      dimensional_config,
      sections_config,
      validation_config
    } = req.body;

    if (!title || !product_type) {
      return res.status(400).json({
        success: false,
        message: 'Template title and product type are required.'
      });
    }

    const createdTemplateId = await transaction(async (conn) => {
      // 1. Insert template header & advanced configs
      const [resHeader] = await conn.execute(
        `INSERT INTO inspection_templates (
          title, product_type, description, version, is_active, created_by,
          disposition_config, auditor_config, order_autofill_config, sampling_plan_config,
          defect_master_config, severity_config, calculations_config, aql_config,
          dimensional_config, sections_config, validation_config
        ) VALUES (?, ?, ?, 1, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title,
          product_type,
          description || '',
          adminUser.id,
          stringifyJSON(disposition_config),
          stringifyJSON(auditor_config),
          stringifyJSON(order_autofill_config),
          stringifyJSON(sampling_plan_config),
          stringifyJSON(defect_master_config),
          stringifyJSON(severity_config),
          stringifyJSON(calculations_config),
          stringifyJSON(aql_config),
          stringifyJSON(dimensional_config),
          stringifyJSON(sections_config),
          stringifyJSON(validation_config)
        ]
      );
      const templateId = resHeader.insertId;

      // 2. Insert dynamic fields (if any)
      if (fields && Array.isArray(fields)) {
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i];
          const optionsJson = stringifyJSON(f.options);

          await conn.execute(
            `INSERT INTO template_fields (
              template_id, field_name, field_label, field_type, unit, is_required, options, sort_order, help_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              templateId,
              f.field_name || `field_${i + 1}`,
              f.field_label || f.field_name || `Field ${i + 1}`,
              f.field_type || 'numeric_defect',
              f.unit || null,
              f.is_required ? 1 : 0,
              optionsJson,
              f.sort_order !== undefined ? f.sort_order : i + 1,
              f.help_text || null
            ]
          );
        }
      }

      return templateId;
    });

    return res.status(201).json({
      success: true,
      message: 'Inspection template created successfully.',
      templateId: createdTemplateId
    });
  } catch (err) {
    console.error('Error creating template:', err);
    return res.status(500).json({ success: false, message: 'Failed to create template.' });
  }
}

/**
 * Update Template and its fields/configurations (Admin only)
 */
async function updateTemplate(req, res) {
  try {
    const { id } = req.params;
    const {
      title,
      product_type,
      description,
      is_active,
      fields,
      disposition_config,
      auditor_config,
      order_autofill_config,
      sampling_plan_config,
      defect_master_config,
      severity_config,
      calculations_config,
      aql_config,
      dimensional_config,
      sections_config,
      validation_config
    } = req.body;

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE inspection_templates SET
          title = COALESCE(?, title),
          product_type = COALESCE(?, product_type),
          description = COALESCE(?, description),
          is_active = COALESCE(?, is_active),
          disposition_config = COALESCE(?, disposition_config),
          auditor_config = COALESCE(?, auditor_config),
          order_autofill_config = COALESCE(?, order_autofill_config),
          sampling_plan_config = COALESCE(?, sampling_plan_config),
          defect_master_config = COALESCE(?, defect_master_config),
          severity_config = COALESCE(?, severity_config),
          calculations_config = COALESCE(?, calculations_config),
          aql_config = COALESCE(?, aql_config),
          dimensional_config = COALESCE(?, dimensional_config),
          sections_config = COALESCE(?, sections_config),
          validation_config = COALESCE(?, validation_config),
          version = version + 1
        WHERE id = ?`,
        [
          title,
          product_type,
          description,
          is_active,
          stringifyJSON(disposition_config),
          stringifyJSON(auditor_config),
          stringifyJSON(order_autofill_config),
          stringifyJSON(sampling_plan_config),
          stringifyJSON(defect_master_config),
          stringifyJSON(severity_config),
          stringifyJSON(calculations_config),
          stringifyJSON(aql_config),
          stringifyJSON(dimensional_config),
          stringifyJSON(sections_config),
          stringifyJSON(validation_config),
          id
        ]
      );

      // If fields are provided, replace them
      if (fields && Array.isArray(fields)) {
        await conn.execute('DELETE FROM template_fields WHERE template_id = ?', [id]);
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i];
          const optionsJson = stringifyJSON(f.options);

          await conn.execute(
            `INSERT INTO template_fields (
              template_id, field_name, field_label, field_type, unit, is_required, options, sort_order, help_text
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              f.field_name || `field_${i + 1}`,
              f.field_label || f.field_name,
              f.field_type || 'numeric_defect',
              f.unit || null,
              f.is_required ? 1 : 0,
              optionsJson,
              f.sort_order !== undefined ? f.sort_order : i + 1,
              f.help_text || null
            ]
          );
        }
      }
    });

    return res.json({ success: true, message: 'Template updated successfully.' });
  } catch (err) {
    console.error('Error updating template:', err);
    return res.status(500).json({ success: false, message: 'Failed to update template.' });
  }
}

/**
 * Delete Template
 */
async function deleteTemplate(req, res) {
  try {
    const { id } = req.params;
    // Check if in use
    const usage = await query('SELECT id FROM inspection_sheets WHERE template_id = ?', [id]);
    if (usage.length > 0) {
      // Soft-delete so existing inspection history is preserved
      await query('UPDATE inspection_templates SET is_active = 0 WHERE id = ?', [id]);
      return res.json({
        success: true,
        message: 'Template deleted successfully (archived to preserve historical inspection reports).'
      });
    }

    await query('DELETE FROM inspection_templates WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Template deleted successfully.' });
  } catch (err) {
    console.error('Error deleting template:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete template: ' + err.message });
  }
}

module.exports = {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate
};
