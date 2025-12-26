#!/usr/bin/env node

/**
 * Scout Async Search Script
 *
 * Starts a search that runs asynchronously and returns immediately with a search ID
 * Use check-status.js to monitor progress
 *
 * Usage:
 *   node async-search.js "your search query"
 *   node async-search.js "complex query" --timeout 180
 */

const https = require('https');
const http = require('http');
const config = require('./config');

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    showHelp();
    process.exit(0);
  }

  const options = {
    query: args[0],
    timeout: config.DEFAULT_TIMEOUT
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[i + 1]);
      i++;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Scout Async Search - Start a background search

Usage:
  node async-search.js "<query>" [options]

Options:
  --timeout <seconds>  Set search timeout (default: 60)
  --help               Show this help message

Examples:
  node async-search.js "comprehensive market research"
  node async-search.js "deep analysis of AI trends" --timeout 180

After starting a search, use check-status.js to monitor progress:
  node check-status.js <search-id>
`);
}

async function makeRequest(url, data, timeout) {
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
        ...config.REQUEST.headers,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 30000 // 30 second timeout for starting the search
    };

    const req = client.request(requestOptions, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            reject(new Error('Invalid JSON response'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(data);
    req.end();
  });
}

async function asyncSearch(options) {
  const { query, timeout } = options;

  console.log(`Starting async search for: "${query}"`);
  console.log('');

  try {
    const url = config.API_BASE_URL + config.ENDPOINTS.ASYNC_SEARCH;
    const requestData = JSON.stringify({
      query,
      options: { timeout }
    });

    const data = await makeRequest(url, requestData, timeout);

    console.log('✅ Search started successfully');
    console.log('');
    console.log(`Search ID: ${data.search_id}`);
    console.log('');
    console.log('To check status, run:');
    console.log(`  node scripts/check-status.js ${data.search_id}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Failed to start search:', error.message);
    console.error('');
    process.exit(1);
  }
}

if (require.main === module) {
  const options = parseArgs();
  asyncSearch(options);
}

module.exports = { asyncSearch };
