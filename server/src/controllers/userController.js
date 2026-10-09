const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

/**
 * Admin: List Customers with order count and country info
 */
async function getCustomers(req, res) {
  try {
    const customers = await query(`
      SELECT u.id, u.name, u.email, u.plain_password, u.company_name, u.city, u.country, u.phone, u.status, u.created_at,
             COUNT(o.id) AS total_orders
      FROM users u
      LEFT JOIN orders o ON o.customer_id = u.id
      WHERE u.role = 'customer' AND (u.is_deleted = 0 OR u.is_deleted IS NULL)
      GROUP BY u.id
      ORDER BY u.id DESC
    `);
    return res.json({ success: true, customers });
  } catch (err) {
    console.error('Error fetching customers:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve customers.' });
  }
}

/**
 * Admin: Create Customer Account
 */
async function createCustomer(req, res) {
  try {
    const { name, email, password, company_name, city, country, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and temporary password are required.' });
    }

    const check = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (check.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (role, name, email, password_hash, plain_password, company_name, city, country, phone, status)
       VALUES ('customer', ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [name, email, password_hash, password, company_name || null, city || 'USA', country || 'USA', phone || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Customer registered successfully.',
      customerId: result.insertId
    });
  } catch (err) {
    console.error('Error creating customer:', err);
    return res.status(500).json({ success: false, message: 'Failed to create customer.' });
  }
}

/**
 * Admin: List Employees with their unique codes and active task metrics
 */
async function getEmployees(req, res) {
  try {
    const employees = await query(`
      SELECT u.id, u.name, u.email, u.plain_password, u.employee_code, u.city, u.phone, u.status, u.created_at,
             COUNT(ins.id) AS total_inspections,
             SUM(CASE WHEN ins.status IN ('Not Started', 'In Progress', 'Needs Re-inspection') THEN 1 ELSE 0 END) AS active_tasks
      FROM users u
      LEFT JOIN inspection_sheets ins ON ins.assigned_employee_id = u.id
      WHERE u.role = 'employee' AND (u.is_deleted = 0 OR u.is_deleted IS NULL)
      GROUP BY u.id
      ORDER BY u.id ASC
    `);
    return res.json({ success: true, employees });
  } catch (err) {
    console.error('Error fetching employees:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve employees.' });
  }
}

/**
 * Admin: Create Employee with unique employee code
 */
async function createEmployee(req, res) {
  try {
    const { name, email, password, employee_code, city, phone } = req.body;

    if (!name || !password) {
      return res.status(400).json({ success: false, message: 'Name and password are required.' });
    }

    // Auto-generate employee code if not provided: EMP-100X
    let finalCode = employee_code;
    if (!finalCode) {
      const lastCodeRow = await query(
        "SELECT employee_code FROM users WHERE role = 'employee' AND employee_code LIKE 'EMP-%' ORDER BY id DESC LIMIT 1"
      );
      if (lastCodeRow.length > 0 && lastCodeRow[0].employee_code) {
        const numPart = parseInt(lastCodeRow[0].employee_code.replace('EMP-', ''), 10);
        finalCode = `EMP-${numPart + 1}`;
      } else {
        finalCode = 'EMP-1001';
      }
    }

    // Check code uniqueness
    const codeCheck = await query('SELECT id FROM users WHERE employee_code = ?', [finalCode]);
    if (codeCheck.length > 0) {
      return res.status(409).json({ success: false, message: `Employee code '${finalCode}' is already in use.` });
    }

    // Email fallback
    const finalEmail = email || `${finalCode.toLowerCase().replace('-', '')}@apexfabric.com`;
    const emailCheck = await query('SELECT id FROM users WHERE email = ?', [finalEmail]);
    if (emailCheck.length > 0) {
      return res.status(409).json({ success: false, message: `Email '${finalEmail}' is already registered.` });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (role, name, email, password_hash, plain_password, employee_code, city, country, phone, status)
       VALUES ('employee', ?, ?, ?, ?, ?, ?, 'Pakistan', ?, 'active')`,
      [name, finalEmail, password_hash, password, finalCode, city || 'Faisalabad', phone || null]
    );

    return res.status(201).json({
      success: true,
      message: `Employee ${name} registered with Code ${finalCode}.`,
      employee: {
        id: result.insertId,
        name,
        email: finalEmail,
        employee_code: finalCode,
        city: city || 'Faisalabad',
        phone
      }
    });
  } catch (err) {
    console.error('Error creating employee:', err);
    return res.status(500).json({ success: false, message: 'Failed to create employee.' });
  }
}

/**
 * Admin: Update user details (name, email, company, employee_code, city, country, phone, status, and optional password)
 */
async function updateUser(req, res) {
  try {
    const { id } = req.params;
    const { name, email, password, company_name, employee_code, city, country, phone, status } = req.body;

    const userRows = await query('SELECT * FROM users WHERE id = ?', [id]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    const user = userRows[0];

    // If email provided and changed, ensure uniqueness
    if (email && email !== user.email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (emailCheck.length > 0) {
        return res.status(409).json({ success: false, message: 'Email is already registered by another account.' });
      }
    }

    // If employee_code provided and changed, ensure uniqueness
    if (employee_code && employee_code !== user.employee_code) {
      const codeCheck = await query('SELECT id FROM users WHERE employee_code = ? AND id != ?', [employee_code, id]);
      if (codeCheck.length > 0) {
        return res.status(409).json({ success: false, message: 'Employee code is already in use.' });
      }
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (company_name !== undefined) { updates.push('company_name = ?'); params.push(company_name); }
    if (employee_code !== undefined) { updates.push('employee_code = ?'); params.push(employee_code); }
    if (city !== undefined) { updates.push('city = ?'); params.push(city); }
    if (country !== undefined) { updates.push('country = ?'); params.push(country); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (status !== undefined) { updates.push('status = ?'); params.push(status); }

    // If password is provided and non-empty, update hash AND plain_password
    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);
      updates.push('password_hash = ?');
      params.push(password_hash);
      updates.push('plain_password = ?');
      params.push(password);
    }

    if (updates.length > 0) {
      params.push(id);
      await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    const updatedUserRows = await query(
      'SELECT id, role, name, email, plain_password, employee_code, company_name, city, country, phone, status, created_at FROM users WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: 'User details updated successfully.',
      user: updatedUserRows[0]
    });
  } catch (err) {
    console.error('Error updating user:', err);
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
}

/**
 * Admin: Reset/change user password directly
 */
async function updateUserPassword(req, res) {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.trim() === '') {
      return res.status(400).json({ success: false, message: 'New password is required.' });
    }

    const userRows = await query('SELECT id FROM users WHERE id = ?', [id]);
    if (userRows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await query('UPDATE users SET password_hash = ?, plain_password = ? WHERE id = ?', [password_hash, password, id]);

    return res.json({
      success: true,
      message: 'Password updated successfully.',
      plain_password: password
    });
  } catch (err) {
    console.error('Error updating password:', err);
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
}

/**
 * Admin: Get customer details and all their purchase orders
 */
async function getCustomerDetailsAndOrders(req, res) {
  try {
    const { id } = req.params;

    const custRows = await query(
      'SELECT id, role, name, email, plain_password, company_name, city, country, phone, status, created_at FROM users WHERE id = ? AND role = "customer"',
      [id]
    );
    if (custRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer account not found.' });
    }
    const customer = custRows[0];

    const orders = await query(`
      SELECT o.id, o.order_number, o.po_number, o.product_type, o.product_description,
             o.factory_name, o.factory_city, o.factory_address, o.factory_contact_name, o.factory_contact_phone,
             o.total_quantity, o.unit, o.order_date, o.inspection_status, o.created_at,
             (SELECT COUNT(*) FROM inspection_sheets WHERE order_id = o.id) AS inspections_count,
             latest_ins.id AS latest_sheet_id,
             latest_ins.sheet_number AS latest_sheet_number,
             latest_ins.status AS latest_sheet_status,
             latest_ins.pass_fail_result AS latest_pass_fail_result,
             latest_ins.total_defect_count AS latest_defect_count,
             emp.name AS latest_auditor_name
      FROM orders o
      LEFT JOIN (
        SELECT ins1.*
        FROM inspection_sheets ins1
        JOIN (SELECT order_id, MAX(id) AS max_id FROM inspection_sheets GROUP BY order_id) ins2
          ON ins1.id = ins2.max_id
      ) latest_ins ON latest_ins.order_id = o.id
      LEFT JOIN users emp ON latest_ins.assigned_employee_id = emp.id
      WHERE o.customer_id = ?
      ORDER BY o.id DESC
    `, [id]);

    return res.json({
      success: true,
      customer,
      orders_count: orders.length,
      orders
    });
  } catch (err) {
    console.error('Error fetching customer orders:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve customer orders.' });
  }
}

/**
 * Admin: Get employee details and all inspections assigned to them
 */
async function getEmployeeDetailsAndInspections(req, res) {
  try {
    const { id } = req.params;

    const empRows = await query(
      'SELECT id, role, name, email, plain_password, employee_code, city, country, phone, status, created_at FROM users WHERE id = ? AND role = "employee"',
      [id]
    );
    if (empRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Field auditor account not found.' });
    }
    const employee = empRows[0];

    const inspections = await query(`
      SELECT ins.id, ins.sheet_number, ins.order_id, ins.status,
             ins.ordered_quantity, ins.inspected_quantity, ins.total_defect_count, ins.overall_defect_percentage,
             ins.pass_fail_result, ins.disposition, ins.started_at, ins.submitted_at, ins.reviewed_at, ins.created_at,
             o.order_number, o.po_number, o.product_type, o.factory_name, o.factory_city, o.factory_address,
             c.name AS customer_name, c.company_name AS customer_company,
             tmpl.title AS template_title
      FROM inspection_sheets ins
      JOIN orders o ON ins.order_id = o.id
      JOIN users c ON o.customer_id = c.id
      LEFT JOIN inspection_templates tmpl ON ins.template_id = tmpl.id
      WHERE ins.assigned_employee_id = ?
      ORDER BY ins.id DESC
    `, [id]);

    return res.json({
      success: true,
      employee,
      inspections_count: inspections.length,
      inspections
    });
  } catch (err) {
    console.error('Error fetching employee inspections:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve employee inspections.' });
  }
}

/**
 * Toggle user status (active/inactive)
 */
async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await query('UPDATE users SET status = ? WHERE id = ?', [status === 'inactive' ? 'inactive' : 'active', id]);
    return res.json({ success: true, message: `User status updated to ${status}.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user status.' });
  }
}

/**
 * Admin: Get all administrator accounts
 */
async function getAdmins(req, res) {
  try {
    const admins = await query(
      'SELECT id, role, name, email, plain_password, phone, status, created_at FROM users WHERE role = "admin" ORDER BY id ASC'
    );
    return res.json({
      success: true,
      admins
    });
  } catch (err) {
    console.error('Error fetching admins:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch admin accounts.' });
  }
}

/**
 * Admin: Create another administrator account
 */
async function createAdmin(req, res) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (role, name, email, password_hash, plain_password, phone, status)
       VALUES ('admin', ?, ?, ?, ?, ?, 'active')`,
      [name, email, password_hash, password, phone || null]
    );

    return res.status(201).json({
      success: true,
      message: `Admin account for ${name} created successfully.`,
      admin: {
        id: result.insertId,
        role: 'admin',
        name,
        email,
        plain_password: password,
        phone,
        status: 'active'
      }
    });
  } catch (err) {
    console.error('Error creating admin:', err);
    return res.status(500).json({ success: false, message: 'Failed to create admin account.' });
  }
}

/**
 * Admin: Delete Customer Account
 * If customer has orders, soft-delete so historical orders and inspection history remain undisturbed.
 * If customer has no orders, hard delete safely.
 */
async function deleteCustomer(req, res) {
  try {
    const { id } = req.params;
    const users = await query('SELECT id, name, role FROM users WHERE id = ? AND role = "customer"', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Client account not found.' });
    }

    const orderRows = await query('SELECT id FROM orders WHERE customer_id = ?', [id]);
    if (orderRows.length > 0) {
      await query('UPDATE users SET is_deleted = 1, status = "inactive" WHERE id = ?', [id]);
      return res.json({
        success: true,
        message: `Client "${users[0].name}" removed from client list (historical purchase orders and inspection records preserved without disturbance).`
      });
    }

    await query('DELETE FROM users WHERE id = ? AND role = "customer"', [id]);
    return res.json({
      success: true,
      message: `Client "${users[0].name}" deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting client:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete client: ' + err.message });
  }
}

/**
 * Admin: Delete Employee / Field Inspector
 * If employee has assigned inspection sheets or audit logs, soft-delete so historical audit reports remain undisturbed.
 * If employee has no inspections, hard delete safely.
 */
async function deleteEmployee(req, res) {
  try {
    const { id } = req.params;
    const users = await query('SELECT id, name, role FROM users WHERE id = ? AND role = "employee"', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Inspector account not found.' });
    }

    const sheetRows = await query('SELECT id FROM inspection_sheets WHERE assigned_employee_id = ?', [id]);
    const logRows = await query('SELECT id FROM inspection_audit_logs WHERE actor_id = ?', [id]);

    if (sheetRows.length > 0 || logRows.length > 0) {
      await query('UPDATE users SET is_deleted = 1, status = "inactive" WHERE id = ?', [id]);
      return res.json({
        success: true,
        message: `Inspector "${users[0].name}" removed from active roster (historical inspection reports and audit signatures preserved without disturbance).`
      });
    }

    await query('DELETE FROM users WHERE id = ? AND role = "employee"', [id]);
    return res.json({
      success: true,
      message: `Inspector "${users[0].name}" deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting inspector:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete inspector: ' + err.message });
  }
}

module.exports = {
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
};

