/**
 * Scout to PPTX - Client Configuration
 *
 * This skill is a client that calls the Open Scouts backend API.
 * All heavy processing (search, AI analysis, image generation, PPTX assembly)
 * happens on the backend.
 */

module.exports = {
  // Backend API URL
  // This is the only configuration the client needs
  API_BASE_URL: process.env.SCOUT_API_URL || 'http://localhost:3000',

  // API endpoint for PPTX generation
  GENERATE_PPTX_ENDPOINT: '/api/public/generate-pptx',

  // Default settings
  DEFAULT_TIMEOUT: 300000, // 5 minutes (ms) - backend processing can take time

  // Output directory for downloaded PPTX files
  OUTPUT_DIR: process.env.PPTX_OUTPUT_DIR || './',
};
