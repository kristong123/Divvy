// Determine environment based on hostname instead of hardcoded value
const isDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

// Base URLs for different environments
export const BASE_URL = isDevelopment
  ? "http://localhost:3002"
  : "https://divvy-server.onrender.com";

export const SOCKET_URL = isDevelopment
  ? "http://localhost:3002"
  : "https://divvy-server.onrender.com";
