const connection = require('./db');

// Create a new vaccine
function createVaccine(vaccine) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO vaccines (name, description, availableSlots, hospital, image) VALUES (?, ?, ?, ?, ?)`;
    connection.query(sql, [vaccine.name, vaccine.description, vaccine.availableSlots, vaccine.hospital, vaccine.image], (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
}

// Get vaccine by ID
function getVaccineById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT * FROM vaccines WHERE id = ?`;
    connection.query(sql, [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
}

// Get all vaccines (with optional pagination)
function getAllVaccines(limit = 100, offset = 0) {
  const sql = `
    SELECT v.*
    FROM vaccines v
    ORDER BY v.createdAt DESC
    LIMIT ?
    OFFSET ?
  `;
  return connection.promise().query(sql, [limit, offset]);
}

// Update vaccine by ID (partial update)
function updateVaccine(id, updates) {
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

    const sql = `UPDATE vaccines SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);

    connection.query(sql, values, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Delete vaccine by ID
function deleteVaccine(id, callback) {
  const sql = `DELETE FROM vaccines WHERE id = ?`;
  connection.query(sql, [id], callback);
}

function getAvailableVaccines() {
  const sql = 'SELECT * FROM vaccines WHERE availableSlots > 0';
  return connection.promise().query(sql);
}

module.exports = {
  createVaccine,
  getVaccineById,
  getAllVaccines,
  updateVaccine,
  deleteVaccine,
  getAvailableVaccines,
};
