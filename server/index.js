const express = require("express");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");

const corsConfig = require("./src/middleware/corsConfig");
const authRoutes = require("./src/routes/authRoutes");
const userRoutes = require("./src/routes/usersRoutes");

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(corsConfig);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("Welcome to the API");
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});