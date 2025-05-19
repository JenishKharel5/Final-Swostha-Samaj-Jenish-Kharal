const db = require("./db");

class Message {
  static createMessage({ sender_id, receiver_id, room, content }, callback) {
    const query = `
      INSERT INTO messages (sender_id, receiver_id, room, content, created_at)
      VALUES (?, ?, ?, ?, NOW())
    `;
    db.query(query, [sender_id, receiver_id, room, content], (err, result) => {
      if (err) return callback(err);
      callback(null, result.insertId);
    });
  }

  static getMessagesByRoom(room, callback) {
    const query = `
      SELECT m.*, u1.fullname AS sender_name, u2.fullname AS receiver_name
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      WHERE m.room = ?
      ORDER BY m.created_at ASC
    `;
    db.query(query, [room], (err, messages) => {
      if (err) return callback(err);
      callback(null, messages);
    });
  }

  static getRecentChats(userId, userRole, callback) {
    let query = `
      SELECT DISTINCT m.room, 
             (SELECT content FROM messages m2 WHERE m2.room = m.room ORDER BY m2.created_at DESC LIMIT 1) AS last_message,
             (SELECT created_at FROM messages m2 WHERE m2.room = m.room ORDER BY m2.created_at DESC LIMIT 1) AS last_message_time,
             CASE 
               WHEN m.sender_id = ? THEN u2.id 
               ELSE u1.id 
             END AS other_user_id,
             CASE 
               WHEN m.sender_id = ? THEN u2.fullname 
               ELSE u1.fullname 
             END AS other_user_name
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
    `;
    const params = [userId, userId, userId, userId];

    if (["admin", "staff"].includes(userRole)) {
      query += ` AND (
        (m.sender_id = ? AND u2.role = 'user') OR 
        (m.receiver_id = ? AND u1.role = 'user')
      )`;
      params.push(userId, userId);
    } else if (userRole === "user") {
      query += ` AND (
        (m.sender_id = ? AND u2.role IN ('admin', 'staff')) OR 
        (m.receiver_id = ? AND u1.role IN ('admin', 'staff'))
      )`;
      params.push(userId, userId);
    }

    query += ` ORDER BY last_message_time DESC`;

    db.query(query, params, (err, chats) => {
      if (err) return callback(err);
      callback(null, chats);
    });
  }

  // Delete all messages in a room (conversation)
  static deleteConversation(room, callback) {
    const query = `DELETE FROM messages WHERE room = ?`;
    db.query(query, [room], (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    });
  }

  // Delete a single message by ID
  static deleteMessageById(messageId, senderId, callback) {
    const query = `DELETE FROM messages WHERE id = ? AND sender_id = ?`;
    db.query(query, [messageId, senderId], (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    });
  }

  // Contact form methods
  static async createContact({ name, email, message }) {
    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO contacts (name, email, message, created_at)
        VALUES (?, ?, ?, NOW())
      `;
      db.query(query, [name, email, message], (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      });
    });
  }

  static async getContactById(id) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM contacts WHERE id = ?
      `;
      db.query(query, [id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
  }

  static async getAllContacts() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT * FROM contacts ORDER BY created_at DESC
      `;
      db.query(query, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });
  }

  static async deleteContact(id) {
    return new Promise((resolve, reject) => {
      const query = `
        DELETE FROM contacts WHERE id = ?
      `;
      db.query(query, [id], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  static muteChat(staffId, userId, callback) {
    const query = 'INSERT INTO muted_chats (staff_id, user_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE id=id';
    db.query(query, [staffId, userId], (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    });
  }

  static unmuteChat(staffId, userId, callback) {
    const query = 'DELETE FROM muted_chats WHERE staff_id = ? AND user_id = ?';
    db.query(query, [staffId, userId], (err, result) => {
      if (err) return callback(err);
      callback(null, result);
    });
  }

  static isChatMuted(staffId, userId, callback) {
    const query = 'SELECT id FROM muted_chats WHERE staff_id = ? AND user_id = ?';
    db.query(query, [staffId, userId], (err, results) => {
      if (err) return callback(err);
      callback(null, results.length > 0);
    });
  }
}

module.exports = Message;