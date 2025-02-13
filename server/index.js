const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const corsConfig = require("./src/middleware/corsConfig");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/usersRoutes");
const friendsRoutes = require("./src/routes/friendsRoutes");
const messageRoutes = require("./src/routes/messagesRoutes");
const groupRoutes = require("./src/routes/groupRoutes");

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(corsConfig);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/group-messages", groupRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

// Export app for testing
module.exports = app;

// Start the server only if not in test mode
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}