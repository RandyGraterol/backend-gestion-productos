/**
 * Test CORS Configuration
 * Verifies that CORS headers are present in responses
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';
const FRONTEND_ORIGIN = 'http://localhost:8080';

async function testCORS() {
  console.log('🔍 Testing CORS Configuration...\n');

  // Test 1: Health check endpoint
  console.log('Test 1: Health check endpoint');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, {
      headers: {
        Origin: FRONTEND_ORIGIN,
      },
    });

    const corsHeader = response.headers['access-control-allow-origin'];
    const credentialsHeader = response.headers['access-control-allow-credentials'];

    if (corsHeader === FRONTEND_ORIGIN) {
      console.log(`✅ Access-Control-Allow-Origin: ${corsHeader}`);
    } else {
      console.log(`❌ Access-Control-Allow-Origin: ${corsHeader} (expected ${FRONTEND_ORIGIN})`);
    }

    if (credentialsHeader === 'true') {
      console.log(`✅ Access-Control-Allow-Credentials: ${credentialsHeader}`);
    } else {
      console.log(`⚠️  Access-Control-Allow-Credentials: ${credentialsHeader}`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('');

  // Test 2: Preflight OPTIONS request
  console.log('Test 2: Preflight OPTIONS request');
  try {
    const response = await axios.options(`${API_BASE_URL}/api/products`, {
      headers: {
        Origin: FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type',
      },
    });

    const corsHeader = response.headers['access-control-allow-origin'];
    const methodsHeader = response.headers['access-control-allow-methods'];
    const headersHeader = response.headers['access-control-allow-headers'];

    if (corsHeader) {
      console.log(`✅ Access-Control-Allow-Origin: ${corsHeader}`);
    } else {
      console.log(`❌ Access-Control-Allow-Origin header missing`);
    }

    if (methodsHeader) {
      console.log(`✅ Access-Control-Allow-Methods: ${methodsHeader}`);
    } else {
      console.log(`⚠️  Access-Control-Allow-Methods header missing`);
    }

    if (headersHeader) {
      console.log(`✅ Access-Control-Allow-Headers: ${headersHeader}`);
    } else {
      console.log(`⚠️  Access-Control-Allow-Headers header missing`);
    }
  } catch (error: any) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ CORS Configuration Tests Complete!');
  console.log('Note: Make sure the backend server is running on port 3000');
}

// Run tests
testCORS().catch(console.error);
