const { query, transaction, pool } = require('../config/db');
const { broadcastInspectionStatus } = require('../services/socket');

function parseJSON(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch (e) {
    return fallback;
  }
}

function stringifyJSON(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

/**
 * List inspections with filtering based on user role
 */
async function getInspections(req, res) {
  try {
    const user = req.user;
    const { status, city, employeeId, orderId } = req.query;

    let sql = `
      SELECT ins.*,
             o.order_number, o.po_number, o.product_type, o.factory_name, o.factory_city, o.factory_address,
             o.factory_contact_name, o.factory_contact_phone, o.factory_map_url,
             cust.name AS customer_name, cust.company_name AS customer_company,
             tmpl.title AS template_title,
             emp.name AS assigned_employee_name, emp.employee_code AS assigned_employee_code, emp.phone AS employee_phone,
             (SELECT COUNT(*) FROM inspection_photos WHERE sheet_id = ins.id) AS photo_count
      FROM inspection_sheets ins
      JOIN orders o ON ins.order_id = o.id
      JOIN users cust ON o.customer_id = cust.id
      JOIN inspection_templates tmpl ON ins.template_id = tmpl.id
      JOIN users emp ON ins.assigned_employee_id = emp.id
      WHERE 1=1
    `;
    const params = [];

    if (user.role === 'employee') {
      sql += ' AND ins.assigned_employee_id = ?';
      params.push(user.id);
    } else if (user.role === 'customer') {
      sql += ' AND o.customer_id = ?';
      params.push(user.id);
    }

    if (status) {
      sql += ' AND ins.status = ?';
      params.push(status);
    }

    if (city) {
      sql += ' AND o.factory_city = ?';
      params.push(city);
    }

    if (employeeId && user.role === 'admin') {
      sql += ' AND ins.assigned_employee_id = ?';
      params.push(employeeId);
    }

    if (orderId) {
      sql += ' AND ins.order_id = ?';
      params.push(orderId);
    }

    sql += ' ORDER BY ins.id DESC';

    const inspections = await query(sql, params);
    return res.json({ success: true, count: inspections.length, inspections });
  } catch (err) {
    console.error('Error fetching inspections:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve inspections.' });
  }
}

/**
 * Get comprehensive inspection sheet details:
 * fields, filled values, uploaded photos, order metadata, template configs, and audit logs
 */
async function getInspectionById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    let sql = `
      SELECT ins.*,
             o.id AS order_id, o.order_number, o.po_number, o.product_type, o.product_description,
             o.total_quantity AS order_total_quantity,
             o.factory_name, o.factory_city, o.factory_address, o.factory_contact_name, o.factory_contact_phone, o.factory_map_url,
             cust.id AS customer_id, cust.name AS customer_name, cust.company_name AS customer_company, cust.email AS customer_email,
             tmpl.id AS template_id, tmpl.title AS template_title, tmpl.product_type AS template_product_type,
             tmpl.disposition_config, tmpl.auditor_config, tmpl.order_autofill_config, tmpl.sampling_plan_config,
             tmpl.defect_master_config, tmpl.severity_config, tmpl.calculations_config, tmpl.aql_config,
             tmpl.dimensional_config, tmpl.sections_config, tmpl.validation_config,
             emp.id AS assigned_employee_id, emp.name AS assigned_employee_name, emp.employee_code AS assigned_employee_code, emp.phone AS employee_phone,
             reviewer.name AS reviewer_name
      FROM inspection_sheets ins
      JOIN orders o ON ins.order_id = o.id
      JOIN users cust ON o.customer_id = cust.id
      JOIN inspection_templates tmpl ON ins.template_id = tmpl.id
      JOIN users emp ON ins.assigned_employee_id = emp.id
      LEFT JOIN users reviewer ON ins.reviewed_by = reviewer.id
      WHERE ins.id = ?
    `;
    const params = [id];

    if (user.role === 'employee') {
      sql += ' AND ins.assigned_employee_id = ?';
      params.push(user.id);
    } else if (user.role === 'customer') {
      sql += ' AND o.customer_id = ?';
      params.push(user.id);
    }

    const rows = await query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspection sheet not found or unauthorized.' });
    }

    const inspection = rows[0];

    // Parse Template Configurations
    inspection.disposition_config = parseJSON(inspection.disposition_config, ['Accepted', 'Rejected', 'Hold', 'Conditional Accepted', 'Pending']);
    inspection.auditor_config = parseJSON(inspection.auditor_config, {
      fields: ['inspector_name', 'inspection_date', 'inspection_time', 'department', 'factory_rep', 'qa_rep']
    });
    inspection.order_autofill_config = parseJSON(inspection.order_autofill_config, {
      vendor_supplier: 'auto',
      po_number: 'auto',
      reference_number: 'auto',
      article: 'auto',
      article_quantity: 'auto',
      first_ship_qty: 'auto',
      ready_qty: 'editable',
      short_qty: 'editable',
      factory_name: 'auto',
      factory_city: 'auto'
    });
    inspection.sampling_plan_config = parseJSON(inspection.sampling_plan_config, {
      lot_size_default: inspection.ordered_quantity || 5000,
      sample_size_default: 80,
      visual_sample_size_aql_4_default: 80,
      visual_sample_size_aql_2_5_default: 80,
      level_default: 'Level I',
      dimensional_sample_size_default: 13
    });
    inspection.defect_master_config = parseJSON(inspection.defect_master_config, []);
    inspection.severity_config = parseJSON(inspection.severity_config, [
      { name: 'Minor', weight: 1, limit: 10 },
      { name: 'Major', weight: 1, limit: 5 },
      { name: 'Critical', weight: 1, limit: 0 }
    ]);
    inspection.calculations_config = parseJSON(inspection.calculations_config, {
      defect_pct_formula: 'count / sample_size * 100',
      pass_criteria: 'critical == 0 && major <= 5'
    });
    inspection.aql_config = parseJSON(inspection.aql_config, [
      { lot_min: 2, lot_max: 500, sample_size: 13, aql_2_5_ac: 1, aql_2_5_re: 2, aql_4_0_ac: 1, aql_4_0_re: 2 },
      { lot_min: 501, lot_max: 3200, sample_size: 50, aql_2_5_ac: 3, aql_2_5_re: 4, aql_4_0_ac: 5, aql_4_0_re: 6 },
      { lot_min: 3201, lot_max: 10000, sample_size: 80, aql_2_5_ac: 5, aql_2_5_re: 6, aql_4_0_ac: 7, aql_4_0_re: 8 },
      { lot_min: 10001, lot_max: 35000, sample_size: 125, aql_2_5_ac: 7, aql_2_5_re: 8, aql_4_0_ac: 10, aql_4_0_re: 11 }
    ]);
    inspection.dimensional_config = parseJSON(inspection.dimensional_config, [
      { param: 'Width', spec: '72"', min: '71.5"', max: '72.5"', unit: 'inch', samples_count: 13 },
      { param: 'Length', spec: '96"', min: '95"', max: '97"', unit: 'inch', samples_count: 13 },
      { param: 'Drop', spec: '14"', min: '13.5"', max: '14.5"', unit: 'inch', samples_count: 13 },
      { param: 'SPI', spec: '10', min: '9', max: '11', unit: 'stitches', samples_count: 13 },
      { param: 'Piece Weight', spec: '850', min: '830', max: '870', unit: 'g', samples_count: 13 },
      { param: 'Bale Weight', spec: '45', min: '44', max: '46', unit: 'kg', samples_count: 13 },
      { param: 'Carton Dimensions', spec: '20x15.5x12', min: '', max: '', unit: 'inch', samples_count: 13 }
    ]);
    inspection.sections_config = parseJSON(inspection.sections_config, [
      { id: 'disposition', label: 'Inspection Disposition', enabled: true },
      { id: 'general_info', label: 'General & Auditor Information', enabled: true },
      { id: 'order_autofill', label: 'Purchase Order Information', enabled: true },
      { id: 'sampling_plan', label: 'Sampling Plan Matrix', enabled: true },
      { id: 'defect_findings', label: 'Defect Inspection & Findings', enabled: true },
      { id: 'dimensional', label: 'Dimensional Inspection (13 Samples)', enabled: true },
      { id: 'aql', label: 'AQL Acceptance / Rejection Table', enabled: true },
      { id: 'packaging_remarks', label: 'Packaging & General Remarks', enabled: true },
      { id: 'signatures', label: 'Signatures & Digital Sign-off', enabled: true }
    ]);
    inspection.validation_config = parseJSON(inspection.validation_config, {
      require_disposition: true,
      require_findings_photos: false,
      require_signatures: false
    });

    // Parse / Populate Inspection Sheet Live Data
    const lotSizeDefault = inspection.ordered_quantity || inspection.order_total_quantity || 5000;

    inspection.general_info_data = parseJSON(inspection.general_info_data, {
      inspector_name: inspection.assigned_employee_name || '',
      inspection_date: new Date().toISOString().split('T')[0],
      inspection_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      department: 'Quality Assurance / Fabric Inspection',
      factory_rep: inspection.factory_contact_name || '',
      qa_rep: 'Apex Quality Directorate'
    });

    inspection.order_autofill_data = parseJSON(inspection.order_autofill_data, {
      vendor_supplier: inspection.factory_name || '',
      po_number: inspection.po_number || '',
      reference_number: inspection.order_number || '',
      article: inspection.product_type || '',
      article_quantity: inspection.ordered_quantity || inspection.order_total_quantity || 0,
      first_ship_qty: inspection.ordered_quantity || inspection.order_total_quantity || 0,
      ready_qty: inspection.ordered_quantity || inspection.order_total_quantity || 0,
      short_qty: 0,
      factory_name: inspection.factory_name || '',
      factory_city: inspection.factory_city || ''
    });

    inspection.sampling_plan_data = parseJSON(inspection.sampling_plan_data, {
      lot_size: lotSizeDefault,
      sample_size: 80,
      visual_sample_size_aql_4: 80,
      visual_sample_size_aql_2_5: 80,
      aql_level: 'Level I',
      labeling_sample_size: Math.ceil(Math.sqrt(lotSizeDefault)) + 1,
      dimensional_sample_size: 13
    });

    inspection.defect_findings_data = parseJSON(inspection.defect_findings_data, []);
    
    // Dimensional measurements initialization
    let dims = parseJSON(inspection.dimensional_data, []);
    if ((!dims || dims.length === 0) && Array.isArray(inspection.dimensional_config) && inspection.dimensional_config.length > 0) {
      dims = inspection.dimensional_config.map(dim => ({
        param: dim.param || '',
        spec: dim.spec || '',
        min: dim.min || '',
        max: dim.max || '',
        unit: dim.unit || 'inch',
        samples: Array(dim.samples_count || 13).fill(''),
        pass_fail: 'Pass',
        remarks: ''
      }));
    }
    inspection.dimensional_data = dims;

    inspection.aql_results_data = parseJSON(inspection.aql_results_data, {
      aql_level: 'Level I',
      lot_size: lotSizeDefault,
      sample_size: 80,
      minor_total: 0,
      major_total: 0,
      critical_total: 0,
      aql_2_5_result: 'Pass',
      aql_4_0_result: 'Pass',
      final_decision: 'Pass'
    });

    inspection.signatures_data = parseJSON(inspection.signatures_data, {
      auditor_name: inspection.assigned_employee_name || '',
      auditor_signed: false,
      factory_rep_name: inspection.factory_contact_name || '',
      factory_rep_signed: false,
      qa_rep_name: 'Apex Quality Directorate',
      qa_rep_signed: false,
      signed_at: null
    });

    if (!inspection.disposition) {
      inspection.disposition = 'Pending';
    }

    // Fetch legacy template fields and any recorded field values
    const fields = await query(
      `SELECT tf.*, 
              ifv.id AS value_id, ifv.value_text, ifv.value_number, ifv.calculated_percentage
       FROM template_fields tf
       LEFT JOIN inspection_field_values ifv ON ifv.field_id = tf.id AND ifv.sheet_id = ?
       WHERE tf.template_id = ?
       ORDER BY tf.sort_order ASC, tf.id ASC`,
      [id, inspection.template_id]
    );

    inspection.fields = fields.map(f => ({
      ...f,
      options: parseJSON(f.options, [])
    }));

    // Fetch uploaded photos
    const photos = await query(
      `SELECT ip.*, tf.field_label 
       FROM inspection_photos ip
       LEFT JOIN template_fields tf ON ip.field_id = tf.id
       WHERE ip.sheet_id = ?
       ORDER BY ip.id DESC`,
      [id]
    );
    inspection.photos = photos;

    // Fetch full audit log trail
    const auditLogs = await query(
      `SELECT al.*, u.name AS actor_name, u.role AS actor_role
       FROM inspection_audit_logs al
       JOIN users u ON al.actor_id = u.id
       WHERE al.sheet_id = ?
       ORDER BY al.id ASC`,
      [id]
    );
    inspection.auditLogs = auditLogs;

    return res.json({ success: true, inspection });
  } catch (err) {
    console.error('Error fetching inspection by ID:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve inspection details.' });
  }
}

/**
 * Admin: Generate Inspection Sheet from Template & Assign to Employee
 * Atomic Transaction with auto-populated order & template structures
 */
async function createInspection(req, res) {
  try {
    const adminUser = req.user;
    const { order_id, template_id, assigned_employee_id } = req.body;

    if (!order_id || !template_id || !assigned_employee_id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID, Template ID, and Assigned Employee are required.'
      });
    }

    const sheetId = await transaction(async (conn) => {
      // 1. Check order
      const [orderRows] = await conn.execute('SELECT * FROM orders WHERE id = ? FOR UPDATE', [order_id]);
      if (orderRows.length === 0) {
        throw new Error('Order not found.');
      }
      const order = orderRows[0];

      // 2. Check employee
      const [empRows] = await conn.execute("SELECT id, name, employee_code FROM users WHERE id = ? AND role = 'employee'", [assigned_employee_id]);
      if (empRows.length === 0) {
        throw new Error('Assigned employee not found.');
      }
      const emp = empRows[0];

      // 3. Fetch template configs
      const [tmplRows] = await conn.execute('SELECT * FROM inspection_templates WHERE id = ?', [template_id]);
      if (tmplRows.length === 0) {
        throw new Error('Inspection template not found.');
      }
      const tmpl = tmplRows[0];

      // 4. Generate unique sheet number: INS-YEAR-RANDOM
      const sheetNumber = `INS-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 5. Pre-fill auto-fill structures
      const lotSize = order.total_quantity || 5000;
      const initialGeneralInfo = {
        inspector_name: emp.name,
        inspection_date: new Date().toISOString().split('T')[0],
        inspection_time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        department: 'Quality Assurance / Fabric Inspection',
        factory_rep: order.factory_contact_name || '',
        qa_rep: 'Apex Quality Directorate'
      };

      const initialOrderAutofill = {
        vendor_supplier: order.factory_name || '',
        po_number: order.po_number || '',
        reference_number: order.order_number || '',
        article: order.product_type || '',
        article_quantity: order.total_quantity || 0,
        first_ship_qty: order.total_quantity || 0,
        ready_qty: order.total_quantity || 0,
        short_qty: 0,
        factory_name: order.factory_name || '',
        factory_city: order.factory_city || ''
      };

      const initialSamplingPlan = {
        lot_size: lotSize,
        sample_size: 80,
        visual_sample_size_aql_4: 80,
        visual_sample_size_aql_2_5: 80,
        aql_level: 'Level I',
        labeling_sample_size: Math.ceil(Math.sqrt(lotSize)) + 1,
        dimensional_sample_size: 13
      };

      const parsedDimConfig = parseJSON(tmpl.dimensional_config, []);
      const initialDimensional = Array.isArray(parsedDimConfig) && parsedDimConfig.length > 0
        ? parsedDimConfig.map(dim => ({
            param: dim.param || '',
            spec: dim.spec || '',
            min: dim.min || '',
            max: dim.max || '',
            unit: dim.unit || 'inch',
            samples: Array(dim.samples_count || 13).fill(''),
            pass_fail: 'Pass',
            remarks: ''
          }))
        : [];

      const initialSignatures = {
        auditor_name: emp.name,
        auditor_signed: false,
        factory_rep_name: order.factory_contact_name || '',
        factory_rep_signed: false,
        qa_rep_name: 'Apex Quality Directorate',
        qa_rep_signed: false,
        signed_at: null
      };

      // 6. Create inspection sheet
      const [insertSheet] = await conn.execute(
        `INSERT INTO inspection_sheets (
          sheet_number, order_id, template_id, assigned_employee_id, status, ordered_quantity,
          disposition, general_info_data, order_autofill_data, sampling_plan_data,
          defect_findings_data, dimensional_data, signatures_data
        ) VALUES (?, ?, ?, ?, 'Not Started', ?, 'Pending', ?, ?, ?, '[]', ?, ?)`,
        [
          sheetNumber,
          order.id,
          template_id,
          emp.id,
          order.total_quantity,
          stringifyJSON(initialGeneralInfo),
          stringifyJSON(initialOrderAutofill),
          stringifyJSON(initialSamplingPlan),
          stringifyJSON(initialDimensional),
          stringifyJSON(initialSignatures)
        ]
      );
      const newSheetId = insertSheet.insertId;

      // 7. Update order status
      await conn.execute("UPDATE orders SET inspection_status = 'Assigned' WHERE id = ?", [order.id]);

      // 8. Record Audit Log
      await conn.execute(
        `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
         VALUES (?, ?, 'ASSIGNED', 'Unassigned', 'Not Started', ?)`,
        [newSheetId, adminUser.id, `Assigned to ${emp.name} (${emp.employee_code}) by Admin.`]
      );

      return newSheetId;
    });

    // Fetch created sheet for live broadcast
    const createdSheetRows = await query('SELECT * FROM inspection_sheets WHERE id = ?', [sheetId]);
    broadcastInspectionStatus(createdSheetRows[0], 'ASSIGNED', adminUser.name);

    return res.status(201).json({
      success: true,
      message: 'Inspection sheet generated and assigned successfully.',
      sheetId
    });
  } catch (err) {
    console.error('Error creating inspection sheet:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to create inspection sheet.' });
  }
}

/**
 * Live status update: Employee opens the sheet on site -> status becomes "In Progress"
 * Broadcasts via WebSocket instantly to Admin Dashboard!
 */
async function startInspection(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    const sheet = await transaction(async (conn) => {
      const [rows] = await conn.execute(
        'SELECT * FROM inspection_sheets WHERE id = ? FOR UPDATE',
        [id]
      );
      if (rows.length === 0) {
        throw new Error('Inspection sheet not found.');
      }

      const s = rows[0];
      // Only transition to 'In Progress' if currently 'Not Started' or 'Needs Re-inspection'
      if (s.status === 'Not Started' || s.status === 'Needs Re-inspection') {
        const prevStatus = s.status;
        await conn.execute(
          "UPDATE inspection_sheets SET status = 'In Progress', started_at = COALESCE(started_at, NOW()) WHERE id = ?",
          [id]
        );
        await conn.execute(
          "UPDATE orders SET inspection_status = 'In Progress' WHERE id = ?",
          [s.order_id]
        );

        await conn.execute(
          `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
           VALUES (?, ?, 'OPENED', ?, 'In Progress', 'Inspector opened inspection sheet on mobile device.')`,
          [id, user.id, prevStatus]
        );

        s.status = 'In Progress';
      }

      return s;
    });

    broadcastInspectionStatus(sheet, 'OPENED', user.name);

    return res.json({
      success: true,
      message: 'Inspection status updated to In Progress in real time.',
      inspection: sheet
    });
  } catch (err) {
    console.error('Error starting inspection:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to start inspection.' });
  }
}

/**
 * Concurrency-Safe: Employee Saves Draft
 * Saves partial numeric, measurement, dropdown, defect findings, dimensional matrix, sampling, and remarks.
 * Notifies Admin Dashboard live via WebSocket.
 */
async function saveDraft(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const {
      inspected_quantity,
      employee_notes,
      field_values,
      disposition,
      general_info_data,
      order_autofill_data,
      sampling_plan_data,
      defect_findings_data,
      dimensional_data,
      aql_results_data,
      signatures_data,
      packaging_remarks,
      pass_fail_result
    } = req.body;

    await transaction(async (conn) => {
      const [rows] = await conn.execute('SELECT * FROM inspection_sheets WHERE id = ? FOR UPDATE', [id]);
      if (rows.length === 0) {
        throw new Error('Inspection sheet not found.');
      }

      const s = rows[0];
      if (s.status === 'Approved') {
        throw new Error('Cannot edit an approved inspection sheet.');
      }
      if (user.role === 'employee' && s.status === 'Submitted') {
        throw new Error('This inspection has already been submitted and cannot be edited. It is in read-only mode.');
      }

      // Update sheet draft fields including all advanced structured JSONs
      await conn.execute(
        `UPDATE inspection_sheets SET 
          status = 'Draft Saved',
          inspected_quantity = COALESCE(?, inspected_quantity),
          employee_notes = COALESCE(?, employee_notes),
          disposition = COALESCE(?, disposition),
          general_info_data = COALESCE(?, general_info_data),
          order_autofill_data = COALESCE(?, order_autofill_data),
          sampling_plan_data = COALESCE(?, sampling_plan_data),
          defect_findings_data = COALESCE(?, defect_findings_data),
          dimensional_data = COALESCE(?, dimensional_data),
          aql_results_data = COALESCE(?, aql_results_data),
          signatures_data = COALESCE(?, signatures_data),
          packaging_remarks = COALESCE(?, packaging_remarks),
          pass_fail_result = COALESCE(?, pass_fail_result)
        WHERE id = ?`,
        [
          inspected_quantity ? parseInt(inspected_quantity, 10) : null,
          employee_notes || null,
          disposition || null,
          stringifyJSON(general_info_data),
          stringifyJSON(order_autofill_data),
          stringifyJSON(sampling_plan_data),
          stringifyJSON(defect_findings_data),
          stringifyJSON(dimensional_data),
          stringifyJSON(aql_results_data),
          stringifyJSON(signatures_data),
          packaging_remarks || null,
          pass_fail_result || null,
          id
        ]
      );

      await conn.execute("UPDATE orders SET inspection_status = 'Draft Saved' WHERE id = ?", [s.order_id]);

      // Save legacy field values if supplied
      if (field_values && Array.isArray(field_values)) {
        for (const item of field_values) {
          if (!item.field_id) continue;

          await conn.execute('DELETE FROM inspection_field_values WHERE sheet_id = ? AND field_id = ?', [id, item.field_id]);

          let calcPct = null;
          if (item.value_number !== null && item.value_number !== undefined && inspected_quantity && parseInt(inspected_quantity, 10) > 0) {
            calcPct = parseFloat(((parseFloat(item.value_number) / parseInt(inspected_quantity, 10)) * 100).toFixed(2));
          }

          await conn.execute(
            `INSERT INTO inspection_field_values (sheet_id, field_id, value_text, value_number, calculated_percentage)
             VALUES (?, ?, ?, ?, ?)`,
            [
              id,
              item.field_id,
              item.value_text || null,
              item.value_number !== undefined && item.value_number !== null ? parseFloat(item.value_number) : null,
              calcPct
            ]
          );
        }
      }

      // Audit Log
      await conn.execute(
        `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
         VALUES (?, ?, 'DRAFT_SAVED', ?, 'Draft Saved', 'Inspector saved in-progress draft telemetry.')`,
        [id, user.id, s.status]
      );
    });

    const updated = await query('SELECT * FROM inspection_sheets WHERE id = ?', [id]);
    broadcastInspectionStatus(updated[0], 'DRAFT_SAVED', user.name);

    return res.json({
      success: true,
      message: 'Draft progress saved safely.',
      inspection: updated[0]
    });
  } catch (err) {
    console.error('Error saving draft:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to save draft.' });
  }
}

/**
 * Concurrency-Safe: Employee Submits Completed Inspection
 * - Computes Minor, Major, Critical counts and formula percentages
 * - Computes overall defect rate against sample size
 * - Evaluates AQL limits and pass/fail criteria
 * - Marks status 'Submitted'
 * - Notifies Admin Approval Queue live via WebSocket!
 */
async function submitInspection(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const {
      inspected_quantity,
      employee_notes,
      field_values,
      disposition,
      general_info_data,
      order_autofill_data,
      sampling_plan_data,
      defect_findings_data,
      dimensional_data,
      aql_results_data,
      signatures_data,
      packaging_remarks,
      pass_fail_result
    } = req.body;

    const updatedSheet = await transaction(async (conn) => {
      const [rows] = await conn.execute('SELECT * FROM inspection_sheets WHERE id = ? FOR UPDATE', [id]);
      if (rows.length === 0) {
        throw new Error('Inspection sheet not found.');
      }

      const s = rows[0];
      if (s.status === 'Approved') {
        throw new Error('This inspection sheet has already been approved and finalized.');
      }
      if (user.role === 'employee' && s.status === 'Submitted') {
        throw new Error('This inspection sheet has already been submitted and finalized.');
      }

      // Determine Denominator (Sample Size)
      const visualAQL4 = sampling_plan_data?.visual_sample_size_aql_4 ? parseInt(sampling_plan_data.visual_sample_size_aql_4, 10) : 0;
      const visualAQL25 = sampling_plan_data?.visual_sample_size_aql_2_5 ? parseInt(sampling_plan_data.visual_sample_size_aql_2_5, 10) : 0;
      const samplingPlanSampleSize = sampling_plan_data?.sample_size ? parseInt(sampling_plan_data.sample_size, 10) : 0;
      const inspectedQtyInt = inspected_quantity ? parseInt(inspected_quantity, 10) : (samplingPlanSampleSize || (visualAQL4 + visualAQL25) || 80);

      // Process defect findings & calculate totals & percentages
      let totalMinor = 0;
      let totalMajor = 0;
      let totalCritical = 0;
      let processedFindings = [];

      if (defect_findings_data && Array.isArray(defect_findings_data)) {
        processedFindings = defect_findings_data.map(finding => {
          const minor = parseInt(finding.minor_count || 0, 10) || 0;
          const major = parseInt(finding.major_count || 0, 10) || 0;
          const critical = parseInt(finding.critical_count || 0, 10) || 0;
          const lineTotal = minor + major + critical;

          totalMinor += minor;
          totalMajor += major;
          totalCritical += critical;

          // Formula from Excel: lineTotal / (visualAQL4 + visualAQL25 or inspectedQtyInt) * 100
          const denominatorForPct = (visualAQL4 + visualAQL25) > 0 ? (visualAQL4 + visualAQL25) : (inspectedQtyInt || 1);
          const pct = parseFloat(((lineTotal / denominatorForPct) * 100).toFixed(2));

          return {
            ...finding,
            minor_count: minor,
            major_count: major,
            critical_count: critical,
            total_count: lineTotal,
            percentage: pct
          };
        });
      }

      const totalDefectCount = totalMinor + totalMajor + totalCritical;
      const overallDefectPct = parseFloat(((totalDefectCount / (inspectedQtyInt || 1)) * 100).toFixed(2));

      // Calculate AQL decision
      let determinedDecision = pass_fail_result;
      if (!determinedDecision) {
        if (totalCritical > 0) {
          determinedDecision = 'Fail';
        } else if (totalMajor > 5) {
          determinedDecision = 'Fail';
        } else {
          determinedDecision = 'Pass';
        }
      }

      const finalDisposition = disposition || (determinedDecision === 'Pass' ? 'Accepted' : 'Rejected');

      // Update inspection sheet
      await conn.execute(
        `UPDATE inspection_sheets SET
          status = 'Submitted',
          inspected_quantity = ?,
          total_defect_count = ?,
          overall_defect_percentage = ?,
          pass_fail_result = ?,
          disposition = ?,
          general_info_data = COALESCE(?, general_info_data),
          order_autofill_data = COALESCE(?, order_autofill_data),
          sampling_plan_data = COALESCE(?, sampling_plan_data),
          defect_findings_data = ?,
          dimensional_data = COALESCE(?, dimensional_data),
          aql_results_data = COALESCE(?, aql_results_data),
          signatures_data = COALESCE(?, signatures_data),
          packaging_remarks = COALESCE(?, packaging_remarks),
          employee_notes = ?,
          submitted_at = NOW()
        WHERE id = ?`,
        [
          inspectedQtyInt,
          totalDefectCount,
          overallDefectPct,
          determinedDecision,
          finalDisposition,
          stringifyJSON(general_info_data),
          stringifyJSON(order_autofill_data),
          stringifyJSON(sampling_plan_data),
          stringifyJSON(processedFindings),
          stringifyJSON(dimensional_data),
          stringifyJSON(aql_results_data),
          stringifyJSON(signatures_data),
          packaging_remarks || null,
          employee_notes || null,
          id
        ]
      );

      // Save legacy field values if supplied
      if (field_values && Array.isArray(field_values)) {
        for (const item of field_values) {
          if (!item.field_id) continue;

          await conn.execute('DELETE FROM inspection_field_values WHERE sheet_id = ? AND field_id = ?', [id, item.field_id]);

          let calcPct = null;
          let valNum = null;

          if (item.value_number !== null && item.value_number !== undefined && item.value_number !== '') {
            valNum = parseFloat(item.value_number);
            calcPct = parseFloat(((valNum / (inspectedQtyInt || 1)) * 100).toFixed(2));
          }

          await conn.execute(
            `INSERT INTO inspection_field_values (sheet_id, field_id, value_text, value_number, calculated_percentage)
             VALUES (?, ?, ?, ?, ?)`,
            [id, item.field_id, item.value_text || null, valNum, calcPct]
          );
        }
      }

      await conn.execute("UPDATE orders SET inspection_status = 'Submitted' WHERE id = ?", [s.order_id]);

      // Audit Log
      await conn.execute(
        `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
         VALUES (?, ?, 'SUBMITTED', ?, 'Submitted', ?)`,
        [
          id,
          user.id,
          s.status,
          `Submitted with ${totalDefectCount} total defects (Minor: ${totalMinor}, Major: ${totalMajor}, Critical: ${totalCritical}). Disposition: ${finalDisposition}.`
        ]
      );

      const [resSheet] = await conn.execute('SELECT * FROM inspection_sheets WHERE id = ?', [id]);
      return resSheet[0];
    });

    broadcastInspectionStatus(updatedSheet, 'SUBMITTED', user.name);

    return res.json({
      success: true,
      message: 'Inspection submitted successfully and placed in Admin Approval Queue.',
      inspection: updatedSheet
    });
  } catch (err) {
    console.error('Error submitting inspection:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to submit inspection.' });
  }
}

/**
 * Admin Review: Approve OR Send back via Re-inspection with remarks
 * - If Approved: status = 'Approved', order status = 'Approved'
 * - If Re-inspection: status = 'Needs Re-inspection', re-assigned to employee with admin's remarks
 * - Full audit log trail!
 * - Real-time WebSocket event broadcasted instantly!
 */
async function reviewInspection(req, res) {
  try {
    const adminUser = req.user;
    const { id } = req.params;
    const { decision, remarks } = req.body; // decision: 'Approved' | 'Needs Re-inspection'

    if (!decision || !['Approved', 'Needs Re-inspection'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: "Decision must be either 'Approved' or 'Needs Re-inspection'."
      });
    }

    if (decision === 'Needs Re-inspection' && (!remarks || remarks.trim() === '')) {
      return res.status(400).json({
        success: false,
        message: 'Admin remarks are mandatory when sending back an inspection for re-inspection.'
      });
    }

    const updatedSheet = await transaction(async (conn) => {
      const [rows] = await conn.execute('SELECT * FROM inspection_sheets WHERE id = ? FOR UPDATE', [id]);
      if (rows.length === 0) {
        throw new Error('Inspection sheet not found.');
      }

      const s = rows[0];
      const prevStatus = s.status;

      await conn.execute(
        `UPDATE inspection_sheets SET
          status = ?,
          admin_remarks = ?,
          reviewed_at = NOW(),
          reviewed_by = ?
        WHERE id = ?`,
        [decision, remarks || null, adminUser.id, id]
      );

      await conn.execute(
        'UPDATE orders SET inspection_status = ? WHERE id = ?',
        [decision, s.order_id]
      );

      // Audit Log
      const actionType = decision === 'Approved' ? 'APPROVED' : 'RE_INSPECTION_REQUESTED';
      await conn.execute(
        `INSERT INTO inspection_audit_logs (sheet_id, actor_id, action, previous_status, new_status, remarks)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, adminUser.id, actionType, prevStatus, decision, remarks || 'Review completed by Admin.']
      );

      const [resSheet] = await conn.execute('SELECT * FROM inspection_sheets WHERE id = ?', [id]);
      return resSheet[0];
    });

    broadcastInspectionStatus(updatedSheet, decision === 'Approved' ? 'APPROVED' : 'RE_INSPECTION_REQUESTED', adminUser.name);

    return res.json({
      success: true,
      message: decision === 'Approved' ? 'Inspection approved successfully.' : 'Inspection returned to field employee for re-inspection.',
      inspection: updatedSheet
    });
  } catch (err) {
    console.error('Error reviewing inspection:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to review inspection.' });
  }
}

/**
 * Upload Photo for Inspection Sheet (Saved to media/inspections)
 * Supports defect findings attachments & reference tags
 */
async function uploadPhoto(req, res) {
  try {
    const { id } = req.params;
    const { field_id, caption, defect_tag, defect_code, defect_name } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded.' });
    }

    // Check if inspection is already submitted or approved for employee
    if (req.user && req.user.role === 'employee') {
      const sheetRows = await query('SELECT status FROM inspection_sheets WHERE id = ?', [id]);
      if (sheetRows.length > 0 && (sheetRows[0].status === 'Submitted' || sheetRows[0].status === 'Approved')) {
        return res.status(403).json({ success: false, message: 'This inspection is locked in read-only mode. Photo evidence cannot be added.' });
      }
    }

    const photoUrl = `/media/inspections/${req.file.filename}`;
    const tag = defect_tag || (defect_name ? `Defect [Code ${defect_code || ''}]: ${defect_name}` : 'Inspection Evidence');

    const result = await query(
      `INSERT INTO inspection_photos (sheet_id, field_id, photo_url, caption, defect_tag)
       VALUES (?, ?, ?, ?, ?)`,
      [id, field_id ? parseInt(field_id, 10) : null, photoUrl, caption || (defect_name ? `Evidence for ${defect_name}` : null), tag]
    );

    return res.status(201).json({
      success: true,
      message: 'Inspection photo uploaded and attached.',
      photo: {
        id: result.insertId,
        sheet_id: id,
        photo_url: photoUrl,
        caption: caption || null,
        defect_tag: tag,
        defect_code: defect_code || null,
        defect_name: defect_name || null
      }
    });
  } catch (err) {
    console.error('Error uploading photo:', err);
    return res.status(500).json({ success: false, message: 'Failed to upload photo.' });
  }
}

module.exports = {
  getInspections,
  getInspectionById,
  createInspection,
  startInspection,
  saveDraft,
  submitInspection,
  reviewInspection,
  uploadPhoto
};
