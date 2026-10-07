const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_fabrication_key_2026_xyz987';

/**
 * Generates JWT token for user
 */
function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      employee_code: user.employee_code || null,
      company_name: user.company_name || null
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

/**
 * Middleware: Authenticates JWT from Authorization Bearer header or query parameter
 */
async function authenticate(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists in database and is active
    const users = await query('SELECT id, role, name, email, employee_code, company_name, city, country, status FROM users WHERE id = ?', [decoded.id]);
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    if (users[0].status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is deactivated.' });
    }

    req.user = users[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

/**
 * Middleware: Optional Authentication (supports Bearer header or query token)
 * Populates req.user if present, but never blocks requests
 */
async function optionalAuth(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const users = await query('SELECT id, role, name, email, employee_code, company_name, city, country, status FROM users WHERE id = ?', [decoded.id]);
      if (users && users.length > 0 && users[0].status === 'active') {
        req.user = users[0];
      }
    }
    next();
  } catch (_) {
    next();
  }
}


/**
 * Middleware: Role Authorization Gate
 * @param {string[]} allowedRoles - List of authorized roles e.g. ['admin'], ['admin', 'employee']
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${allowedRoles.join(', ')}] roles.`
      });
    }

    next();
  };
}

module.exports = {
  generateToken,
  authenticate,
  optionalAuth,
  requireRole
};

