// // routes/authRoutes.js
// const express = require('express');
// const router = express.Router();
// const pool = require('../db');
// const bcrypt = require('bcrypt');
// const jwt = require('jsonwebtoken');
// const nodemailer = require('nodemailer');
// const crypto = require('crypto');
// const { body, validationResult } = require('express-validator');
// const rateLimit = require('express-rate-limit');
// require('dotenv').config();

// const domain = process.env.JIIT_DOMAIN;
// const appUrl = process.env.APP_URL;
// const JWT_SECRET = process.env.JWT_SECRET;

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
// });

// // Rate limiting
// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 5,
//   message: { error: 'Too many authentication attempts, please try again later' }
// });

// function isJiitMail(email){ 
//   return email.endsWith('@'+domain); 
// }

// // Validation middleware
// const validateRegistration = [
//   body('name').isLength({ min: 2, max: 100 }).withMessage('Name must be between 2-100 characters'),
//   body('email').isEmail().withMessage('Valid email required'),
//   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
//   body('dept').notEmpty().withMessage('Department is required'),
//   body('year').isInt({ min: 1, max: 4 }).withMessage('Year must be between 1-4')
// ];

// const validateLogin = [
//   body('email').isEmail().withMessage('Valid email required'),
//   body('password').notEmpty().withMessage('Password is required')
// ];

// router.post('/register', validateRegistration, async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { name, email, password, dept, year } = req.body;
    
//     if (!isJiitMail(email)) {
//       return res.status(400).json({ error: `Use your JIIT email (@${domain})` });
//     }

//     // Check if user already exists
//     const [existing] = await pool.query('SELECT user_id FROM User WHERE email = ?', [email]);
//     if (existing.length > 0) {
//       return res.status(409).json({ error: 'Account already exists for this email' });
//     }

//     const hash = await bcrypt.hash(password, 10);
//     const [r] = await pool.query(
//       'INSERT INTO User(name, email, password, dept, year) VALUES(?, ?, ?, ?, ?)',
//       [name, email, hash, dept, year]
//     );

//     const token = crypto.randomBytes(32).toString('hex');
//     const exp = new Date(Date.now() + 86400000); // 24 hours
    
//     await pool.query(
//       'INSERT INTO EmailVerification(token, user_id, expires_at) VALUES(?, ?, ?)',
//       [token, r.insertId, exp]
//     );

//     const verifyUrl = `${appUrl}/auth/verify?token=${token}`;
    
//     await transporter.sendMail({
//       from: process.env.EMAIL_FROM,
//       to: email,
//       subject: 'Verify your Campus Buzz account',
//       html: `
//         <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
//           <h2 style="color: #1e293b;">Welcome to Campus Buzz, ${name}!</h2>
//           <p>Please verify your email address to activate your account:</p>
//           <a href="${verifyUrl}" 
//              style="display: inline-block; padding: 12px 24px; background: #60a5fa; color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
//             Verify Email Address
//           </a>
//           <p>If the button doesn't work, copy and paste this link in your browser:</p>
//           <p style="word-break: break-all; color: #64748b;">${verifyUrl}</p>
//           <p>This link will expire in 24 hours.</p>
//         </div>
//       `
//     });

//     res.json({ msg: 'Check your JIIT mail to verify account' });
//   } catch (e) {
//     console.error('Registration error:', e);
//     res.status(500).json({ error: 'Registration failed. Please try again.' });
//   }
// });

// router.get('/verify', async (req, res) => {
//   const { token } = req.query;
  
//   if (!token) {
//     return res.status(400).send('Verification token is required');
//   }

//   try {
//     const [t] = await pool.query(
//       'SELECT * FROM EmailVerification WHERE token = ? AND expires_at > NOW()',
//       [token]
//     );
    
//     if (!t.length) {
//       return res.send(`
//         <div style="text-align: center; padding: 2rem; font-family: Arial, sans-serif;">
//           <h2 style="color: #ef4444;">Invalid or expired verification token</h2>
//           <p>The verification link is invalid or has expired.</p>
//           <a href="/login.html" style="color: #60a5fa;">Go to login</a>
//         </div>
//       `);
//     }

//     await pool.query('UPDATE User SET is_verified = 1 WHERE user_id = ?', [t[0].user_id]);
//     await pool.query('DELETE FROM EmailVerification WHERE token = ?', [token]);
    
//     res.send(`
//       <div style="text-align: center; padding: 2rem; font-family: Arial, sans-serif;">
//         <h2 style="color: #10b981;">Email Verified Successfully! ✅</h2>
//         <p>Your email has been verified. You can now login to your account.</p>
//         <a href="/login.html" 
//            style="display: inline-block; padding: 12px 24px; background: #60a5fa; color: white; text-decoration: none; border-radius: 6px; margin-top: 1rem;">
//           Go to Login
//         </a>
//       </div>
//     `);
//   } catch (error) {
//     console.error('Verification error:', error);
//     res.status(500).send('Verification failed. Please try again.');
//   }
// });

// router.post('/login', authLimiter, validateLogin, async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }

//     const { email, password } = req.body;
//     const [u] = await pool.query('SELECT * FROM User WHERE email = ?', [email]);
    
//     if (!u.length) {
//       return res.status(400).json({ error: 'Invalid email or password' });
//     }

//     const user = u[0];
    
//     if (!user.is_verified) {
//       return res.status(403).json({ error: 'Please verify your email before logging in' });
//     }
    
//     if (!user.is_active) {
//       return res.status(403).json({ error: 'Account deactivated. Contact administrator.' });
//     }

//     const ok = await bcrypt.compare(password, user.password);
//     if (!ok) {
//       return res.status(400).json({ error: 'Invalid email or password' });
//     }

//     const token = jwt.sign(
//       { user_id: user.user_id, email: user.email }, 
//       JWT_SECRET, 
//       { expiresIn: '8h' }
//     );

//     // Remove password from response
//     const { password: _, ...userWithoutPassword } = user;
    
//     res.json({ 
//       token, 
//       user: userWithoutPassword,
//       message: 'Login successful'
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ error: 'Login failed. Please try again.' });
//   }
// });

// // Add verify endpoint for frontend
// router.get('/verify-token', async (req, res) => {
//   const token = req.headers.authorization?.split(' ')[1];
  
//   if (!token) {
//     return res.status(401).json({ error: 'No token provided' });
//   }

//   try {
//     const payload = jwt.verify(token, JWT_SECRET);
//     const [rows] = await pool.query(
//       'SELECT user_id, name, email, dept, year, role, is_active, is_verified, warning_count, warning_level, created_at FROM User WHERE user_id = ?',
//       [payload.user_id]
//     );
    
//     if (!rows.length) {
//       return res.status(404).json({ error: 'User not found' });
//     }

//     res.json({ user: rows[0] });
//   } catch (error) {
//     res.status(401).json({ error: 'Invalid token' });
//   }
// });

// module.exports = router;
const express = require('express');
const router = express.Router();
const pool = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const domain = process.env.JIIT_DOMAIN;
const appUrl = process.env.APP_URL;
const JWT_SECRET = process.env.JWT_SECRET;

// const transporter = nodemailer.createTransport({
//   host: process.env.SMTP_HOST,
//   port: process.env.SMTP_PORT,
//   auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
// });

function isJiitMail(email){ 
  return email.endsWith('@'+domain); 
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, dept, year } = req.body;
    
    if (!isJiitMail(email)) {
      return res.status(400).json({ error: `Use your JIIT email (@${domain})` });
    }

    // Check if user already exists
    const [existing] = await pool.query('SELECT user_id FROM User WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Account already exists for this email' });
    }

    const hash = await bcrypt.hash(password, 10);
    
    // Create user with email ALREADY VERIFIED
    const [r] = await pool.query(
      'INSERT INTO User(name, email, password, dept, year, is_verified) VALUES(?, ?, ?, ?, ?, 1)',
      [name, email, hash, dept, year]
    );

    console.log('User registered and automatically verified:', email);
    
    res.json({ 
      msg: 'Registration successful! Your account has been automatically verified. You can now login.',
      user_id: r.insertId
    });
    
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: 'Registration failed: ' + e.message });
  }
}); 

router.get('/verify', async (req, res) => {
  const { token } = req.query;
  
  try {
    const [t] = await pool.query('SELECT * FROM EmailVerification WHERE token=?', [token]);
    if (!t.length) return res.send('Invalid/expired token');
    
    await pool.query('UPDATE User SET is_verified=1 WHERE user_id=?', [t[0].user_id]);
    await pool.query('DELETE FROM EmailVerification WHERE token=?', [token]);
    
    res.send('<h2>Email verified ✅</h2><a href="/login.html">Go to login</a>');
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).send('Verification failed');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [u] = await pool.query('SELECT * FROM User WHERE email=?', [email]);
    
    if (!u.length) return res.status(400).json({ error: 'No user found' });
    
    const user = u[0];
    //if (!user.is_verified) return res.status(403).json({ error: 'Email not verified' });
    if (!user.is_active) return res.status(403).json({ error: 'Account deactivated' });
    
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: 'Wrong password' });
    
    const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
    
    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    
    res.json({ token, user: userWithoutPassword });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.get('/verify-token', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const [rows] = await pool.query(
      'SELECT user_id, name, email, dept, year, role, is_active, is_verified, warning_count, warning_level, created_at FROM User WHERE user_id = ?',
      [payload.user_id]
    );
    
    if (!rows.length) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;