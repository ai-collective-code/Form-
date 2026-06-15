const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ai_collective_spec_sheet',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create a pool to use
const pool = mysql.createPool(poolConfig);

// Function to auto-initialize the database
async function initDatabase() {
  try {
    // 1. Connect without database name to ensure DB exists
    const { database, ...initPoolConfig } = poolConfig;
    const connection = await mysql.createConnection(initPoolConfig);
    
    // Create DB
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    await connection.end();
    
    // 2. Load schema.sql and execute
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const dbConnection = await mysql.createConnection(poolConfig);
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      // Split by semicolon and run each query
      const queries = schemaSql
        .split(';')
        .map(q => q.trim())
        .filter(q => q.length > 0);
        
      for (const query of queries) {
        // Skip USE statement as it's already handled in connection config
        if (query.toUpperCase().startsWith('USE ')) continue;
        await dbConnection.query(query);
      }
      
      await dbConnection.end();
      console.log('Database initialized successfully.');
    }
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
  }
}

module.exports = {
  pool,
  initDatabase
};
