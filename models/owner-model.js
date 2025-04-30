const connection = require('./db');

// Create a new owner
function createOwner(owner, callback) {
  const sql = `
    INSERT INTO owners (fullname, email, password, gstin, picture, products)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  const productsJson = JSON.stringify(owner.products || []);

  connection.query(
    sql,
    [owner.fullname, owner.email, owner.password, owner.gstin, owner.picture, productsJson],
    callback
  );
}

// Get owner by ID
function getOwnerById(id, callback) {
  const sql = `SELECT * FROM owners WHERE id = ?`;
  connection.query(sql, [id], (err, results) => {
    if (err) return callback(err);
    if (results.length === 0) return callback(null, null);

    const owner = results[0];
    owner.products = JSON.parse(owner.products);
    callback(null, owner);
  });
}

// Update owner by ID (partial update)
function updateOwner(id, updates, callback) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    if (key === 'products') {
      fields.push(`${key} = ?`);
      values.push(JSON.stringify(updates[key]));
    } else {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return callback(new Error('No fields to update'));
  }

  const sql = `UPDATE owners SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  connection.query(sql, values, callback);
}

// Delete owner by ID
function deleteOwner(id, callback) {
  const sql = `DELETE FROM owners WHERE id = ?`;
  connection.query(sql, [id], callback);
}

module.exports = {
  createOwner,
  getOwnerById,
  updateOwner,
  deleteOwner,
};
