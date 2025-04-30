const connection = require('./db');

// Create a new prescription
function createPrescription(prescription) {
  const sql = `
    INSERT INTO prescriptions 
      (appointment_id, user_id, doctor_id, medication, dosage, instructions, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const createdAt = prescription.createdAt || new Date();

  return new Promise((resolve, reject) => {
    connection.query(
      sql,
      [
        prescription.appointment_id,
        prescription.user_id,
        prescription.doctor_id,
        prescription.medication,
        prescription.dosage,
        prescription.instructions,
        createdAt
      ],
      (error, results) => {
        if (error) {
          reject(error);
        } else {
          resolve(results);
        }
      }
    );
  });
}

// Get prescription by ID
function getPrescriptionById(id, callback) {
  const sql = `SELECT * FROM prescriptions WHERE id = ?`;
  connection.query(sql, [id], callback);
}

// Update prescription by ID (partial update)
function updatePrescription(id, updates, callback) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    fields.push(`${key} = ?`);
    values.push(updates[key]);
  }

  if (fields.length === 0) {
    return callback(new Error('No fields to update'));
  }

  const sql = `UPDATE prescriptions SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  connection.query(sql, values, callback);
}

// Delete prescription by ID
function deletePrescription(id, callback) {
  const sql = `DELETE FROM prescriptions WHERE id = ?`;
  connection.query(sql, [id], callback);
}

// Fetch prescriptions of a user with relation to service and user
function getPrescriptionsOfUser(userId) {
  const sql = `
    SELECT p.*,
      a.service AS servicename,
      u.fullname AS username,
      u.email AS useremail,
      u.phone AS userphone,
      d.fullname AS doctorname,
      d.phone AS doctorphone
    FROM prescriptions p
    JOIN appointments a ON p.appointment_id = a.id
    JOIN users u ON p.user_id = u.id
    JOIN users d ON p.doctor_id = d.id
    WHERE p.user_id = ?
  `;
  return new Promise((resolve, reject) => {
    connection.query(sql, [userId], (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
    });
  });
}

function getRecentPrescriptions() {
  const sql = `
    SELECT p.*, 
      u.id AS user_id, u.fullname AS user_name, u.email AS user_email,
      d.id AS doctor_id, d.fullname AS doctor_name, d.email AS doctor_email
    FROM prescriptions p
    JOIN users u ON p.user_id = u.id
    JOIN users d ON p.doctor_id = d.id
    ORDER BY p.createdAt DESC
    LIMIT 10
  `;
  return connection.promise().query(sql);
}


module.exports = {
  createPrescription,
  getPrescriptionById,
  updatePrescription,
  deletePrescription,
  getPrescriptionsOfUser,
  getRecentPrescriptions,

};
