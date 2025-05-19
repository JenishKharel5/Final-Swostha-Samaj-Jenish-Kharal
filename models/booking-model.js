const connection = require('./db');

// Create a new booking
async function createBooking(booking) {
  const sql = `
    INSERT INTO bookings (user_id, vaccine_id, bookingDate, status, ticketId, guest_fullname, guest_email, guest_phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const bookingDate = booking.bookingDate || new Date();

  return new Promise((resolve, reject) => {
    connection.query(
      sql,
      [
        booking.user_id || null,
        booking.vaccine_id,
        bookingDate,
        booking.status || 'Pending',
        booking.ticketId || null,
        booking.guest_fullname || null,
        booking.guest_email || null,
        booking.guest_phone || null
      ],
      (error, results) => {
        if (error) {
          console.error('Error creating booking:', error);
          return reject(error);
        }
        console.log('Booking created successfully:', results);
        resolve(results);
      }
    );
  });
}

// Get booking by ID
async function getBookingById(id) {
  const sql = `
    SELECT 
      bookings.*,
      vaccines.name AS vaccine_name,
      vaccines.hospital AS vaccine_hospital,
      COALESCE(users.fullname, bookings.guest_fullname) AS display_name,
      COALESCE(users.email, bookings.guest_email) AS display_email,
      COALESCE(users.phone, bookings.guest_phone) AS display_phone
    FROM bookings
    LEFT JOIN vaccines ON bookings.vaccine_id = vaccines.id
    LEFT JOIN users ON bookings.user_id = users.id
    WHERE bookings.id = ?
  `;
  return new Promise((resolve, reject) => {
    connection.query(sql, [id], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
}

// Update booking by ID (partial update)
function updateBooking(id, updates, callback) {
  const fields = [];
  const values = [];

  for (const key in updates) {
    fields.push(`${key} = ?`);
    values.push(updates[key]);
  }

  if (fields.length === 0) {
    return callback(new Error('No fields to update'));
  }

  const sql = `UPDATE bookings SET ${fields.join(', ')} WHERE id = ?`;
  values.push(id);

  connection.query(sql, values, callback);
}

// Delete booking by ID
function deleteBooking(id, callback) {
  const sql = `DELETE FROM bookings WHERE id = ?`;
  connection.query(sql, [id], callback);
}


// Get all bookings with vaccine and user relation (limited to 10)
async function getAllBookings(limit = 100, offset = 0) {
  const sql = `
    SELECT 
      bookings.*,
      vaccines.name AS vaccine_name,
      vaccines.hospital AS vaccine_hospital,
      users.fullname AS user_fullname,
      users.email AS user_email,
      users.phone AS user_phone,
      users.address AS user_address,
      users.avatar AS user_avatar,
      users.age AS user_age,
      users.sex AS user_sex,
      users.lastLogin AS user_last_login,
      COALESCE(users.fullname, bookings.guest_fullname) AS display_name,
      COALESCE(users.email, bookings.guest_email) AS display_email,
      COALESCE(users.phone, bookings.guest_phone) AS display_phone
    FROM bookings
    LEFT JOIN vaccines ON bookings.vaccine_id = vaccines.id
    LEFT JOIN users ON bookings.user_id = users.id
    ORDER BY bookings.BookingDate DESC
    LIMIT ?
    OFFSET ?
  `;
  return new Promise((resolve, reject) => {
    connection.query(sql, [limit, offset], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Get booking by ticket ID
async function getBookingByTicketId(ticketId) {
  const sql = `
    SELECT 
      bookings.*,
      vaccines.name AS vaccine_name,
      vaccines.hospital AS vaccine_hospital,
      COALESCE(users.fullname, bookings.guest_fullname) AS display_name,
      COALESCE(users.email, bookings.guest_email) AS display_email,
      COALESCE(users.phone, bookings.guest_phone) AS display_phone
    FROM bookings
    LEFT JOIN vaccines ON bookings.vaccine_id = vaccines.id
    LEFT JOIN users ON bookings.user_id = users.id
    WHERE bookings.ticketId = ?
  `;
  return new Promise((resolve, reject) => {
    connection.query(sql, [ticketId], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(null);
      resolve(results[0]);
    });
  });
}


// Get bookings of user ID and vaccine ID
async function getBookingsByUserIdAndVaccineId(userId, vaccineId) {
  const sql = `
    SELECT bookings.*
    FROM bookings
    WHERE bookings.user_id = ? AND bookings.vaccine_id = ?
  `;
  return new Promise((resolve, reject) => {
    connection.query(sql, [userId, vaccineId], (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}



module.exports = {
  createBooking,
  getBookingById,
  updateBooking,
  deleteBooking,
  getAllBookings,
  getBookingByTicketId,
  getBookingsByUserIdAndVaccineId,
};
