// API URL configuration for the PM Dashboard
// Use empty string for relative URLs (works with ngrok/proxy)
// Falls back to localhost:3001 only in development

const getApiUrl = () => {
  // If explicitly set via env, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // In browser, use current origin (works with ngrok)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR/build time
  return 'http://localhost:3001';
};

export const API_URL = getApiUrl();
