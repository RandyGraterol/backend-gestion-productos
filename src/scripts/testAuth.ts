/**
 * Script to test authentication functionality
 * Tests registration and login with the backend database
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
}

const results: TestResult[] = [];

// Generate unique test user
const timestamp = Date.now();
const testUser = {
  name: `Test User ${timestamp}`,
  email: `test${timestamp}@example.com`,
  password: 'TestPassword123!',
  role: 'employee'
};

async function testRegister(): Promise<{ success: boolean; token?: string; user?: any }> {
  console.log('\n🧪 Testing Registration...');
  console.log('Test user:', { name: testUser.name, email: testUser.email, role: testUser.role });
  
  try {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    
    if (response.data.success && response.data.data.token) {
      results.push({
        test: 'Registration',
        success: true,
        message: 'User registered successfully',
        data: {
          userId: response.data.data.user.id,
          email: response.data.data.user.email,
          role: response.data.data.user.role,
          hasToken: !!response.data.data.token
        }
      });
      
      console.log('✅ Registration successful!');
      console.log('   User ID:', response.data.data.user.id);
      console.log('   Email:', response.data.data.user.email);
      console.log('   Role:', response.data.data.user.role);
      console.log('   Token received:', response.data.data.token.substring(0, 20) + '...');
      
      return {
        success: true,
        token: response.data.data.token,
        user: response.data.data.user
      };
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    results.push({
      test: 'Registration',
      success: false,
      message: errorMsg
    });
    
    console.log('❌ Registration failed:', errorMsg);
    return { success: false };
  }
}

async function testLogin(): Promise<{ success: boolean; token?: string }> {
  console.log('\n🧪 Testing Login...');
  console.log('Login credentials:', { email: testUser.email });
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    
    if (response.data.success && response.data.data.token) {
      results.push({
        test: 'Login',
        success: true,
        message: 'Login successful',
        data: {
          userId: response.data.data.user.id,
          email: response.data.data.user.email,
          hasToken: !!response.data.data.token
        }
      });
      
      console.log('✅ Login successful!');
      console.log('   User ID:', response.data.data.user.id);
      console.log('   Email:', response.data.data.user.email);
      console.log('   Token received:', response.data.data.token.substring(0, 20) + '...');
      
      return {
        success: true,
        token: response.data.data.token
      };
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    results.push({
      test: 'Login',
      success: false,
      message: errorMsg
    });
    
    console.log('❌ Login failed:', errorMsg);
    return { success: false };
  }
}

async function testGetCurrentUser(token: string): Promise<boolean> {
  console.log('\n🧪 Testing Get Current User (Protected Route)...');
  
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    if (response.data.success && response.data.data) {
      results.push({
        test: 'Get Current User',
        success: true,
        message: 'Successfully retrieved current user',
        data: {
          userId: response.data.data.id,
          email: response.data.data.email,
          name: response.data.data.name
        }
      });
      
      console.log('✅ Get current user successful!');
      console.log('   User ID:', response.data.data.id);
      console.log('   Name:', response.data.data.name);
      console.log('   Email:', response.data.data.email);
      
      return true;
    } else {
      throw new Error('Invalid response structure');
    }
  } catch (error: any) {
    const errorMsg = error.response?.data?.message || error.message;
    results.push({
      test: 'Get Current User',
      success: false,
      message: errorMsg
    });
    
    console.log('❌ Get current user failed:', errorMsg);
    return false;
  }
}

async function testInvalidLogin(): Promise<boolean> {
  console.log('\n🧪 Testing Invalid Login (Wrong Password)...');
  
  try {
    await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: 'WrongPassword123!'
    });
    
    // If we get here, the test failed (should have thrown an error)
    results.push({
      test: 'Invalid Login',
      success: false,
      message: 'Login should have failed but succeeded'
    });
    
    console.log('❌ Invalid login test failed: Login should have been rejected');
    return false;
  } catch (error: any) {
    if (error.response?.status === 401 || error.response?.status === 400) {
      results.push({
        test: 'Invalid Login',
        success: true,
        message: 'Correctly rejected invalid credentials'
      });
      
      console.log('✅ Invalid login correctly rejected!');
      console.log('   Error:', error.response?.data?.message || error.message);
      return true;
    } else {
      results.push({
        test: 'Invalid Login',
        success: false,
        message: 'Unexpected error: ' + error.message
      });
      
      console.log('❌ Unexpected error:', error.message);
      return false;
    }
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🚀 Starting Authentication Tests');
  console.log('='.repeat(60));
  
  // Test 1: Register
  const registerResult = await testRegister();
  if (!registerResult.success) {
    console.log('\n❌ Registration failed, stopping tests');
    printSummary();
    return;
  }
  
  // Test 2: Login
  const loginResult = await testLogin();
  if (!loginResult.success) {
    console.log('\n❌ Login failed, stopping tests');
    printSummary();
    return;
  }
  
  // Test 3: Get Current User (with token from login)
  if (loginResult.token) {
    await testGetCurrentUser(loginResult.token);
  }
  
  // Test 4: Invalid Login
  await testInvalidLogin();
  
  // Print summary
  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${result.test}: ${result.message}`);
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log('='.repeat(60));
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed! Authentication is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Fatal error running tests:', error.message);
  process.exit(1);
});
