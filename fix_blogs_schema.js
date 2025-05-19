const mysql = require('mysql2/promise');

async function fixBlogsSchema() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'swosthasamaj'
  });

  try {
    console.log('Starting blogs table schema fix...');

    // Add status column
    await connection.execute(`
      ALTER TABLE blogs 
      ADD COLUMN IF NOT EXISTS status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'
    `);
    console.log('Added status column to blogs table');

    // Create index
    await connection.execute(`
      CREATE INDEX IF NOT EXISTS idx_status ON blogs(status)
    `);
    console.log('Created index on status column');

    // Update existing blogs
    await connection.execute(`
      UPDATE blogs SET status = 'approved' WHERE status IS NULL
    `);
    console.log('Updated existing blogs to have approved status');

    console.log('Blogs table schema fix completed successfully');
  } catch (error) {
    console.error('Error fixing blogs table schema:', error);
  } finally {
    await connection.end();
  }
}

fixBlogsSchema(); 