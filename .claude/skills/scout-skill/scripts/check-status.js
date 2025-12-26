#!/usr/bin/env node

/**
 * Scout Status Checker
 *
 * Check the status of an async search
 *
 * Usage:
 *   node check-status.js <search-id>
 *   node check-status.js <search-id> --wait
 *   node check-status.js <search-id> --json
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

  return {
    searchId: args[0],
    wait: args.includes('--wait'),
    json: args.includes('--json')
  };
}

function showHelp() {
  console.log(`
Scout Status Checker - Check async search status

Usage:
  node check-status.js <search-id> [options]

Options:
  --wait    Wait for search to complete and show results
  --json    Output in JSON format
  --help    Show this help message

Examples:
  node check-status.js abc-123
  node check-status.js abc-123 --wait
  node check-status.js abc-123 --json
`);
}

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: config.REQUEST.headers,
      timeout: 10000
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

    req.end();
  });
}

function formatStatus(data, options) {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const { status, progress, results, summary, error } = data;

  console.log('');
  console.log(`Status: ${status.toUpperCase()}`);

  if (progress) {
    console.log(`Progress: ${progress.percentage}%`);
    if (progress.message) {
      console.log(`Message: ${progress.message}`);
    }
  }

  if (status === 'completed' && results) {
    console.log('');
    console.log('✅ Search Complete');
    console.log('');

    if (summary) {
      console.log('📝 Summary:');
      console.log(summary);
      console.log('');
    }

    console.log(`📋 Found ${results.length} results:`);
    console.log('');

    results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title || 'Untitled'}`);
      if (result.url) {
        console.log(`   🔗 ${result.url}`);
      }
      if (result.snippet) {
        console.log(`   ${result.snippet}`);
      }
      console.log('');
    });
  } else if (status === 'failed' && error) {
    console.log('');
    console.log('❌ Search Failed');
    console.log(`Error: ${error}`);
    console.log('');
  }
}

async function checkStatus(options) {
  const { searchId, wait, json } = options;

  try {
    const url = `${config.API_BASE_URL}${config.ENDPOINTS.STATUS}/${searchId}`;

    if (!json) {
      console.log(`Checking status for search: ${searchId}`);
    }

    let data = await makeRequest(url);

    formatStatus(data, options);

    // If wait flag is set and search is still running, poll until complete
    if (wait && (data.status === 'running' || data.status === 'pending')) {
      if (!json) {
        console.log('Waiting for search to complete...');
        console.log('Press Ctrl+C to stop waiting');
        console.log('');
      }

      while (data.status === 'running' || data.status === 'pending') {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        data = await makeRequest(url);

        if (!json && data.progress) {
          process.stdout.write(`\rProgress: ${data.progress.percentage}%`);
        }
      }

      if (!json) {
        process.stdout.write('\n');
      }

      formatStatus(data, options);
    }

    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Failed to check status:', error.message);
    console.error('');
    process.exit(1);
  }
}

if (require.main === module) {
  const options = parseArgs();
  checkStatus(options);
}

module.exports = { checkStatus };
