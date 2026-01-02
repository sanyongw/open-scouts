#!/usr/bin/env node

/**
 * Scout to PowerPoint - Client Script
 *
 * This is a lightweight client that calls the Open Scouts backend API
 * to generate PowerPoint presentations from search queries.
 *
 * All heavy processing (search, AI analysis, image generation, PPTX assembly)
 * happens on the backend.
 *
 * Usage:
 *   node generate-pptx.js "search query"
 *   node generate-pptx.js "query" --no-images
 *   node generate-pptx.js "query" --timeout 300 --verbose
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('./config');

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  const options = {
    query: args[0],
    generateImages: true,
    timeout: config.DEFAULT_TIMEOUT,
    verbose: false
  };

  // Parse flags
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--no-images') {
      options.generateImages = false;
    } else if (args[i] === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[i + 1]) * 1000; // Convert to ms
      i++;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      options.verbose = true;
    }
  }

  if (!options.query || options.query.trim().length === 0) {
    console.error('Error: Query cannot be empty');
    process.exit(1);
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Scout to PowerPoint Generator

Usage:
  node generate-pptx.js "<query>" [options]

Options:
  --no-images          Skip image generation (faster)
  --timeout <seconds>  Request timeout (default: 300)
  --verbose, -v        Show detailed progress
  --help, -h           Show this help message

Examples:
  node generate-pptx.js "AI industry trends 2024"
  node generate-pptx.js "climate change" --no-images
  node generate-pptx.js "quantum computing" --timeout 600 --verbose

Environment Variables:
  SCOUT_API_URL        Backend API URL (default: http://localhost:3000)
  PPTX_OUTPUT_DIR      Output directory (default: ./)
`);
}

/**
 * Make HTTP request to backend API
 */
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: options.timeout
    };

    const req = client.request(requestOptions, (res) => {
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const contentType = res.headers['content-type'];

          if (contentType && contentType.includes('application/vnd.openxmlformats')) {
            // PPTX file
            resolve({
              type: 'file',
              data: Buffer.concat(chunks),
              filename: getFilenameFromHeaders(res.headers) || 'presentation.pptx'
            });
          } else {
            // JSON response
            try {
              const responseData = Buffer.concat(chunks).toString();
              resolve({
                type: 'json',
                data: JSON.parse(responseData)
              });
            } catch (e) {
              reject(new Error('Invalid response from server'));
            }
          }
        } else {
          const errorData = Buffer.concat(chunks).toString();
          reject(new Error(`HTTP ${res.statusCode}: ${errorData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out. Try increasing --timeout value.'));
    });

    req.write(data);
    req.end();
  });
}

/**
 * Extract filename from response headers
 */
function getFilenameFromHeaders(headers) {
  const disposition = headers['content-disposition'];
  if (disposition) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match) {
      return match[1];
    }
  }
  return null;
}

/**
 * Save PPTX file to disk
 */
function savePPTX(buffer, filename) {
  const outputDir = config.OUTPUT_DIR;

  // Create directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filepath = path.join(outputDir, filename);

  return new Promise((resolve, reject) => {
    fs.writeFile(filepath, buffer, (err) => {
      if (err) {
        reject(new Error(`Failed to save file: ${err.message}`));
      } else {
        resolve(filepath);
      }
    });
  });
}

/**
 * Main function
 */
async function generatePPTX(query, options) {
  const startTime = Date.now();

  try {
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║     Scout to PowerPoint Generator                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    console.log(`Query: "${query}"\n`);

    if (options.verbose) {
      console.log('Options:');
      console.log(`  Generate Images: ${options.generateImages}`);
      console.log(`  Timeout: ${options.timeout / 1000}s`);
      console.log(`  API URL: ${config.API_BASE_URL}`);
      console.log('');
    }

    console.log('📤 Sending request to backend...');
    if (!options.generateImages) {
      console.log('   (Images disabled, generation will be faster)');
    }
    console.log('   This may take 1-5 minutes depending on options...\n');

    // Prepare request
    const url = config.API_BASE_URL + config.GENERATE_PPTX_ENDPOINT;
    const requestData = JSON.stringify({
      query,
      options: {
        generateImages: options.generateImages
      }
    });

    // Make request
    const response = await makeRequest(url, options, requestData);

    if (response.type === 'file') {
      // Save PPTX file
      console.log('📥 Downloading presentation...\n');
      const filepath = await savePPTX(response.data, response.filename);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║     ✅ SUCCESS!                                        ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
      console.log(`📁 File: ${response.filename}`);
      console.log(`📍 Path: ${filepath}`);
      console.log(`📦 Size: ${(response.data.length / 1024).toFixed(1)} KB`);
      console.log(`⏱️  Time: ${elapsedTime}s\n`);

      process.exit(0);
    } else if (response.type === 'json') {
      // Handle JSON response (e.g., error messages)
      if (response.data.error) {
        throw new Error(response.data.error);
      }
      console.log('Response:', response.data);
      process.exit(0);
    }
  } catch (error) {
    console.error('\n╔════════════════════════════════════════════════════════╗');
    console.error('║     ❌ ERROR                                           ║');
    console.error('╚════════════════════════════════════════════════════════╝\n');
    console.error(`Error: ${error.message}\n`);

    // Provide helpful suggestions
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
      console.error('💡 Suggestions:');
      console.error('   - Make sure the Open Scouts backend is running');
      console.error(`   - Check if ${config.API_BASE_URL} is accessible`);
      console.error('   - Set SCOUT_API_URL environment variable if using custom URL\n');
    } else if (error.message.includes('timed out')) {
      console.error('💡 Suggestions:');
      console.error('   - Try increasing timeout: --timeout 600');
      console.error('   - Try without images: --no-images');
      console.error('   - Check backend logs for issues\n');
    }

    process.exit(1);
  }
}

// Run
if (require.main === module) {
  const options = parseArgs();
  generatePPTX(options.query, options);
}

module.exports = { generatePPTX };
