const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const { initializeSocket } = require("./src/config/socket");
const corsOptions = require("./src/config/corsOptions");
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO with existing corsOptions
initializeSocket(server);

// Use the corsOptions configuration
app.use(cors(corsOptions));

// Add preflight OPTIONS handling for all routes
app.options('*', cors(corsOptions));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use((req, res, next) => {
  next();
});

// Define routes AFTER Socket.IO initialization
const authRoutes = require('./src/routes/authRoutes');
const friendsRoutes = require('./src/routes/friendsRoutes');
const userRoutes = require('./src/routes/userRoutes');
const groupRoutes = require('./src/routes/groupRoutes');
const messagesRoutes = require('./src/routes/messagesRoutes');
const usersRoutes = require('./src/routes/usersRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/user', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/users', usersRoutes);

// Basic test route
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working' });
});

// Error handlers should be last
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler should be very last
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 3002;
let serverInstance = null;

// Add graceful shutdown
const shutdown = () => {
  if (serverInstance) {
    // Close all socket connections first
    const io = require('./src/config/socket').getIO();
    io.close(() => {

      // Then close the HTTP server
      serverInstance.close(() => {
        process.exit(0);
      });
    });
  } else {
    process.exit(0);
  }
};

// Handle process signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGUSR2', shutdown); // Added for nodemon restart

// Start server with better error handling
serverInstance = server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please:
    1. Kill the process using this port, or
    2. Change the PORT environment variable`);
    process.exit(1);
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});