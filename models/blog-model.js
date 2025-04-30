const connection = require('./db');

// Create a new blog post
function createBlog(blog) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO blogs (title, image, content, author_id, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `;

    const createdAt = blog.createdAt || new Date();

    connection.query(
      sql,
      [blog.title, blog.image, blog.content, blog.author_id, createdAt],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

// Get blog post by ID
function getBlogById(id) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT b.id, b.title, b.image, b.content, b.createdAt,
             u.id AS author_id, u.fullname AS author_name, u.email AS author_email, u.avatar AS author_avatar
      FROM blogs b
      JOIN users u ON b.author_id = u.id
      WHERE b.id = ?
    `;

    connection.query(sql, [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error('Blog post not found'));

      const blog = results[0];
      blog.author = {
        id: blog.author_id,
        fullname: blog.author_name,
        email: blog.author_email,
      };
      delete blog.author_id;
      delete blog.author_name;
      delete blog.author_email;

      resolve(blog);
    });
  });
}

// Get all blogs (optional pagination)
function getAllBlogs(limit = 100, offset = 0, callback) {
  const sql = `SELECT * FROM blogs ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
  connection.query(sql, [limit, offset], callback);
}

// Update blog post by ID (partial update)
function updateBlog(id, updates, callback) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    fields.push(`${key} = ?`);
    values.push(updates[key]);
  }

  if (fields.length === 0) {
    return callback(new Error('No fields to update'));
  }

  const sql = `UPDATE blogs SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  connection.query(sql, values, callback);
}

// Delete blog post by ID
function deleteBlog(id, callback) {
  const sql = `DELETE FROM blogs WHERE id = ?`;
  connection.query(sql, [id], callback);
}

function getAllBlogsWithAuthors() {
  return new Promise((resolve, reject) => {
    const sql = `
        SELECT b.id, b.title, b.image, b.content, b.createdAt,
               u.id AS author_id, u.fullname AS author_name, u.email AS author_email
        FROM blogs b
        JOIN users u ON b.author_id = u.id
        ORDER BY b.createdAt DESC
      `;
    connection.query(sql, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}


module.exports = {
  createBlog,
  getBlogById,
  getAllBlogs,
  updateBlog,
  deleteBlog,
  getAllBlogsWithAuthors,
};
