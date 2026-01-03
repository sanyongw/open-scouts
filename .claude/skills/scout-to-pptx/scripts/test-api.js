#!/usr/bin/env node

/**
 * Test script for the refactored Scout-to-PPTX API
 *
 * This script reads Scout results from test-scout-results.json
 * and sends them to the backend API to generate a PPT.
 *
 * Usage:
 *   node test-api.js [--no-images] [--with-screenshots]
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const config = require('./config');

// Read test Scout results
const testDataPath = path.join(__dirname, 'test-scout-results.json');
const scoutResults = JSON.parse(fs.readFileSync(testDataPath, 'utf8'));

// Parse command line options
const args = process.argv.slice(2);
const options = {
  generateImages: !args.includes('--no-images'),
  captureScreenshots: args.includes('--with-screenshots'),
  timeout: 300000 // 5 minutes
};

console.log('\n╔════════════════════════════════════════════════════════╗');
console.log('║     Testing Refactored Scout-to-PPTX API             ║');
console.log('╚════════════════════════════════════════════════════════╝\n');
console.log('Scout Query:', scoutResults.query);
console.log('Scout Results:', scoutResults.results.length);
console.log('Key Findings:', scoutResults.keyFindings?.length || 0);
console.log('\nOptions:');
console.log('  Generate Images:', options.generateImages);
console.log('  Capture Screenshots:', options.captureScreenshots);
console.log('');

// Prepare request
const url = config.API_BASE_URL + config.GENERATE_PPTX_ENDPOINT;
const requestData = JSON.stringify({
  scoutResults: scoutResults,
  options: options
});

console.log('📤 Sending request to:', url);
console.log('   This may take 1-5 minutes...\n');

const startTime = Date.now();

// Make request
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
    'Content-Length': Buffer.byteLength(requestData)
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
        const buffer = Buffer.concat(chunks);
        const filename = `test-output-${Date.now()}.pptx`;
        const filepath = path.join(__dirname, filename);

        fs.writeFileSync(filepath, buffer);

        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);

        console.log('╔════════════════════════════════════════════════════════╗');
        console.log('║     ✅ SUCCESS!                                        ║');
        console.log('╚════════════════════════════════════════════════════════╝\n');
        console.log(`📁 File: ${filename}`);
        console.log(`📍 Path: ${filepath}`);
        console.log(`📦 Size: ${(buffer.length / 1024).toFixed(1)} KB`);
        console.log(`⏱️  Time: ${elapsedTime}s\n`);

        process.exit(0);
      } else {
        // JSON response
        const responseData = Buffer.concat(chunks).toString();
        console.log('Response:', responseData);
        process.exit(0);
      }
    } else {
      const errorData = Buffer.concat(chunks).toString();
      console.error('\n╔════════════════════════════════════════════════════════╗');
      console.error('║     ❌ ERROR                                           ║');
      console.error('╚════════════════════════════════════════════════════════╝\n');
      console.error(`HTTP ${res.statusCode}:`, errorData, '\n');
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('\n╔════════════════════════════════════════════════════════╗');
  console.error('║     ❌ ERROR                                           ║');
  console.error('╚════════════════════════════════════════════════════════╝\n');
  console.error('Error:', error.message, '\n');
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  console.error('\n╔════════════════════════════════════════════════════════╗');
  console.error('║     ❌ TIMEOUT                                         ║');
  console.error('╚════════════════════════════════════════════════════════╝\n');
  console.error('Request timed out\n');
  process.exit(1);
});

req.write(requestData);
req.end();
