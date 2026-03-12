// const jwt = require('jsonwebtoken');
// const pool = require('../db');
// require('dotenv').config();

// const JWT_SECRET = process.env.JWT_SECRET;
// if (!JWT_SECRET) {
//   throw new Error('JWT_SECRET is not defined in environment variables');
// }

// async function auth(req, res, next) {
//   const header = req.headers.authorization;
//   if (!header) return res.status(401).json({ error: 'Missing token' });
  
//   const token = header.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'Invalid token format' });
  
//   try {
//     const payload = jwt.verify(token, JWT_SECRET);
//     const [rows] = await pool.query(
//       'SELECT user_id, name, email, dept, year, role, is_active, is_verified, warning_count, warning_level, created_at FROM User WHERE user_id=?', 
//       [payload.user_id]
//     );
//     const u = rows[0];
    
//     if (!u) return res.status(403).json({ error: 'User not found' });
//     if (!u.is_active) return res.status(403).json({ error: 'Account inactive' });
//     if (!u.is_verified) return res.status(403).json({ error: 'Email not verified' });
    
//     req.user = u;
//     next();
//   } catch (err) {
//     console.error('Auth error:', err);
//     return res.status(401).json({ error: 'Invalid token' });
//   }
// }

// module.exports = auth;

const jwt = require('jsonwebtoken');
const pool = require('../db');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: 'Missing token' });
  
  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query('SELECT * FROM User WHERE user_id=?', [payload.user_id]);
    const u = rows[0];
    
    if (!u || !u.is_active) return res.status(403).json({ error: 'Account inactive' });
    if (!u.is_verified) return res.status(403).json({ error: 'Email not verified' });
    
    req.user = u;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = auth;