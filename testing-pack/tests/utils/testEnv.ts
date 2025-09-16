export const WEB_BASE_URL = process.env.WEB_BASE_URL || 'http://localhost:3000';
export const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

export const ADMIN = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'admin123',
};

export const CLIENT = {
  email: process.env.CLIENT_EMAIL || 'client@example.com',
  password: process.env.CLIENT_PASSWORD || 'client123',
};

export const MODEL = {
  email: process.env.MODEL_EMAIL || 'model@example.com',
  password: process.env.MODEL_PASSWORD || 'model123',
};
