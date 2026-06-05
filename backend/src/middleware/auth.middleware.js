const jwt = require('jsonwebtoken');
const db = require('../config/db');
const logger = require('../config/logger');

const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access Denied: No Bearer Token Provided',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Admin users cannot be blocked — skip DB lookup, trust JWT claims
    if (decoded.role === 'ADMIN') {
      req.user = { id: decoded.id, email: decoded.email, role: 'ADMIN', status: 'ACTIVE' };
      return next();
    }

    // For regular users, verify they exist and are not blocked
    const userResult = await db.query(
      'SELECT id, phone, email, role, status FROM users WHERE id = $1',
      [decoded.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: User account not found',
      });
    }

    const user = userResult.rows[0];

    if (user.status === 'BLOCKED') {
      return res.status(403).json({
        success: false,
        message: 'Access Denied: Your account has been blocked by administrators',
      });
    }

    // Attach user information to request
    req.user = user;
    next();
  } catch (error) {
    logger.error('JWT Verification Error: %o', error);
    return res.status(401).json({
      success: false,
      message: 'Access Denied: Invalid or expired token',
    });
  }
};

const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access Denied: Unauthorized request context',
      });
    }

    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Required role [${roles.join(', ')}] was not met`,
      });
    }

    next();
  };
};

module.exports = {
  requireAuth,
  requireRole,
};
