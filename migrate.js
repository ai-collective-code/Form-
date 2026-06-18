require('dotenv').config();
const { pool } = require('./db');

async function run() {
  try {
    await pool.query('ALTER TABLE spec_sheets ADD COLUMN internal_snapshot JSON DEFAULT NULL;');
    console.log('Column internal_snapshot added successfully.');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('Column already exists.');
    } else {
      console.error('Error adding column:', err);
    }
  } finally {
    process.exit(0);
  }
}

run();
