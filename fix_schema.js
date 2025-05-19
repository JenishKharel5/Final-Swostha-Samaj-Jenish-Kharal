const mysql = require('mysql2/promise');
const fs = require('fs').promises;

async function fixSchema() {
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '', // Add your MySQL password here if you have one
      database: 'swosthasamaj'
    });

    console.log('Connected to MySQL database');

    // Read the SQL file
    const sqlCommands = await fs.readFile('fix_bookings_schema.sql', 'utf8');

    // Split the commands by semicolon and execute each one
    const commands = sqlCommands.split(';').filter(cmd => cmd.trim());
    
    for (const command of commands) {
      if (command.trim()) {
        console.log('Executing:', command.trim());
        await connection.execute(command);
        console.log('Command executed successfully');
      }
    }

    console.log('All schema changes applied successfully');
    await connection.end();
  } catch (error) {
    console.error('Error fixing schema:', error);
  }
}

fixSchema(); 