const connection = require('./db');

// Create a new product
function createProduct(product) {
  const sql = `
    INSERT INTO products (image, name, description, price, discount)
    VALUES (?, ?, ?, ?, ?)
  `;

  return connection.promise().query(sql, [product.image, product.name, product.description, product.price, product.discount]);
}

// Get product by ID
function getProductById(id) {
  const sql = `SELECT * FROM products WHERE id = ? LIMIT 1`;
  return connection.promise().query(sql, [id]).then(([rows]) => rows[0]);
}

// Get all products (with optional pagination)
function getAllProducts() {
  const sql = `SELECT * FROM products`;
  return connection.promise().query(sql); // returns [rows]
}


// Update product by ID (partial update)
function updateProduct(id, updates) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    fields.push(`${key} = ?`);
    values.push(updates[key]);
  }

  if (fields.length === 0) {
    return Promise.reject(new Error('No fields to update'));
  }

  const sql = `UPDATE products SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  return connection.promise().query(sql, values);
}

// Delete product by ID
function deleteProduct(id) {
  const sql = `DELETE FROM products WHERE id = ?`;
  return connection.promise().query(sql, [id]);
}

module.exports = {
  createProduct,
  getProductById,
  getAllProducts,
  updateProduct,
  deleteProduct,
};
