const express = require("express");
const router = express.Router();
const Appointment = require("../models/appointment-model");
const isLoggedIn = require("../middlewares/isLoggedIn");
const Prescription = require("../models/prescription-model");
const bookingModel = require("../models/booking-model");
const Vaccine = require("../models/vaccine-model");
const User = require("../models/user-model");
const Message = require("../models/contact-model");
const checkRole = require("../middlewares/checkRole");
const multer = require("../config/multer-config");
const emailService = require('../utils/emailService');
const blogModel = require("../models/blog-model");
const productModel = require("../models/product-model");

router.get("/staff-dashboard", isLoggedIn, checkRole("staff"), async (req, res) => {
  try {
    // Get today's date at midnight to filter today's appointments
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch today's appointments
    const [todaysAppointments] = await Appointment.getTodaysAppointments(
      todayStart,
      todayEnd
    )

    // Fetch pending appointments
    const [rows] = await Appointment.countPendingAppointments();
    const pendingAppointmentsCount = rows[0].pendingCount;

    // Fetch new messages
    const newMessages = await Message.getLimitedContacts();
    const newMessagesCount = newMessages.length;

    // Fetch vaccine records (users who have been issued a vaccine)
    const [vaccineRecords] = await bookingModel.getAllBookings();

    // Fetch recent prescriptions
    const [recentPrescriptions] = await Prescription.getRecentPrescriptions();

    // Fetch top 3 pending blogs
    const pendingBlogs = (await blogModel.getPendingBlogs()).slice(0, 3);

    res.render("staff/staff-dashboard", {
      user: req.user,
      staff: req.user,
      todaysAppointments,
      pendingAppointmentsCount,
      newMessagesCount,
      newMessages,
      vaccineRecords,
      recentPrescriptions,
      pendingBlogs,
      lastLogin: req.user.lastLogin
        ? new Date(req.user.lastLogin).toLocaleString()
        : "First login",
      success: req.flash("success"),
      error: req.flash("error")
    });
  } catch (error) {
    console.error("Error loading staff dashboard:", error);
    req.flash("error", "Failed to load dashboard");
    res.redirect("/");
  }
});

router.get("/view-messages", checkRole(["staff"]), async (req, res) => {
  try {
    // Fetch all messages
    const messages = await Message.getAllContacts();

    // Render the view messages page
    res.render("staff/view-messages", { 
      user: req.user, 
      messages,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    req.flash('error', 'Error loading messages.');
    res.redirect('/staff/staff-dashboard');
  }
});

router.get("/appointments", checkRole(["staff"]), async (req, res) => {
  try {
    // Fetch appointments and populate user details
    let success = req.flash("success");
    const appointment = await Appointment.getAllAppointments();
    res.render("staff/staff-appointments", { user: req.user, appointment, success });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching appointments.");
  }
});

// Add New Vaccine
router.post("/add-vaccine", isLoggedIn, multer.single('image'), async (req, res) => {
  const { name, description, availableSlots, hospital } = req.body;
  try {
    let imagePath = null;
    if (req.file) {
      imagePath = 'uploads/' + req.file.filename;
    }
    await Vaccine.createVaccine({
      name,
      description,
      availableSlots,
      hospital,
      image: imagePath
    });
    res.redirect("/users/vaccines");
  } catch (err) {
    console.error("Error adding vaccine:", err);
    res.status(500).send("Something went wrong");
  }
});

router.get("/patient-record", checkRole(["staff"]), async (req, res) => {
  try {
    const success = req.flash("success");
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Number of records per page
    const offset = (page - 1) * limit;

    // Fetch total count of appointments
    const [totalCount] = await Appointment.countAllVerifiedAppointments();
    const totalPages = Math.ceil(totalCount[0].count / limit);

    // Fetch paginated appointments with user details
    const [appointments] = await Appointment.getPaginatedVerifiedAppointments(limit, offset);

    // Render the patient record page
    res.render("staff/patient-record", { 
      user: req.user, 
      appointments: appointments, 
      success,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error("Error fetching patient records:", error);
    req.flash("error", "Error loading patient records.");
    res.status(500).send("Error loading patient records.");
  }
});

router.get("/vaccine-records", checkRole(["staff"]), async (req, res) => {
  try {
    const success = req.flash("success");
    // Fetch all users
    const vaccineRecords = await bookingModel.getAllBookings();

    // Render the patient record page
    res.render("staff/vaccine-record", { user: req.user, vaccines: vaccineRecords, success });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).send("Error loading patient records.");
  }
});

// Staff: Delete an accepted, expired appointment
router.post("/delete-appointment/:id", checkRole(["staff"]), async (req, res) => {
  try {
    const appointmentId = req.params.id;
    const appointment = await Appointment.getAppointmentById(appointmentId);
    if (!appointment) {
      req.flash("error", "Appointment not found.");
      return res.redirect("/staff/appointments");
    }
    // Check if status is 'Accepted' and time is in the past
    const now = new Date();
    const appointmentDate = new Date(appointment.date + 'T' + (appointment.time.split(' ')[0] || '00:00'));
    if (appointment.status !== "Accepted" || appointmentDate > now) {
      req.flash("error", "You can only delete accepted and expired appointments.");
      return res.redirect("/staff/appointments");
    }
    await Appointment.deleteAppointment(appointmentId);
    req.flash("success", "Expired appointment deleted successfully.");
    res.redirect("/staff/appointments");
  } catch (error) {
    console.error("Error deleting appointment:", error);
    req.flash("error", "Error deleting appointment.");
    res.redirect("/staff/appointments");
  }
});

// Staff: Delete a vaccine booking
router.post('/delete-vaccine-booking/:id', checkRole(["staff"]), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const bookingModel = require('../models/booking-model');
    const vaccineModel = require('../models/vaccine-model');
    // Get the booking to find the vaccine_id
    const booking = await bookingModel.getBookingById(bookingId);
    if (!booking) {
      req.flash('error', 'Booking not found.');
      return res.redirect('/staff/vaccine-records');
    }
    // Delete the booking
    await bookingModel.deleteBooking(bookingId);
    // Increment available slots for the vaccine
    const vaccine = await vaccineModel.getVaccineById(booking.vaccine_id);
    if (vaccine) {
      vaccine.availableSlots += 1;
      await vaccineModel.updateVaccine(booking.vaccine_id, { availableSlots: vaccine.availableSlots });
    }
    req.flash('success', 'Vaccine booking deleted successfully.');
    res.redirect('/staff/vaccine-records');
  } catch (error) {
    console.error('Error deleting vaccine booking:', error);
    req.flash('error', 'Error deleting vaccine booking.');
    res.redirect('/staff/vaccine-records');
  }
});

// Add New Vaccine Page (GET)
router.get("/add-vaccine", isLoggedIn, checkRole(["staff"]), (req, res) => {
  res.render("staff/add-vaccine", { user: req.user });
});

// Staff: Delete a vaccine/program
router.post('/delete-vaccine/:id', isLoggedIn, checkRole(['staff']), async (req, res) => {
  try {
    const vaccineId = req.params.id;
    const Vaccine = require('../models/vaccine-model');
    // Optionally, delete the image file from disk if needed (not implemented here)
    await Vaccine.deleteVaccine(vaccineId);
    req.flash('success', 'Program deleted successfully.');
    res.redirect('/users/vaccines');
  } catch (error) {
    console.error('Error deleting program:', error);
    req.flash('error', 'Error deleting program.');
    res.redirect('/users/vaccines');
  }
});

// Staff: View all pending guest bookings
router.get('/guest-bookings', isLoggedIn, checkRole(['staff']), async (req, res) => {
  try {
    const connection = require('../models/db');
    const sql = `SELECT * FROM bookings WHERE user_id IS NULL AND status = 'Pending'`;
    connection.query(sql, (err, bookings) => {
      if (err) {
        console.error('Error fetching guest bookings:', err);
        return res.status(500).send('Error loading guest bookings.');
      }
      res.render('staff/guest-bookings', { user: req.user, bookings });
    });
  } catch (error) {
    console.error('Error loading guest bookings:', error);
    res.status(500).send('Error loading guest bookings.');
  }
});

// Approve guest booking
router.post('/guest-bookings/approve/:id', isLoggedIn, checkRole(['staff']), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const bookingModel = require('../models/booking-model');
    const vaccineModel = require('../models/vaccine-model');
    const { sendAppointmentStatusEmail } = require('../utils/emailService');
    // Get the booking
    const booking = await new Promise((resolve, reject) => {
      const connection = require('../models/db');
      connection.query('SELECT * FROM bookings WHERE id = ?', [bookingId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });
    if (!booking) {
      req.flash('error', 'Booking not found.');
      return res.redirect('/staff/guest-bookings');
    }
    // Get the vaccine
    const vaccine = await vaccineModel.getVaccineById(booking.vaccine_id);
    if (!vaccine || vaccine.availableSlots <= 0) {
      req.flash('error', 'No slots available for this program.');
      return res.redirect('/staff/guest-bookings');
    }
    // Generate ticket
    const ticketId = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    // Update booking
    await new Promise((resolve, reject) => {
      const connection = require('../models/db');
      connection.query('UPDATE bookings SET status = ?, ticketId = ? WHERE id = ?', ['Booked', ticketId, bookingId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
    // Decrement slots
    await vaccineModel.updateVaccine(booking.vaccine_id, { availableSlots: vaccine.availableSlots - 1 });
    // Send confirmation email
    sendAppointmentStatusEmail(
      booking.guest_email,
      'Booked',
      {
        ticketId,
        name: vaccine.name,
        hospital: vaccine.hospital,
        user_fullname: booking.guest_fullname
      },
      req.user.fullname
    );
    req.flash('success', 'Booking approved and guest notified.');
    res.redirect('/staff/guest-bookings');
  } catch (error) {
    console.error('Error approving guest booking:', error);
    req.flash('error', 'Error approving booking.');
    res.redirect('/staff/guest-bookings');
  }
});

// Reject guest booking
router.post('/guest-bookings/reject/:id', isLoggedIn, checkRole(['staff']), async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { sendAppointmentStatusEmail } = require('../utils/emailService');
    const vaccineModel = require('../models/vaccine-model');
    
    // Get the booking with vaccine details
    const booking = await new Promise((resolve, reject) => {
      const connection = require('../models/db');
      connection.query(`
        SELECT b.*, v.name as vaccine_name, v.hospital as vaccine_hospital 
        FROM bookings b 
        LEFT JOIN vaccines v ON b.vaccine_id = v.id 
        WHERE b.id = ?
      `, [bookingId], (err, results) => {
        if (err) return reject(err);
        resolve(results[0]);
      });
    });

    if (!booking) {
      req.flash('error', 'Booking not found.');
      return res.redirect('/staff/guest-bookings');
    }

    // Update booking
    await new Promise((resolve, reject) => {
      const connection = require('../models/db');
      connection.query('UPDATE bookings SET status = ? WHERE id = ?', ['Rejected', bookingId], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Send rejection email
    sendAppointmentStatusEmail(
      booking.guest_email,
      'Rejected',
      {
        user_fullname: booking.guest_fullname,
        name: booking.vaccine_name,
        hospital: booking.vaccine_hospital
      },
      req.user.fullname
    );

    req.flash('success', 'Booking rejected and guest notified.');
    res.redirect('/staff/guest-bookings');
  } catch (error) {
    console.error('Error rejecting guest booking:', error);
    req.flash('error', 'Error rejecting booking.');
    res.redirect('/staff/guest-bookings');
  }
});

// Staff: Edit Vaccine Page (GET)
router.get("/edit-vaccine/:id", isLoggedIn, checkRole(["staff"]), async (req, res) => {
  try {
    const vaccineId = req.params.id;
    const vaccine = await Vaccine.getVaccineById(vaccineId);
    
    if (!vaccine) {
      req.flash("error", "Program not found.");
      return res.redirect("/users/vaccines");
    }

    res.render("staff/edit-vaccine", { user: req.user, vaccine });
  } catch (error) {
    console.error("Error loading edit program page:", error);
    req.flash("error", "Error loading program details.");
    res.redirect("/users/vaccines");
  }
});

// Staff: Edit Vaccine (POST)
router.post("/edit-vaccine/:id", isLoggedIn, checkRole(["staff"]), multer.single('image'), async (req, res) => {
  try {
    const vaccineId = req.params.id;
    const { name, description, availableSlots, hospital } = req.body;
    
    // Get current vaccine details
    const currentVaccine = await Vaccine.getVaccineById(vaccineId);
    if (!currentVaccine) {
      req.flash("error", "Program not found.");
      return res.redirect("/users/vaccines");
    }

    // Prepare update data
    const updateData = {
      name,
      description,
      availableSlots: parseInt(availableSlots),
      hospital
    };

    // Handle image upload if a new image is provided
    if (req.file) {
      updateData.image = 'uploads/' + req.file.filename;
    }

    // Update the vaccine
    await Vaccine.updateVaccine(vaccineId, updateData);
    
    req.flash("success", "Program updated successfully.");
    res.redirect("/users/vaccines");
  } catch (error) {
    console.error("Error updating program:", error);
    req.flash("error", "Error updating program.");
    res.redirect("/users/vaccines");
  }
});

// Get all appointments for report generation
router.get("/get-all-appointments", checkRole(["staff"]), async (req, res) => {
  try {
    // Fetch all verified appointments without pagination
    const [appointments] = await Appointment.getAllVerifiedAppointments(1000, 0);
    
    // Check if we have appointments
    if (!appointments || appointments.length === 0) {
      return res.status(404).json({ error: "No appointments found" });
    }

    // Send the appointments array in the expected format
    res.json({ bookings: appointments });
  } catch (error) {
    console.error("Error fetching appointments for report:", error);
    res.status(500).json({ error: "Error fetching appointments" });
  }
});

// Get all vaccine programs and bookings for report generation
router.get("/get-all-vaccine-programs", checkRole(["staff"]), async (req, res) => {
  try {
    // Fetch all vaccines
    const [vaccines] = await Vaccine.getAllVaccines();
    
    // Fetch all bookings with user details
    const bookings = await bookingModel.getAllBookings(1000, 0);
    
    // Check if we have data
    if (!vaccines || vaccines.length === 0) {
      return res.status(404).json({ error: "No vaccine programs found" });
    }

    // Send both vaccines and bookings
    res.json({ vaccines, bookings });
  } catch (error) {
    console.error("Error fetching vaccine programs for report:", error);
    res.status(500).json({ error: "Error fetching vaccine programs" });
  }
});

// Get all medicines for staff view
router.get("/medicines", (req, res) => {
  res.redirect("/all-medicines");
});

module.exports = router;