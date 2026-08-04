const mongoose = require('mongoose');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let isSQLite = false;
let sqliteDb = null;

// MongoDB Schemas & Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const conversationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  role: { type: String, required: true }, // 'user' or 'assistant'
  content: { type: String, required: true },
  tokens: { type: Number, default: 0 },
  model: { type: String, default: 'gpt-3.5-turbo' },
  createdAt: { type: Date, default: Date.now }
});

const analyticsSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokensUsed: { type: Number, default: 0 },
  responseTime: { type: Number, default: 0 }, // in ms
  createdAt: { type: Date, default: Date.now }
});

let MongoUser, MongoConversation, MongoMessage, MongoAnalytics;

const runSql = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getSql = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allSql = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function connectDB() {
  const mongoUri = process.env.MONGODB_URI;
  console.log('Attempting connection to MongoDB Atlas...');
  try {
    // Attempt Mongoose connection with a 4-second timeout to fail fast
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 4000
    });
    console.log('Successfully connected to MongoDB Atlas!');
    
    MongoUser = mongoose.model('User', userSchema);
    MongoConversation = mongoose.model('Conversation', conversationSchema);
    MongoMessage = mongoose.model('Message', messageSchema);
    MongoAnalytics = mongoose.model('Analytics', analyticsSchema);
  } catch (error) {
    console.warn('MongoDB Atlas connection failed:', error.message);
    console.log('Falling back to local SQLite database...');
    isSQLite = true;
    
    const dbPath = process.env.VERCEL
      ? '/tmp/database.sqlite'
      : path.join(__dirname, 'database.sqlite');
    sqliteDb = new sqlite3.Database(dbPath);
    
    // Initialize SQLite tables
    await runSql(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await runSql(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        title TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    await runSql(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversationId INTEGER NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER DEFAULT 0,
        model TEXT DEFAULT 'gpt-3.5-turbo',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(conversationId) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);
    
    await runSql(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        tokensUsed INTEGER DEFAULT 0,
        responseTime INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    console.log('SQLite database initialized successfully at', dbPath);
  }
}

// Unified Database Model Interface
const DB = {
  connect: connectDB,
  isSQLite: () => isSQLite,

  User: {
    create: async (username, email, passwordHash) => {
      if (isSQLite) {
        const result = await runSql(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
          [username, email, passwordHash]
        );
        return { id: result.lastID, username, email, password: passwordHash };
      } else {
        const user = new MongoUser({ username, email, password: passwordHash });
        await user.save();
        return { id: user._id.toString(), username: user.username, email: user.email, password: user.password };
      }
    },
    findByEmail: async (email) => {
      if (isSQLite) {
        const row = await getSql('SELECT * FROM users WHERE email = ?', [email]);
        if (!row) return null;
        return { id: row.id.toString(), username: row.username, email: row.email, password: row.password };
      } else {
        const user = await MongoUser.findOne({ email });
        if (!user) return null;
        return { id: user._id.toString(), username: user.username, email: user.email, password: user.password };
      }
    },
    findById: async (id) => {
      if (isSQLite) {
        const row = await getSql('SELECT * FROM users WHERE id = ?', [id]);
        if (!row) return null;
        return { id: row.id.toString(), username: row.username, email: row.email, password: row.password };
      } else {
        const user = await MongoUser.findById(id);
        if (!user) return null;
        return { id: user._id.toString(), username: user.username, email: user.email, password: user.password };
      }
    },
    updateProfile: async (id, username, passwordHash = null) => {
      if (isSQLite) {
        if (passwordHash) {
          await runSql('UPDATE users SET username = ?, password = ? WHERE id = ?', [username, passwordHash, id]);
        } else {
          await runSql('UPDATE users SET username = ? WHERE id = ?', [username, id]);
        }
        return true;
      } else {
        const updateData = { username };
        if (passwordHash) updateData.password = passwordHash;
        await MongoUser.findByIdAndUpdate(id, updateData);
        return true;
      }
    }
  },

  Conversation: {
    create: async (userId, title) => {
      if (isSQLite) {
        const result = await runSql(
          'INSERT INTO conversations (userId, title) VALUES (?, ?)',
          [userId, title]
        );
        return { id: result.lastID.toString(), userId, title, updatedAt: new Date() };
      } else {
        const conv = new MongoConversation({ userId, title });
        await conv.save();
        return { id: conv._id.toString(), userId: conv.userId.toString(), title: conv.title, updatedAt: conv.updatedAt };
      }
    },
    listByUserId: async (userId) => {
      if (isSQLite) {
        const rows = await allSql(
          'SELECT * FROM conversations WHERE userId = ? ORDER BY updatedAt DESC',
          [userId]
        );
        return rows.map(r => ({ id: r.id.toString(), userId: r.userId.toString(), title: r.title, updatedAt: r.updatedAt }));
      } else {
        const convs = await MongoConversation.find({ userId }).sort({ updatedAt: -1 });
        return convs.map(c => ({ id: c._id.toString(), userId: c.userId.toString(), title: c.title, updatedAt: c.updatedAt }));
      }
    },
    rename: async (id, userId, title) => {
      if (isSQLite) {
        await runSql(
          'UPDATE conversations SET title = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND userId = ?',
          [title, id, userId]
        );
        return true;
      } else {
        await MongoConversation.findOneAndUpdate({ _id: id, userId }, { title, updatedAt: Date.now() });
        return true;
      }
    },
    delete: async (id, userId) => {
      if (isSQLite) {
        await runSql('DELETE FROM conversations WHERE id = ? AND userId = ?', [id, userId]);
        await runSql('DELETE FROM messages WHERE conversationId = ?', [id]);
        return true;
      } else {
        await MongoConversation.findOneAndDelete({ _id: id, userId });
        await MongoMessage.deleteMany({ conversationId: id });
        return true;
      }
    }
  },

  Message: {
    create: async (conversationId, role, content, tokens = 0, model = 'gpt-3.5-turbo') => {
      if (isSQLite) {
        const result = await runSql(
          'INSERT INTO messages (conversationId, role, content, tokens, model) VALUES (?, ?, ?, ?, ?)',
          [conversationId, role, content, tokens, model]
        );
        // Also update parent conversation's updatedAt timestamp
        await runSql('UPDATE conversations SET updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [conversationId]);
        return { id: result.lastID.toString(), conversationId, role, content, tokens, model, createdAt: new Date() };
      } else {
        const msg = new MongoMessage({ conversationId, role, content, tokens, model });
        await msg.save();
        await MongoConversation.findByIdAndUpdate(conversationId, { updatedAt: Date.now() });
        return { id: msg._id.toString(), conversationId: msg.conversationId.toString(), role: msg.role, content: msg.content, tokens: msg.tokens, model: msg.model, createdAt: msg.createdAt };
      }
    },
    listByConversationId: async (conversationId) => {
      if (isSQLite) {
        const rows = await allSql(
          'SELECT * FROM messages WHERE conversationId = ? ORDER BY createdAt ASC',
          [conversationId]
        );
        return rows.map(r => ({ id: r.id.toString(), conversationId: r.conversationId.toString(), role: r.role, content: r.content, tokens: r.tokens, model: r.model, createdAt: r.createdAt }));
      } else {
        const msgs = await MongoMessage.find({ conversationId }).sort({ createdAt: 1 });
        return msgs.map(m => ({ id: m._id.toString(), conversationId: m.conversationId.toString(), role: m.role, content: m.content, tokens: m.tokens, model: m.model, createdAt: m.createdAt }));
      }
    }
  },

  Analytics: {
    logRequest: async (userId, tokensUsed, responseTime) => {
      if (isSQLite) {
        await runSql(
          'INSERT INTO analytics (userId, tokensUsed, responseTime) VALUES (?, ?, ?)',
          [userId, tokensUsed, responseTime]
        );
        return true;
      } else {
        const log = new MongoAnalytics({ userId, tokensUsed, responseTime });
        await log.save();
        return true;
      }
    },
    getStats: async (userId) => {
      if (isSQLite) {
        const countRow = await getSql('SELECT COUNT(*) as count, SUM(tokensUsed) as totalTokens, AVG(responseTime) as avgTime FROM analytics WHERE userId = ?', [userId]);
        return {
          totalRequests: countRow.count || 0,
          totalTokens: countRow.totalTokens || 0,
          avgResponseTime: Math.round(countRow.avgTime) || 0
        };
      } else {
        const stats = await MongoAnalytics.aggregate([
          { $match: { userId: new mongoose.Types.ObjectId(userId) } },
          {
            $group: {
              _id: null,
              totalRequests: { $sum: 1 },
              totalTokens: { $sum: '$tokensUsed' },
              avgResponseTime: { $avg: '$responseTime' }
            }
          }
        ]);
        if (stats.length === 0) {
          return { totalRequests: 0, totalTokens: 0, avgResponseTime: 0 };
        }
        return {
          totalRequests: stats[0].totalRequests,
          totalTokens: stats[0].totalTokens,
          avgResponseTime: Math.round(stats[0].avgResponseTime)
        };
      }
    },
    getUsageHistory: async (userId, daysLimit = 7) => {
      if (isSQLite) {
        // Simple daily aggregation in SQLite
        const rows = await allSql(`
          SELECT DATE(createdAt) as dateStr, COUNT(*) as count, SUM(tokensUsed) as tokens
          FROM analytics
          WHERE userId = ? AND createdAt >= date('now', ?)
          GROUP BY dateStr
          ORDER BY dateStr ASC
        `, [userId, `-${daysLimit} days`]);
        return rows.map(r => ({
          date: r.dateStr,
          requests: r.count,
          tokens: r.tokens || 0
        }));
      } else {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysLimit);
        
        const history = await MongoAnalytics.aggregate([
          {
            $match: {
              userId: new mongoose.Types.ObjectId(userId),
              createdAt: { $gte: startDate }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              requests: { $sum: 1 },
              tokens: { $sum: '$tokensUsed' }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        return history.map(h => ({
          date: h._id,
          requests: h.requests,
          tokens: h.tokens
        }));
      }
    }
  }
};

module.exports = DB;
