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
}

module.exports = Message;