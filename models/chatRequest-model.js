const db = require('./db');

const ChatRequest = {
  // Create a new chat request (pending)
  create: (user_id, admin_id, callback) => {
    const sql = `INSERT INTO chat_requests (user_id, admin_id, status) VALUES (?, ?, 'pending')`;
    db.query(sql, [user_id, admin_id], callback);
  },

  // Get chat request by user and admin
  getByUserAndAdmin: (user_id, admin_id, callback) => {
    const sql = `SELECT * FROM chat_requests WHERE user_id = ? AND admin_id = ? LIMIT 1`;
    db.query(sql, [user_id, admin_id], (err, results) => {
      if (err) return callback(err);
      callback(null, results[0]);
    });
  },

  // Get all pending requests for an admin
  getPendingForAdmin: (admin_id, callback) => {
    const sql = `SELECT * FROM chat_requests WHERE admin_id = ? AND status = 'pending'`;
    db.query(sql, [admin_id], callback);
  },

  // Update status (accept, reject, block, unblock)
  updateStatus: (id, status, callback) => {
    const sql = `UPDATE chat_requests SET status = ? WHERE id = ?`;
    db.query(sql, [status, id], callback);
  },

  // Block a user from chatting
  blockUser: (user_id, admin_id, callback) => {
    const sql = `UPDATE chat_requests SET status = 'blocked' WHERE user_id = ? AND admin_id = ?`;
    db.query(sql, [user_id, admin_id], callback);
  },

  // Unblock a user
  unblockUser: (user_id, admin_id, callback) => {
    const sql = `UPDATE chat_requests SET status = 'accepted' WHERE user_id = ? AND admin_id = ?`;
    db.query(sql, [user_id, admin_id], callback);
  }
};

module.exports = ChatRequest; 
