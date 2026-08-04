const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DB = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

// Token verification middleware
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({ error: 'Invalid token.' });
  }
}

// REGISTER endpoint (Disabled)
router.post('/register', async (req, res) => {
  return res.status(403).json({ error: 'Registration is disabled for single-password mode.' });
});

// LOGIN endpoint
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Please enter a password.' });
    }
    
    // Check global password
    if (password !== 'Admin123') {
      return res.status(400).json({ error: 'Incorrect password.' });
    }
    
    const adminEmail = 'admin@kevinai.com';
    
    // Find or create default admin user
    let user = await DB.User.findByEmail(adminEmail);
    if (!user) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin123', salt);
      user = await DB.User.create('Admin', adminEmail, passwordHash);
    }
    
    // Generate token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'An error occurred during login.' });
  }
});

// GET user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await DB.User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json({
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'An error occurred fetching the profile.' });
  }
});

// UPDATE user profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { username, currentPassword, newPassword } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }
    
    if (newPassword || currentPassword) {
      return res.status(400).json({ error: 'Password changes are disabled for the global admin account.' });
    }
    
    const user = await DB.User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    await DB.User.updateProfile(req.user.id, username);
    
    res.status(200).json({
      message: 'Profile updated successfully',
      user: { id: user.id, username, email: user.email }
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'An error occurred updating the profile.' });
  }
});

module.exports = {
  router,
  verifyToken
};
