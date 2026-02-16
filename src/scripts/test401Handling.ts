/**
 * Test 401 Error Handling
 * Simulates expired/invalid token scenarios
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

async function test401Handling() {
  console.log('🔍 Testing 401 Error Handling...\n');

  // Test 1: Request with invalid token
  console.log('Test 1: Request with invalid token');
  try {
    await axios.get(`${API_BASE_URL}/products`, {
      headers: {
        Authorization: 'Bearer invalid_token_here',
      },
    });
    console.log('❌ Should have received 401 error');
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('✅ Received 401 Unauthorized as expected');
    } else {
      console.log(`❌ Received unexpected status: ${error.response?.status}`);
    }
  }

  console.log('');

  // Test 2: Request without token
  console.log('Test 2: Request without token');
  try {
    await axios.get(`${API_BASE_URL}/products`);
    console.log('❌ Should have received 401 error');
  } catch (error: any) {
    if (error.response?.status === 401) {
      console.log('✅ Received 401 Unauthorized as expected');
    } else {
      console.log(`❌ Received unexpected status: ${error.response?.status}`);
    }
  }

  console.log('');

  // Test 3: Login with invalid credentials (should NOT redirect)
  console.log('Test 3: Login with invalid credentials');
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'invalid@example.com',
      password: 'wrongpassword',
    });
    console.log('❌ Should have received 401 error');
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 400) {
      console.log('✅ Received authentication error as expected');
    } else {
      console.log(`❌ Received unexpected status: ${error.response?.status}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ 401 Error Handling Tests Complete!');
  console.log('Note: Make sure the backend server is running on port 3000');
}

// Run tests
test401Handling().catch(console.error);
