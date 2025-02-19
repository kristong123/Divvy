// Explicitly set development mode for local development
const isDevelopment = true;  // Change this to false for production

// Base URLs for different environments
export const BASE_URL = isDevelopment 
  ? 'http://localhost:3004'
  : 'https://your-production-server.com';

export const SOCKET_URL = isDevelopment
  ? 'http://localhost:3004'
  : 'https://your-production-server.com';