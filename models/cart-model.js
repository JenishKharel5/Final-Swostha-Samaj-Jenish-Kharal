const connection = require('./db');

// Add or update cart item
function createCartItem(userId, productId, quantity) {
  const sql = `
    INSERT INTO carts (user_id, product_id, quantity)
    VALUES (?, ?, ?)
  `;

  return connection.promise().query(sql, [userId, productId, quantity]);
}

// Get cart items for a user
function getCartItemsByUser(userId) {
  const sql = `
    SELECT
      c.id AS cart_id,
      c.user_id,
      c.product_id,
      c.quantity,
      p.id AS product_id,
      p.name AS product_name,
      p.price AS product_price,
      p.description AS product_description,
      p.discount AS product_discount,
      p.image AS product_image
    FROM carts c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ?
  `;

  return connection.promise().query(sql, [userId]);
}

// Remove a product from cart
function removeCartItem(cartId, userId) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM carts WHERE id = ? AND user_id = ?`;
    connection.query(sql, [cartId, userId], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

// Clear all cart items for a user
function clearCart(userId, callback) {
  const sql = `DELETE FROM carts WHERE user_id = ?`;
  connection.query(sql, [userId], callback);
}

// Get cart item for a certain product from a certain user
function getCartItemsByUserAndProduct(userId, productId) {
  const sql = `
    SELECT
      c.id AS cart_id,
      c.user_id,
      c.product_id,
      c.quantity,
      p.id AS product_id,
      p.name AS product_name,
      p.price AS product_price,
      p.description AS product_description,
      p.discount AS product_discount,
      p.image AS product_image
    FROM carts c
    JOIN products p ON c.product_id = p.id
    WHERE c.user_id = ? AND c.product_id = ?
    LIMIT 1
  `;

  return connection.promise().query(sql, [userId, productId]).then(([rows]) => rows[0]);
}

// Update quantity of a cart item
function updateCartQuantity(userId, cartId, quantity) {
  const sql = `UPDATE carts SET quantity = ? WHERE user_id = ? AND id = ?`;
  return connection.promise().query(sql, [quantity, userId, cartId]);
}

module.exports = {
  createCartItem,
  getCartItemsByUser,
  removeCartItem,
  clearCart,
  getCartItemsByUserAndProduct,
  updateCartQuantity
};
