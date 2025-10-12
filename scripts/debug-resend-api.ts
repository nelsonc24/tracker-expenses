#!/usr/bin/env tsx
/**
 * Debug script to test Resend API key directly
 * This makes a raw API call to help diagnose authentication issues
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';

console.log('🔍 Debugging Resend API Connection\n');

// 1. Check environment variables
console.log('1️⃣ Environment Variables:');
console.log(`   RESEND_API_KEY: ${RESEND_API_KEY ? `${RESEND_API_KEY.substring(0, 10)}...` : 'NOT SET'}`);
console.log(`   Full length: ${RESEND_API_KEY?.length || 0} characters`);
console.log(`   Starts with 're_': ${RESEND_API_KEY?.startsWith('re_') ? '✅' : '❌'}`);
console.log(`   EMAIL_FROM: ${EMAIL_FROM}\n`);

// 2. Test API key with raw fetch
console.log('2️⃣ Testing API Key with Direct HTTP Request:');

if (!RESEND_API_KEY) {
  console.log('❌ Cannot test - API key is missing\n');
  process.exit(1);
}

async function testApiKey() {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: 'test@example.com', // Won't actually send
        subject: 'API Key Test',
        html: '<p>Test</p>',
      }),
    });

    console.log(`   Response Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.log('   Response Body:', JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('\n❌ API Key Authentication Failed');
      console.log('\n📋 Possible Issues:');
      console.log('   1. The API key has been revoked or deleted');
      console.log('   2. The API key is from a different Resend account');
      console.log('   3. There are hidden characters in the .env.local file');
      console.log('   4. The API key has expired (if time-limited)');
      console.log('\n🔧 Solutions:');
      console.log('   1. Go to https://resend.com/api-keys');
      console.log('   2. Verify this key exists in the list');
      console.log('   3. If not, create a new API key');
      console.log('   4. Copy the ENTIRE key (should start with re_)');
      console.log('   5. Replace the value in .env.local');
    } else if (response.status === 422) {
      console.log('\n⚠️  Request validation error');
      console.log('   The API key is valid, but the request has issues');
      console.log('   (This is actually good - it means authentication works!)');
    } else if (response.status === 200 || response.status === 201) {
      console.log('\n✅ API Key is VALID!');
    }

  } catch (error) {
    console.log('❌ Error making request:', error);
  }
}

testApiKey();
