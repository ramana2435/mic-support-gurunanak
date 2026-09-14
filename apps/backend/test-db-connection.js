/**
 * Database Connection Test Script
 * Tests PostgreSQL connection to port 5433, database "mic_support"
 */

require('dotenv').config();
const { Pool } = require('pg');

const testConnection = async () => {
  console.log('='.repeat(60));
  console.log('PostgreSQL Connection Test');
  console.log('='.repeat(60));
  console.log();
  
  const databaseUrl = process.env.DATABASE_URL;
  console.log('📋 Configuration:');
  console.log('   DATABASE_URL:', databaseUrl ? databaseUrl.replace(/:[^:@]+@/, ':****@') : 'NOT SET');
  console.log();
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL not set in .env file');
    process.exit(1);
  }
  
  // Parse connection string to display details
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
  
  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  });
  
  try {
    console.log('🔄 Testing connection...');
    
    // Test 1: Basic connection
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // Test 2: Get PostgreSQL version
    const versionResult = await client.query('SELECT version()');
    const version = versionResult.rows[0].version;
    console.log('✅ PostgreSQL Version:', version.split(' ').slice(0, 2).join(' '));
    
    // Test 3: Get database name
    const dbResult = await client.query('SELECT current_database()');
    const database = dbResult.rows[0].current_database;
    console.log('✅ Connected to database:', database);
    
    // Test 4: Check if tables exist
    const tableResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log();
    console.log('📦 Existing Tables:', tableResult.rows.length);
    if (tableResult.rows.length > 0) {
      tableResult.rows.forEach(row => {
        console.log('   -', row.table_name);
      });
    } else {
      console.log('   (No tables yet - will be created on first backend start)');
    }
    
    client.release();
    
    console.log();
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED - Database connection is working!');
    console.log('='.repeat(60));
    
    await pool.end();
    process.exit(0);
    
  } catch (error) {
    console.log();
    console.log('='.repeat(60));
    console.error('❌ CONNECTION FAILED');
    console.log('='.repeat(60));
    console.error();
    console.error('Error:', error.message);
    console.error();
    console.log('🔍 Troubleshooting:');
    console.log('   1. Is PostgreSQL running?');
    console.log('   2. Is it running on port 5433 (not 5432)?');
    console.log('   3. Does database "mic_support" exist?');
    console.log('   4. Is the password in .env correct?');
    console.log('   5. Can you connect with psql manually?');
    console.log();
    console.log('💡 To create database manually:');
    console.log('   psql -U postgres -c "CREATE DATABASE mic_support;"');
    console.log();
    
    await pool.end();
    process.exit(1);
  }
};

testConnection();
