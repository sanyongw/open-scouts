#!/usr/bin/env node

/**
 * Scout Search Script
 *
 * Performs AI-powered web searches using the Scout backend API
 *
 * Usage:
 *   node search.js "your search query"
 *   node search.js "query" --timeout 120
 *   node search.js "query" --json
 *   node search.js "query" --verbose
 */

const https = require('https');
const http = require('http');
const config = require('./config');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    process.exit(0);
  }

  const options = {
    query: args[0],
    timeout: config.DEFAULT_TIMEOUT,
    json: false,
    verbose: false
  };

  // Parse flags
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--timeout' && args[i + 1]) {
      options.timeout = parseInt(args[i + 1]);
      i++;
    } else if (args[i] === '--json') {
      options.json = true;
    } else if (args[i] === '--verbose' || args[i] === '-v') {
      options.verbose = true;
    }
  }

  // Validate
  if (!options.query || options.query.trim().length === 0) {
    console.error('Error: Query cannot be empty');
    process.exit(1);
  }

  if (options.timeout > config.MAX_TIMEOUT) {
    console.error(`Error: Timeout cannot exceed ${config.MAX_TIMEOUT} seconds`);
    process.exit(1);
  }

  return options;
}

function showHelp() {
  console.log(`
Scout Search - AI-powered web search

Usage:
  node search.js "<query>" [options]

Options:
  --timeout <seconds>  Set search timeout (default: 60, max: 300)
  --json               Output results in JSON format
  --verbose, -v        Show detailed progress
  --help, -h           Show this help message

Examples:
  node search.js "latest AI news"
  node search.js "best sushi in SF" --timeout 120
  node search.js "remote jobs" --json
  node search.js "tech news" --verbose

Environment Variables:
  SCOUT_API_URL        Override default backend URL
`);
}

// Make HTTP/HTTPS request
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'POST',
      headers: {
        ...config.REQUEST.headers,
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: (options.timeout + 10) * 1000 // Add 10s buffer
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
            reject(new Error('Invalid JSON response from server'));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    req.write(data);
    req.end();
  });
}

// Format and display results
function formatResults(data, options) {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const { results = [], summary, metadata = {} } = data;

  // Header
  console.log('');
  console.log('✅ Search Complete');
  console.log('');

  // Summary
  if (summary) {
    console.log('📝 Summary:');
    console.log(summary);
    console.log('');
  }

  // Results count
  const count = results.length;
  if (count === 0) {
    console.log('No results found. Try different search terms.');
    return;
  }

  console.log(`📋 Found ${count} result${count > 1 ? 's' : ''}:`);
  console.log('');

  // Display each result
  results.forEach((result, index) => {
    console.log(`${index + 1}. ${result.title || 'Untitled'}`);

    if (result.url) {
      console.log(`   🔗 ${result.url}`);
    }

    if (result.snippet) {
      console.log(`   ${result.snippet}`);
    }

    if (result.date) {
      console.log(`   📅 ${result.date}`);
    }

    console.log('');
  });

  // Metadata
  if (options.verbose && metadata) {
    console.log('ℹ️  Metadata:');
    if (metadata.search_time) {
      console.log(`   Search time: ${metadata.search_time}s`);
    }
    if (metadata.sources_checked) {
      console.log(`   Sources checked: ${metadata.sources_checked}`);
    }
    console.log('');
  }
}

// Main search function
async function search(options) {
  const { query, timeout, verbose } = options;

  if (!verbose && !options.json) {
    console.log(`Searching for: "${query}"`);
    console.log('This will take about a minute, please wait...');
    console.log('');
  }

  try {
    const url = config.API_BASE_URL + config.ENDPOINTS.SEARCH;
    const requestData = JSON.stringify({
      query,
      options: {
        timeout,
        verbose
      }
    });

    if (verbose) {
      console.log('Sending request to:', url);
      console.log('Query:', query);
      console.log('Timeout:', timeout, 'seconds');
      console.log('');
    }

    const startTime = Date.now();
    const data = await makeRequest(url, { timeout }, requestData);
    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

    if (verbose) {
      console.log(`Response received in ${elapsedTime}s`);
      console.log('');
    }

    formatResults(data, options);

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Search failed:', error.message);
    console.error('');

    // Provide helpful suggestions
    if (error.message.includes('Network error') || error.message.includes('ENOTFOUND')) {
      console.error('💡 Suggestions:');
      console.error('   - Check if the backend URL is correct in scripts/config.js');
      console.error('   - Verify you have internet connection');
      console.error('   - Ensure the Scout backend is running');
    } else if (error.message.includes('timed out')) {
      console.error('💡 Suggestions:');
      console.error('   - Try increasing timeout: node search.js "query" --timeout 120');
      console.error('   - Simplify your search query');
      console.error('   - Try again later');
    } else if (error.message.includes('429')) {
      console.error('💡 You\'ve made too many requests. Please wait a minute and try again.');
    }

    console.error('');
    process.exit(1);
  }
}

// Run the search
if (require.main === module) {
  const options = parseArgs();
  search(options);
}

module.exports = { search, parseArgs };
