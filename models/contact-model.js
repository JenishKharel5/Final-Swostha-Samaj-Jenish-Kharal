const connection = require('./db');

// Create a new contact message
function createContact(contactData, callback) {
  const sql = `
    INSERT INTO messages (name, email, message, createdAt)
    VALUES (?, ?, ?, ?)
  `;

  const createdAt = contactData.createdAt || new Date();

  connection.query(
    sql,
    [contactData.name, contactData.email, contactData.message, createdAt],
    callback
  );
}

// Get contact message by ID
function getContactById(id, callback) {
  const sql = `SELECT * FROM messages WHERE id = ?`;
  connection.query(sql, [id], callback);
}

function getLimitedContacts(limit = 3, offset = 0) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    connection.query(sql, [limit, offset], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Get all contact messages (optional pagination)
function getAllContacts(limit = 100, offset = 0) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM messages ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    connection.query(sql, [limit, offset], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Delete contact message by ID
function deleteContact(id, callback) {
  const sql = `DELETE FROM messages WHERE id = ?`;
  connection.query(sql, [id], callback);
}

function countMessages() {
  const sql = 'SELECT COUNT(*) AS messageCount FROM messages';
  return connection.promise().query(sql);
}

module.exports = {
  createContact,
  getContactById,
  getAllContacts,
  deleteContact,
  countMessages,
  getLimitedContacts,
};
