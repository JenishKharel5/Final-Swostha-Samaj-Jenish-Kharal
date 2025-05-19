const connection = require('./db');

// Fetch all billings for a user
function getBillingsByUserId(userId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT * FROM billings WHERE user_id = ? ORDER BY created_at DESC';
    connection.query(sql, [userId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Create a new billing record
function createBilling(billing) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO billings 
      (user_id, product_id, bill_no, quantity, unit_price, total_price, discount, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    connection.query(
      sql,
      [
        billing.user_id,
        billing.product_id,
        billing.bill_no,
        billing.quantity,
        billing.unit_price,
        billing.total_price,
        billing.discount,
        billing.status
      ],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      }
    );
  });
}

module.exports = {
  getBillingsByUserId,
  createBilling
};