const connection = require('./db');

// Create a new appointment
function createAppointment(appointmentData, callback) {
  const sql = `
      INSERT INTO appointments (date, time, service, user_id, status)
      VALUES ( ?, ?, ?, ?, ?)
    `;


  connection.query(
    sql,
    [appointmentData.date, appointmentData.time, appointmentData.service, appointmentData.user_id, 'Pending'],
    callback
  );
}

// Get appointment by ID
function getAppointmentById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM appointments WHERE id = ?`;
    connection.query(sql, [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
}

// Get all appointments (optional pagination)
function getAllAppointments(limit = 100, offset = 0) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT a.*, u.fullname AS user_fullname, u.email AS user_email, u.phone AS user_phone, u.avatar AS user_avatar, u.age AS user_age, u.sex AS user_sex, u.address AS user_address, u.lastLogin AS user_last_login
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      ORDER BY a.date DESC, a.time DESC
      LIMIT ?
      OFFSET ?
    `;

    connection.query(sql, [limit, offset], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getAllVerifiedAppointments(limit = 100, offset = 0) {
  const sql = `
    SELECT a.*, 
           u.fullname as user_fullname, 
           u.email as user_email, 
           u.phone as user_phone, 
           u.address as user_address, 
           u.age as user_age, 
           u.sex as user_sex, 
           u.avatar as user_avatar,
           u.lastLogin as user_last_login,
           u.id as user_id
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    WHERE a.status = 'Accepted'
    ORDER BY a.date DESC, a.time DESC
    LIMIT ? OFFSET ?
  `;
  return connection.promise().query(sql, [limit, offset]);
}

// Update appointment by ID (partial update)
function updateAppointment(id, updates) {
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

    const sql = `UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    connection.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Delete appointment by ID
function deleteAppointment(id) {
  return new Promise((resolve, reject) => {
    connection.query('DELETE FROM prescriptions WHERE appointment_id = ?', [id], (err, result2) => {
      if (err) return reject(err);
      connection.query('DELETE FROM appointments WHERE id = ?', [id], (err2, result) => {
        if (err2) return reject(err2);
        resolve([result, result2]);
      });
    });
  });
}

// Get appointment by user ID
function getAppointmentByUserId(userId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT a.*, u.fullname AS user_fullname, u.email AS user_email, u.phone AS user_phone
      FROM appointments a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
    `;
    connection.query(sql, [userId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}


function getUpcomingAppointmentsByUserId(userId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM appointments
      WHERE user_id = ? AND date >= CURDATE()
      ORDER BY date ASC
    `;
    connection.query(sql, [userId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

function checkExistingAppointmentForSameServiceAtSameTime(userId, service, date, time) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT * FROM appointments
      WHERE user_id = ? AND service = ? AND date = ? AND time = ?
    `;
    connection.query(sql, [userId, service, date, time], (err, result) => {
      if (err) return reject(err);
      resolve(result.length > 0);
    });
  });
}

function checkAppointmentLimit(userId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT COUNT(*) AS count
      FROM appointments
      WHERE user_id = ?
        AND status IN ('Pending', 'Accepted')
        AND date >= CURDATE()
    `;
    connection.query(sql, [userId], (err, result) => {
      if (err) return reject(err);
      resolve(result[0].count >= 3);
    });
  });
}

function getUpcomingAppointments() {
  const sql = `
    SELECT a.*, u.fullname AS user_fullname
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    WHERE a.date >= CURDATE()
    ORDER BY a.date ASC
  `;

  return connection.promise().query(sql);
}

function getTodaysAppointments(todayStart, todayEnd) {
  const sql = `
    SELECT a.*, u.id AS user_id, u.fullname AS user_name, u.email AS user_email, u.phone AS user_phone, u.avatar AS user_avatar
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    WHERE a.date BETWEEN ? AND ?
    ORDER BY a.time ASC
    LIMIT 10
  `;
  return connection.promise().query(sql, [todayStart, todayEnd]);
}

function countAppointmentsToday() {
  const sql = `
    SELECT COUNT(*) AS totalAppointmentsToday
    FROM appointments
    WHERE date >= CURDATE() AND date < DATE_ADD(CURDATE(), INTERVAL 1 DAY)
  `;
  return connection.promise().query(sql);
}

function countPendingAppointments() {
  const sql = "SELECT COUNT(*) AS pendingCount FROM appointments WHERE status = ?";
  return connection.promise().query(sql, ['Pending']);
}

// Check if any appointment exists at the same date and time (for all users)
function checkAnyAppointmentAtDateTime(date, time) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM appointments WHERE date = ? AND time = ?`;
    connection.query(sql, [date, time], (err, result) => {
      if (err) return reject(err);
      resolve(result.length > 0);
    });
  });
}

// Get paginated verified appointments
async function getPaginatedVerifiedAppointments(limit, offset) {
  const sql = `
    SELECT a.*, 
           u.fullname as user_fullname, 
           u.email as user_email, 
           u.phone as user_phone, 
           u.address as user_address, 
           u.age as user_age, 
           u.sex as user_sex, 
           u.avatar as user_avatar,
           u.lastLogin as user_last_login,
           u.id as user_id
    FROM appointments a
    JOIN users u ON a.user_id = u.id
    WHERE a.status = 'Accepted'
    ORDER BY a.date DESC, a.time DESC
    LIMIT ? OFFSET ?
  `;
  return await connection.promise().query(sql, [limit, offset]);
}

// Count all verified appointments
async function countAllVerifiedAppointments() {
  const sql = `
    SELECT COUNT(*) as count
    FROM appointments
    WHERE status = 'Accepted'
  `;
  return await connection.promise().query(sql);
}

module.exports = {
  createAppointment,
  getAppointmentById,
  getAllAppointments,
  updateAppointment,
  deleteAppointment,
  getUpcomingAppointmentsByUserId,
  checkExistingAppointmentForSameServiceAtSameTime,
  checkAppointmentLimit,
  getUpcomingAppointments,
  countAppointmentsToday,
  getAppointmentByUserId,
  getTodaysAppointments,
  countPendingAppointments,
  getAllVerifiedAppointments,
  checkAnyAppointmentAtDateTime,
  getPaginatedVerifiedAppointments,
  countAllVerifiedAppointments
};