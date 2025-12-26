// Scout Configuration
// Update these values for your deployment

module.exports = {
  // Backend API URL
  // Change this to your deployed Open Scouts backend
  // Current: Using local development server on port 3000
  API_BASE_URL: process.env.SCOUT_API_URL || 'http://localhost:3000/api',

  // Default timeout for searches (in seconds)
  DEFAULT_TIMEOUT: 60,

  // Maximum timeout allowed
  MAX_TIMEOUT: 300,

  // API endpoints
  ENDPOINTS: {
    SEARCH: '/public/search',
    ASYNC_SEARCH: '/public/search/async',
    STATUS: '/public/search/status',
    BATCH: '/public/search/batch'
  },

  // Request configuration
  REQUEST: {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Scout-CLI/1.0.0'
    }
  },

  // Output formatting
  OUTPUT: {
    colors: true,
    emoji: true,
    maxResults: 20
  }
};
