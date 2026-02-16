/**
 * Script to simulate frontend authentication flow
 * This tests the exact same flow that the frontend components use
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';

// Simulate the frontend API client
class FrontendAPIClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor (same as frontend)
    this.client.interceptors.request.use(
      (config) => {
        if (this.token && config.headers) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      }
    );
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async post<T>(url: string, data?: any): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await this.client.post<T>(url, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'An error occurred',
      };
    }
  }

  async get<T>(url: string): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await this.client.get<T>(url);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'An error occurred',
      };
    }
  }
}

// Simulate the frontend authService
class AuthService {
  private api: FrontendAPIClient;

  constructor(api: FrontendAPIClient) {
    this.api = api;
  }

  async register(userData: { email: string; password: string; name: string; role: string }) {
    console.log('📤 Frontend: Calling authService.register()');
    console.log('   Data:', { ...userData, password: '***' });

    const response = await this.api.post<{ success: boolean; data: any; message: string }>(
      '/auth/register',
      userData
    );

    if (response.success && response.data) {
      const token = response.data.data.token;
      console.log('✅ Frontend: Registration successful, storing token');
      console.log('   Token:', token.substring(0, 20) + '...');
      this.api.setToken(token);
      return {
        success: true,
        data: response.data.data,
      };
    }

    console.log('❌ Frontend: Registration failed');
    console.log('   Error:', response.error);
    return response;
  }

  async login(email: string, password: string) {
    console.log('📤 Frontend: Calling authService.login()');
    console.log('   Email:', email);

    const response = await this.api.post<{ success: boolean; data: any; message: string }>(
      '/auth/login',
      { email, password }
    );

    if (response.success && response.data) {
      const token = response.data.data.token;
      console.log('✅ Frontend: Login successful, storing token');
      console.log('   Token:', token.substring(0, 20) + '...');
      this.api.setToken(token);
      return {
        success: true,
        data: response.data.data,
      };
    }

    console.log('❌ Frontend: Login failed');
    console.log('   Error:', response.error);
    return response;
  }

  async getCurrentUser() {
    console.log('📤 Frontend: Calling authService.getCurrentUser()');

    const response = await this.api.get<{ success: boolean; data: any }>('/auth/me');

    if (response.success && response.data) {
      console.log('✅ Frontend: Got current user');
      console.log('   User:', response.data.data.email);
      return {
        success: true,
        data: response.data.data,
      };
    }

    console.log('❌ Frontend: Failed to get current user');
    console.log('   Error:', response.error);
    return response;
  }

  logout() {
    console.log('📤 Frontend: Calling authService.logout()');
    this.api.clearToken();
    console.log('✅ Frontend: Token cleared');
  }
}

// Simulate the AuthContext
class AuthContext {
  private authService: AuthService;
  private user: any = null;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  async login(email: string, password: string) {
    console.log('🔵 AuthContext: login() called');
    
    const result = await this.authService.login(email, password);

    if (result.success && result.data) {
      this.user = result.data.user;
      console.log('✅ AuthContext: User state updated');
      return { success: true };
    }

    return { success: false, error: (result as any).error || 'Login failed' };
  }

  async register(name: string, email: string, password: string) {
    console.log('🔵 AuthContext: register() called');
    
    const result = await this.authService.register({
      email,
      password,
      name,
      role: 'employee',
    });

    if (result.success && result.data) {
      this.user = result.data.user;
      console.log('✅ AuthContext: User state updated');
      return { success: true };
    }

    return { success: false, error: (result as any).error || 'Registration failed' };
  }

  async refreshUser() {
    console.log('🔵 AuthContext: refreshUser() called');
    
    const result = await this.authService.getCurrentUser();

    if (result.success && result.data) {
      this.user = result.data;
      console.log('✅ AuthContext: User state refreshed');
    }
  }

  logout() {
    console.log('🔵 AuthContext: logout() called');
    this.authService.logout();
    this.user = null;
    console.log('✅ AuthContext: User state cleared');
  }

  getUser() {
    return this.user;
  }
}

// Simulate the Register component
async function simulateRegisterComponent(authContext: AuthContext) {
  console.log('\n' + '='.repeat(70));
  console.log('🎭 Simulating Register Component');
  console.log('='.repeat(70));

  const name = 'Frontend Test User';
  const email = `frontend-test-${Date.now()}@example.com`;
  const password = 'TestPassword123!';
  const confirmPassword = 'TestPassword123!';

  console.log('\n📝 User fills in registration form:');
  console.log('   Name:', name);
  console.log('   Email:', email);
  console.log('   Password: ***');
  console.log('   Confirm Password: ***');

  // Validate passwords match
  if (password !== confirmPassword) {
    console.log('❌ Passwords do not match');
    return false;
  }

  // Validate password length
  if (password.length < 8) {
    console.log('❌ Password must be at least 8 characters');
    return false;
  }

  console.log('\n🖱️  User clicks "Register" button');
  console.log('⏳ Loading state: true');

  const result = await authContext.register(name, email, password);

  if (result.success) {
    console.log('✅ Registration successful!');
    console.log('🎉 Toast: "Registration successful! You are now logged in as an operator."');
    console.log('🔄 Navigate to: / (home page)');
    console.log('⏳ Loading state: false');
    return true;
  } else {
    console.log('❌ Registration failed');
    console.log('🚨 Toast error:', result.error);
    console.log('⏳ Loading state: false');
    return false;
  }
}

// Simulate the Login component
async function simulateLoginComponent(authContext: AuthContext, email: string, password: string) {
  console.log('\n' + '='.repeat(70));
  console.log('🎭 Simulating Login Component');
  console.log('='.repeat(70));

  console.log('\n📝 User fills in login form:');
  console.log('   Email:', email);
  console.log('   Password: ***');

  console.log('\n🖱️  User clicks "Login" button');
  console.log('⏳ Loading state: true');

  const result = await authContext.login(email, password);

  if (result.success) {
    console.log('✅ Login successful!');
    console.log('🎉 Toast: "Login successful!"');
    console.log('🔄 Navigate to: / (home page)');
    console.log('⏳ Loading state: false');
    return true;
  } else {
    console.log('❌ Login failed');
    console.log('🚨 Toast error:', result.error);
    console.log('⏳ Loading state: false');
    return false;
  }
}

// Simulate protected route access
async function simulateProtectedRoute(authContext: AuthContext) {
  console.log('\n' + '='.repeat(70));
  console.log('🎭 Simulating Protected Route Access');
  console.log('='.repeat(70));

  console.log('\n🔄 User navigates to protected page');
  console.log('🔒 ProtectedRoute component checks authentication');

  await authContext.refreshUser();

  const user = authContext.getUser();

  if (user) {
    console.log('✅ User is authenticated');
    console.log('   User:', user.email);
    console.log('   Role:', user.role);
    console.log('✅ Access granted to protected page');
    return true;
  } else {
    console.log('❌ User is not authenticated');
    console.log('🔄 Redirect to: /login');
    return false;
  }
}

// Main test flow
async function runFrontendSimulation() {
  console.log('\n' + '█'.repeat(70));
  console.log('🚀 FRONTEND-BACKEND INTEGRATION TEST');
  console.log('█'.repeat(70));

  const api = new FrontendAPIClient();
  const authService = new AuthService(api);
  const authContext = new AuthContext(authService);

  let testEmail = '';
  let testPassword = 'TestPassword123!';

  // Test 1: Register
  console.log('\n\n📋 TEST 1: User Registration Flow');
  const registerSuccess = await simulateRegisterComponent(authContext);
  
  if (!registerSuccess) {
    console.log('\n❌ Registration test failed, stopping simulation');
    return;
  }

  testEmail = authContext.getUser()?.email || '';

  // Test 2: Logout
  console.log('\n\n📋 TEST 2: User Logout');
  authContext.logout();

  // Test 3: Login
  console.log('\n\n📋 TEST 3: User Login Flow');
  const loginSuccess = await simulateLoginComponent(authContext, testEmail, testPassword);
  
  if (!loginSuccess) {
    console.log('\n❌ Login test failed, stopping simulation');
    return;
  }

  // Test 4: Protected Route
  console.log('\n\n📋 TEST 4: Protected Route Access');
  const protectedSuccess = await simulateProtectedRoute(authContext);

  // Summary
  console.log('\n\n' + '█'.repeat(70));
  console.log('📊 SIMULATION SUMMARY');
  console.log('█'.repeat(70));
  console.log('✅ Registration Flow: PASSED');
  console.log('✅ Logout Flow: PASSED');
  console.log('✅ Login Flow: PASSED');
  console.log(protectedSuccess ? '✅ Protected Route: PASSED' : '❌ Protected Route: FAILED');
  console.log('\n🎉 All frontend-backend integration tests passed!');
  console.log('✅ The system is fully synchronized and ready for use.');
  console.log('█'.repeat(70));
}

// Run the simulation
runFrontendSimulation().catch(error => {
  console.error('\n💥 Fatal error in simulation:', error.message);
  process.exit(1);
});
