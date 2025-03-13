import { Middleware } from '@reduxjs/toolkit';

// Create a middleware to log all actions
export const loggerMiddleware: Middleware = () => next => action => {
  return next(action);
}; 