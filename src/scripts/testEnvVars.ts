/**
 * Test Environment Variables Loading
 * Verifies that all required environment variables are loaded correctly
 */

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

interface EnvConfig {
  PORT: string;
  NODE_ENV: string;
  DB_PATH: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  CORS_ORIGIN: string;
  LOG_LEVEL: string;
}

const requiredEnvVars: (keyof EnvConfig)[] = [
  'PORT',
  'NODE_ENV',
  'DB_PATH',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CORS_ORIGIN',
  'LOG_LEVEL',
];

const defaultValues: Partial<EnvConfig> = {
  PORT: '3000',
  NODE_ENV: 'development',
  CORS_ORIGIN: 'http://localhost:5173',
  JWT_EXPIRES_IN: '24h',
  LOG_LEVEL: 'info',
};

console.log('🔍 Testing Backend Environment Variables...\n');

let allPassed = true;

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  const defaultValue = defaultValues[varName];

  if (value) {
    console.log(`✅ ${varName}: ${value}`);
  } else if (defaultValue) {
    console.log(`⚠️  ${varName}: Using default value (${defaultValue})`);
  } else {
    console.log(`❌ ${varName}: MISSING (no default available)`);
    allPassed = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allPassed) {
  console.log('✅ All required environment variables are loaded!');
  process.exit(0);
} else {
  console.log('❌ Some required environment variables are missing!');
  process.exit(1);
}
