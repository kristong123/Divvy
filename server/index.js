const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const { initializeSocket } = require("./src/config/socket");
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO FIRST
initializeSocket(server);

// Basic CORS setup
app.use(cors());

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log('Request:', req.url);
  next();
});

// Define routes AFTER Socket.IO initialization
const authRoutes = require('./src/routes/authRoutes');
const friendsRoutes = require('./src/routes/friendsRoutes');
const userRoutes = require('./src/routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/user', userRoutes);

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
  console.log('404 Not Found:', req.method, req.url);
  res.status(404).json({ message: 'Route not found' });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});