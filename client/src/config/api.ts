// Explicitly set development mode for local development
const isDevelopment = false;  // Change this to false for production

// Base URLs for different environments
export const BASE_URL = isDevelopment 
  ? 'http://localhost:3002'
  : 'https://divvy-server.onrender.com';

export const SOCKET_URL = isDevelopment
  ? 'http://localhost:3002'
  : 'https://divvy-server.onrender.com';