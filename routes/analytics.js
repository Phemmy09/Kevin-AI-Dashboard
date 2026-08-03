const express = require('express');
const router = express.Router();
const DB = require('../db');
const { verifyToken } = require('./auth');

// GET user stats summary
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const stats = await DB.Analytics.getStats(req.user.id);
    res.status(200).json(stats);
  } catch (error) {
    console.error('Fetch stats error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics statistics.' });
  }
});

// GET usage history chart data
router.get('/history', verifyToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.days) || 7;
    const history = await DB.Analytics.getUsageHistory(req.user.id, limit);
    
    // Ensure we return data structured for easy frontend rendering
    // If history is empty, populate with last few days as 0s to avoid blank charts
    if (history.length === 0) {
      const emptyHistory = [];
      for (let i = limit - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        emptyHistory.push({
          date: dateStr,
          requests: 0,
          tokens: 0
        });
      }
      return res.status(200).json(emptyHistory);
    }
    
    res.status(200).json(history);
  } catch (error) {
    console.error('Fetch history error:', error);
    res.status(500).json({ error: 'Failed to fetch usage history.' });
  }
});

// SEED mock data for testing (Developer Experience feature)
router.post('/seed', verifyToken, async (req, res) => {
  try {
    // Generate realistic logs for the last 7 days
    const mockLogs = [];
    const now = new Date();
    
    // Check if user already has seeded logs to avoid duplicate seeding
    const stats = await DB.Analytics.getStats(req.user.id);
    if (stats.totalRequests > 0) {
      return res.status(400).json({ error: 'Database already has analytics data.' });
    }
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      
      // Random requests per day (between 3 and 12)
      const dailyRequests = Math.floor(Math.random() * 10) + 3;
      for (let r = 0; r < dailyRequests; r++) {
        // Random tokens per request (between 120 and 850)
        const tokens = Math.floor(Math.random() * 730) + 120;
        // Random response time (between 450ms and 2200ms)
        const responseTime = Math.floor(Math.random() * 1750) + 450;
        
        // We log to database. To seed past dates, we adjust the time.
        // For MongoDB or SQLite, let's write directly.
        if (DB.isSQLite()) {
          // Adjust createdAt back in time
          const dateStr = date.toISOString().replace('T', ' ').substring(0, 19);
          await new Promise((resolve, reject) => {
            const sqliteDb = require('sqlite3').verbose();
            const path = require('path');
            const dbPath = path.join(__dirname, '..', 'database.sqlite');
            const dbConn = new sqliteDb.Database(dbPath);
            dbConn.run(
              'INSERT INTO analytics (userId, tokensUsed, responseTime, createdAt) VALUES (?, ?, ?, ?)',
              [req.user.id, tokens, responseTime, dateStr],
              (err) => {
                dbConn.close();
                if (err) reject(err);
                else resolve();
              }
            );
          });
        } else {
          // MongoDB
          const mongoose = require('mongoose');
          const MongoAnalytics = mongoose.model('Analytics');
          const log = new MongoAnalytics({
            userId: req.user.id,
            tokensUsed: tokens,
            responseTime,
            createdAt: date
          });
          await log.save();
        }
      }
    }
    
    res.status(200).json({ message: 'Mock data seeded successfully for the past 7 days!' });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({ error: 'Failed to seed mock analytics logs.' });
  }
});

module.exports = router;
