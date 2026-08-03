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

// REGISTER endpoint
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide all required fields.' });
    }
    
    // Check if user already exists
    const existingUser = await DB.User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Save user
    const newUser = await DB.User.create(username, email, passwordHash);
    
    // Generate token
    const token = jwt.sign({ id: newUser.id }, JWT_SECRET, { expiresIn: '7d' });
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: { id: newUser.id, username: newUser.username, email: newUser.email }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'An error occurred during registration.' });
  }
});

// LOGIN endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }
    
    // Find user
    const user = await DB.User.findByEmail(email);
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid email or password.' });
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
    
    const user = await DB.User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    
    let passwordHash = null;
    
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set a new password.' });
      }
      
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Incorrect current password.' });
      }
      
      const salt = await bcrypt.genSalt(10);
      passwordHash = await bcrypt.hash(newPassword, salt);
    }
    
    await DB.User.updateProfile(req.user.id, username, passwordHash);
    
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
