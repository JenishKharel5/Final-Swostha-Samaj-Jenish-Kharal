const connection = require('./db');

// Create a new user
function createUser(user, callback) {
  const sql = `
    INSERT INTO users 
      (fullname, email, password, role, phone, age, sex, address, avatar, otp, otpExpiry, isVerified, lastLogin)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  connection.query(
    sql,
    [
      user.fullname,
      user.email,
      user.password,
      user.role || 'user',
      user.phone,
      user.age,
      user.sex,
      user.address,
      user.avatar, // Buffer or null
      user.otp,
      user.otpExpiry,
      user.isVerified || false,
      user.lastLogin
    ],
    callback
  );
}

// Get user by ID
function getUserById(id) {
  const sql = `SELECT * FROM users WHERE id = ? LIMIT 1`;
  return new Promise((resolve, reject) => {
    connection.query(sql, [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
}

// Get user by email
function getUserByEmail(email) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE email = ? LIMIT 1`;
    connection.query(sql, [email], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
}

// Update user by ID (partial update)
function updateUser(id, updates) {
  return new Promise((resolve, reject) => {
    const fields = [];
    const values = [];

    for (const key in updates) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }

    if (fields.length === 0) {
      return reject(new Error('No fields to update'));
    }

    const sql = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    connection.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Delete user by ID
function deleteUser(id, callback) {
  const sql = `DELETE FROM users WHERE id = ?`;
  connection.query(sql, [id], callback);
}

// Verify user (set isVerified = true)
function verifyUser(id, callback) {
  const sql = `UPDATE users SET isVerified = TRUE WHERE id = ?`;
  connection.query(sql, [id], callback);
}

// Update last login timestamp
function updateLastLogin(id, callback) {
  const sql = `UPDATE users SET lastLogin = NOW() WHERE id = ?`;
  connection.query(sql, [id], callback);
}

function updatePasswordByEmail(email, newHashedPassword, callback) {
  const sql = `UPDATE users SET password = ? WHERE email = ?`;
  connection.query(sql, [newHashedPassword, email], callback);
}

function updateLastPasswordChange(email) {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE users SET last_password_change = CURRENT_TIMESTAMP WHERE email = ?`;
    connection.query(sql, [email], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

function findOneByEmailAndVerified(email) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM users WHERE email = ? AND isVerified = TRUE LIMIT 1`;
    connection.query(sql, [email], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
}

function updateAvatar(userId, avatar) {
  return new Promise((resolve, reject) => {
    const sql = `UPDATE users SET avatar = ? WHERE id = ?`;
    connection.query(sql, [avatar, userId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function countPatients() {
  const sql = `SELECT COUNT(*) AS totalPatients FROM users WHERE role = ?`;
  return connection.promise().query(sql, ['user']);
}

function countPatientsWithAppointments() {
  const sql = `
    SELECT COUNT(*) AS totalPatients
    FROM users
    WHERE role = 'user' AND id IN (SELECT user_id FROM appointments)
  `;
  return connection.promise().query(sql, ['user']);
}


function getUsersByRole(roles, callback) {
  const placeholders = roles.map(() => "?").join(",");
  const sql = `SELECT * FROM users WHERE role IN (${placeholders})`;
  connection.query(sql, roles, (err, results) => {
    if (err) return callback(err);
    callback(null, results);
  });
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  verifyUser,
  updateLastLogin,
  updatePasswordByEmail,
  findOneByEmailAndVerified,
  updateAvatar,
  countPatients,
  countPatientsWithAppointments,
  getUsersByRole,
  updateLastPasswordChange
};
