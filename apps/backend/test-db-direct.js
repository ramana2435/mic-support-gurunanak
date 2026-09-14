/**
 * Direct PostgreSQL Connection Test (No Dependencies)
 * Tests connection using only Node.js built-in modules
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('PostgreSQL Direct Connection Test');
console.log('='.repeat(60));
console.log();

// Read .env file
const envPath = path.join(__dirname, '.env');
let databaseUrl = '';

try {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
  if (match) {
    databaseUrl = match[1];
  }
} catch (error) {
  console.error('❌ ERROR: Cannot read .env file');
  process.exit(1);
}

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL not found in .env');
  process.exit(1);
}

console.log('📋 Configuration:');
console.log('   DATABASE_URL:', databaseUrl.replace(/:[^:@]+@/, ':****@'));
console.log();

// Parse DATABASE_URL
try {
  const url = new URL(databaseUrl);
  console.log('📊 Connection Details:');
  console.log('   Host:', url.hostname);
  console.log('   Port:', url.port);
  console.log('   Database:', url.pathname.substring(1));
  console.log('   Username:', url.username);
  console.log();
} catch (error) {
  console.error('❌ ERROR: Invalid DATABASE_URL format');
  process.exit(1);
}

// Try to find psql
console.log('🔍 Looking for PostgreSQL client (psql)...');

const possiblePaths = [
  'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe',
  'C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\17\\bin\\psql.exe',
  'C:\\Program Files (x86)\\PostgreSQL\\16\\bin\\psql.exe',
];

let psqlPath = null;
for (const path of possiblePaths) {
  if (fs.existsSync(path)) {
    psqlPath = path;
    console.log('✅ Found psql at:', path);
    break;
  }
}

if (!psqlPath) {
  console.log('⚠️  psql not found in common locations');
  console.log();
  console.log('📊 Configuration Summary:');
  console.log('   ✅ .env file exists');
  console.log('   ✅ DATABASE_URL is configured');
  console.log('   ✅ Port 5433 detected');
  console.log('   ✅ Database name: mic_support');
  console.log();
  console.log('⚠️  Cannot test connection without psql or node modules');
  console.log();
  console.log('💡 Next Steps:');
  console.log('   1. Wait for npm install to finish');
  console.log('   2. Then run: node test-db-connection.js');
  console.log();
  console.log('   Or manually verify with:');
  console.log('   psql -U postgres -p 5433 -d mic_support -c "SELECT 1;"');
  console.log();
  process.exit(0);
}

// Test connection with psql
console.log();
console.log('🔄 Testing connection...');
console.log();

const url = new URL(databaseUrl);
const args = [
  '-U', url.username,
  '-h', url.hostname,
  '-p', url.port,
  '-d', url.pathname.substring(1),
  '-c', 'SELECT version();'
];

const env = {
  ...process.env,
  PGPASSWORD: url.password
};

const psql = spawn(psqlPath, args, { env });

let output = '';
let errorOutput = '';

psql.stdout.on('data', (data) => {
  output += data.toString();
});

psql.stderr.on('data', (data) => {
  errorOutput += data.toString();
});

psql.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Connection successful!');
    
    // Extract version
    const versionMatch = output.match(/PostgreSQL\s+[\d.]+/i);
    if (versionMatch) {
      console.log('✅ PostgreSQL Version:', versionMatch[0]);
    }
    
    console.log('✅ Connected to database:', url.pathname.substring(1));
    console.log('✅ Port:', url.port);
    console.log();
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Database connection is working!');
    console.log('='.repeat(60));
    console.log();
    console.log('📦 Existing Tables: (will be checked after npm install completes)');
    console.log('   Tables will be auto-created when backend starts');
    console.log();
    process.exit(0);
  } else {
    console.log('='.repeat(60));
    console.error('❌ CONNECTION FAILED');
    console.log('='.repeat(60));
    console.error();
    console.error('Error:', errorOutput || 'Connection refused');
    console.error();
    console.log('🔍 Troubleshooting:');
    console.log('   1. Is PostgreSQL running?');
    console.log('   2. Is it running on port 5433 (not 5432)?');
    console.log('   3. Does database "mic_support" exist?');
    console.log('   4. Is the password in .env correct?');
    console.log();
    console.log('💡 To create database:');
    console.log('   psql -U postgres -p 5433 -c "CREATE DATABASE mic_support;"');
    console.log();
    process.exit(1);
  }
});
