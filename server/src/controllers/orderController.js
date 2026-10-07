const { query, transaction } = require('../config/db');
const { broadcastOrderCreated } = require('../services/socket');

/**
 * List orders:
 * Admin gets all orders with optional filter by city, status, search term.
 * Customer gets only their own orders.
 */
async function getOrders(req, res) {
  try {
    const user = req.user;
    const { city, status, search } = req.query;

    let sql = `
      SELECT o.*, 
             c.name AS customer_name, c.company_name AS customer_company, c.email AS customer_email,
             (SELECT COUNT(*) FROM inspection_sheets WHERE order_id = o.id) AS inspections_count,
             latest_ins.id AS sheet_id, latest_ins.sheet_number, latest_ins.status AS sheet_status,
             emp.name AS assigned_employee_name, emp.employee_code AS assigned_employee_code
      FROM orders o
      JOIN users c ON o.customer_id = c.id
      LEFT JOIN (
        SELECT ins1.*
        FROM inspection_sheets ins1
        JOIN (
          SELECT order_id, MAX(id) AS max_id
          FROM inspection_sheets
          GROUP BY order_id
        ) ins2 ON ins1.id = ins2.max_id
      ) latest_ins ON latest_ins.order_id = o.id
      LEFT JOIN users emp ON latest_ins.assigned_employee_id = emp.id
      WHERE 1=1
    `;
    const params = [];

    if (user.role === 'customer') {
      sql += ' AND o.customer_id = ?';
      params.push(user.id);
    }

    if (city) {
      sql += ' AND o.factory_city = ?';
      params.push(city);
    }

    if (status) {
      sql += ' AND o.inspection_status = ?';
      params.push(status);
    }

    if (search) {
      sql += ' AND (o.order_number LIKE ? OR o.po_number LIKE ? OR o.factory_name LIKE ? OR o.product_type LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    sql += ' ORDER BY o.id DESC';

    const orders = await query(sql, params);
    return res.json({ success: true, count: orders.length, orders });
  } catch (err) {
    console.error('Error fetching orders:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
}

/**
 * Get single order details with linked inspection sheets and audit records
 */
async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    let sql = `
      SELECT o.*, 
             c.name AS customer_name, c.company_name AS customer_company, c.email AS customer_email, c.phone AS customer_phone
      FROM orders o
      JOIN users c ON o.customer_id = c.id
      WHERE o.id = ?
    `;
    const params = [id];

    if (user.role === 'customer') {
      sql += ' AND o.customer_id = ?';
      params.push(user.id);
    }

    const rows = await query(sql, params);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const order = rows[0];

    // Fetch ALL inspections linked to this order
    const inspections = await query(
      `SELECT ins.id, ins.sheet_number, ins.status, ins.ordered_quantity,
              ins.inspected_quantity, ins.total_defect_count, ins.overall_defect_percentage,
              ins.pass_fail_result, ins.disposition, ins.started_at, ins.submitted_at, ins.reviewed_at,
              ins.created_at,
              tmpl.id AS template_id, tmpl.title AS template_title, tmpl.product_type AS template_product_type,
              emp.id AS assigned_employee_id, emp.name AS assigned_employee_name, emp.employee_code AS assigned_employee_code, emp.city AS employee_city
       FROM inspection_sheets ins
       LEFT JOIN inspection_templates tmpl ON ins.template_id = tmpl.id
       LEFT JOIN users emp ON ins.assigned_employee_id = emp.id
       WHERE ins.order_id = ?
       ORDER BY ins.id DESC`,
      [order.id]
    );

    order.inspections = inspections;
    order.inspections_count = inspections.length;

    // Default backward compatible properties to the most recent inspection
    if (inspections.length > 0) {
      const latest = inspections[0];
      order.sheet_id = latest.id;
      order.sheet_number = latest.sheet_number;
      order.sheet_status = latest.status;
      order.sheet_ordered_quantity = latest.ordered_quantity;
      order.inspected_quantity = latest.inspected_quantity;
      order.total_defect_count = latest.total_defect_count;
      order.overall_defect_percentage = latest.overall_defect_percentage;
      order.pass_fail_result = latest.pass_fail_result;
      order.assigned_employee_id = latest.assigned_employee_id;
      order.assigned_employee_name = latest.assigned_employee_name;
      order.assigned_employee_code = latest.assigned_employee_code;
    }

    return res.json({ success: true, order });
  } catch (err) {
    console.error('Error fetching order by ID:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch order details.' });
  }
}

/**
 * List all inspection sheets specifically for an order
 */
async function getOrderInspections(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role === 'customer') {
      const orderCheck = await query('SELECT id FROM orders WHERE id = ? AND customer_id = ?', [id, user.id]);
      if (orderCheck.length === 0) {
        return res.status(403).json({ success: false, message: 'Access denied to this order.' });
      }
    }

    const inspections = await query(
      `SELECT ins.id, ins.sheet_number, ins.status, ins.ordered_quantity,
              ins.inspected_quantity, ins.total_defect_count, ins.overall_defect_percentage,
              ins.pass_fail_result, ins.disposition, ins.started_at, ins.submitted_at, ins.reviewed_at,
              ins.created_at,
              tmpl.id AS template_id, tmpl.title AS template_title, tmpl.product_type AS template_product_type,
              emp.id AS assigned_employee_id, emp.name AS assigned_employee_name, emp.employee_code AS assigned_employee_code, emp.city AS employee_city
       FROM inspection_sheets ins
       LEFT JOIN inspection_templates tmpl ON ins.template_id = tmpl.id
       LEFT JOIN users emp ON ins.assigned_employee_id = emp.id
       WHERE ins.order_id = ?
       ORDER BY ins.id DESC`,
      [id]
    );

    return res.json({ success: true, count: inspections.length, inspections });
  } catch (err) {
    console.error('Error fetching order inspections:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve order inspections.' });
  }
}

/**
 * Create Order:
 * Customer creates for themselves, or Admin creates on behalf of selected customer.
 * Real-time event emitted to Admin Dashboard immediately!
 */
async function createOrder(req, res) {
  try {
    const user = req.user;
    const {
      customer_id,
      po_number,
      product_type,
      product_description,
      factory_name,
      factory_city,
      factory_address,
      factory_contact_name,
      factory_contact_phone,
      factory_map_url,
      total_quantity,
      unit,
      order_date
    } = req.body;

    if (!po_number || !product_type || !factory_name || !factory_city || !factory_address || !total_quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required order fields: PO number, product type, factory name, city, address, and quantity.'
      });
    }

    let targetCustomerId = user.id;
    if (user.role === 'admin') {
      if (!customer_id) {
        return res.status(400).json({ success: false, message: 'Admin must specify target customer_id.' });
      }
      targetCustomerId = customer_id;
    }

    // Generate unique order number (e.g. ORD-2026-XXXX)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const order_number = `ORD-${new Date().getFullYear()}-${randomSuffix}`;

    const insertResult = await query(
      `INSERT INTO orders (
        order_number, customer_id, po_number, product_type, product_description,
        factory_name, factory_city, factory_address, factory_contact_name, factory_contact_phone,
        factory_map_url, total_quantity, unit, order_date, inspection_status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Unassigned', ?)`,
      [
        order_number,
        targetCustomerId,
        po_number,
        product_type,
        product_description || '',
        factory_name,
        factory_city,
        factory_address,
        factory_contact_name || null,
        factory_contact_phone || null,
        factory_map_url || null,
        parseInt(total_quantity, 10),
        unit || 'pieces',
        order_date || new Date().toISOString().split('T')[0],
        user.id
      ]
    );

    const newOrderId = insertResult.insertId;

    // Fetch created order to broadcast
    const createdRows = await query(
      `SELECT o.*, c.name AS customer_name, c.company_name AS customer_company 
       FROM orders o JOIN users c ON o.customer_id = c.id WHERE o.id = ?`,
      [newOrderId]
    );

    const newOrder = createdRows[0];

    // Real-time broadcast!
    broadcastOrderCreated(newOrder, user.name);

    return res.status(201).json({
      success: true,
      message: 'Order created successfully and queued for inspection assignment.',
      order: newOrder
    });
  } catch (err) {
    console.error('Error creating order:', err);
    return res.status(500).json({ success: false, message: 'Failed to create order.' });
  }
}

/**
 * Update Order
 */
async function updateOrder(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;
    const {
      po_number,
      product_type,
      product_description,
      factory_name,
      factory_city,
      factory_address,
      factory_contact_name,
      factory_contact_phone,
      factory_map_url,
      total_quantity,
      unit,
      order_date
    } = req.body;

    // Check ownership if customer
    if (user.role === 'customer') {
      const check = await query('SELECT id FROM orders WHERE id = ? AND customer_id = ?', [id, user.id]);
      if (check.length === 0) {
        return res.status(403).json({ success: false, message: 'You are not authorized to edit this order.' });
      }
    }

    await query(
      `UPDATE orders SET
        po_number = COALESCE(?, po_number),
        product_type = COALESCE(?, product_type),
        product_description = COALESCE(?, product_description),
        factory_name = COALESCE(?, factory_name),
        factory_city = COALESCE(?, factory_city),
        factory_address = COALESCE(?, factory_address),
        factory_contact_name = COALESCE(?, factory_contact_name),
        factory_contact_phone = COALESCE(?, factory_contact_phone),
        factory_map_url = COALESCE(?, factory_map_url),
        total_quantity = COALESCE(?, total_quantity),
        unit = COALESCE(?, unit),
        order_date = COALESCE(?, order_date)
      WHERE id = ?`,
      [
        po_number,
        product_type,
        product_description,
        factory_name,
        factory_city,
        factory_address,
        factory_contact_name,
        factory_contact_phone,
        factory_map_url,
        total_quantity,
        unit,
        order_date,
        id
      ]
    );

    return res.json({ success: true, message: 'Order updated successfully.' });
  } catch (err) {
    console.error('Error updating order:', err);
    return res.status(500).json({ success: false, message: 'Failed to update order.' });
  }
}

/**
 * Delete Order (Admin only)
 */
async function deleteOrder(req, res) {
  try {
    const { id } = req.params;
    await query('DELETE FROM orders WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Order deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete order.' });
  }
}

module.exports = {
  getOrders,
  getOrderById,
  getOrderInspections,
  createOrder,
  updateOrder,
  deleteOrder
};
