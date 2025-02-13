const cors = require("cors");

const corsConfig = cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://divvy-chi.vercel.app",
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
});

module.exports = corsConfig;