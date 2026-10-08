const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { generateToken } = require('../middleware/auth');

/**
 * Login: Supports both Email (Admin / Customer) and Employee Code (Field Employees)
 */
async function login(req, res) {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier (email or employee code) and password are required.' });
    }

    // Query user by email or employee_code
    let sql = 'SELECT * FROM users WHERE (email = ? OR employee_code = ?)';
    let params = [identifier, identifier];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    const users = await query(sql, params);
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or user does not exist.' });
    }

    const user = users[0];

    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Contact administration.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user);

    // Return safe user object (excluding password hash)
    const { password_hash, ...safeUser } = user;

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
}

/**
 * Customer Self-Registration (e.g. for USA apparel & fabric buyers)
 */
async function register(req, res) {
  try {
    const { name, email, password, company_name, city, country, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const result = await query(
      `INSERT INTO users (role, name, email, password_hash, company_name, city, country, phone, status)
       VALUES ('customer', ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        name,
        email,
        password_hash,
        company_name || 'Independent Buyer',
        city || 'USA',
        country || 'USA',
        phone || null
      ]
    );

    const newUser = {
      id: result.insertId,
      role: 'customer',
      name,
      email,
      company_name: company_name || 'Independent Buyer',
      city: city || 'USA',
      country: country || 'USA',
      phone: phone || null,
      status: 'active'
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Welcome to the platform.',
      token,
      user: newUser
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Server error during customer registration.' });
  }
}

/**
 * Get current authenticated user profile
 */
async function getMe(req, res) {
  try {
    const rows = await query(
      'SELECT id, role, name, email, plain_password, employee_code, company_name, city, country, phone, status, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({
      success: true,
      user: rows[0]
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
}

/**
 * Logout: Clear any session cookies and acknowledge session termination
 */
async function logout(req, res) {
  try {
    res.clearCookie('token', { path: '/' });
    res.clearCookie('apex_token', { path: '/' });
    res.clearCookie('session', { path: '/' });
    return res.json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (err) {
    return res.json({ success: true, message: 'Logged out.' });
  }
}

module.exports = {
  login,
  register,
  getMe,
  logout
};
