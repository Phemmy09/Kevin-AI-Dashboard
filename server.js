require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const DB = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Import routers
const authRoute = require('./routes/auth').router;
const chatRoute = require('./routes/chat');
const analyticsRoute = require('./routes/analytics');

// Register routes
app.use('/api/auth', authRoute);
app.use('/api/chat', chatRoute);
app.use('/api/analytics', analyticsRoute);

// SPA fallback: Route all unhandled request to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
async function startServer() {
  try {
    // Connect to MongoDB or fall back to SQLite
    await DB.connect();
    
    app.listen(PORT, () => {
      console.log(`==================================================`);
      console.log(`  Kevin AI Dashboard server is running!`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Port:        ${PORT}`);
      console.log(`  Local URL:   http://localhost:${PORT}`);
      console.log(`==================================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
