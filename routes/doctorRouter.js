const express = require("express");
const router = express.Router();
const appointmentModel = require("../models/appointment-model");
const checkRole = require("../middlewares/checkRole");
const userModel = require("../models/user-model");
const prescriptionModel = require("../models/prescription-model");

// Doctor Dashboard Route
router.get("/doctor-dashboard", async (req, res) => {
  try {
    // Fetch upcoming appointments with patient details
    const [appointments] = await appointmentModel.getUpcomingAppointments();

    // Fetch total number of patients
    const [rows] = await userModel.countPatientsWithAppointments();
    const totalPatients = rows[0].totalPatients;

    // Fetch appointments for today
    // Fetch appointments for today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of the day
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // End of the day
    const [rows2] = await appointmentModel.countAppointmentsToday();
    const appointmentsToday = rows2[0].totalAppointmentsToday;

    // Fetch last login time (example: use a field in the User model)
    const doctor = await userModel.getUserById(req.user.id);
    const lastLogin = doctor.lastLogin
      ? doctor.lastLogin.toLocaleString()
      : "N/A";

    // Render the dashboard with data
    res.render("doctor/doctor-dashboard", {
      user: req.user,
      appointments,
      totalPatients,
      appointmentsToday,
      lastLogin,
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Error loading dashboard.");
  }
});

// Route to view appointments
router.get("/doctor-appointments", checkRole(["admin"]), async (req, res) => {
  try {
    // Fetch appointments and populate user details
    let success = req.flash("success");
    const appointment = await appointmentModel.getAllAppointments();
    res.render("doctor/doctor-appointments", { user: req.user, appointment, success });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error fetching appointments.");
  }
});

router.post("/accept-appointment/:id", async (req, res) => {
  try {
    const appointment = await appointmentModel.getAppointmentById(req.params.id);
    if (!appointment) {
      return res.status(404).send("Appointment not found.");
    }

    await appointmentModel.updateAppointment(req.params.id, { status: "Accepted" });
    req.flash("success", "Appointment accepted successfully.");
    // Redirect back to the appointments page
    res.redirect("/doctor/doctor-appointments");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error accepting appointment.");
  }
});

router.post("/delete-appointment/:id", async (req, res) => {
  try {
    const appointment = await appointmentModel.deleteAppointment(req.params.id);
    if (!appointment) {
      return res.status(404).send("Appointment not found.");
    }

    // Redirect back to the appointments page
    req.flash("success", "Appointment deleted successfully.");
    res.redirect("/doctor/doctor-appointments");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error deleting appointment.");
  }
});

// Render Add Prescription Page
router.get("/add-prescription/", async (req, res) => {
  let success = req.flash("success");
  try {
    const userId = req.query.user_id;
    // Fetch all appointments
    const appointments = await appointmentModel.getAllVerifiedAppointments();

    if (!appointments) {
      return res.status(404).send("Appointment not found.");
    }

    // Render the add prescription page
    res.render("doctor/add-prescription", { user: req.user, appointments, success, userId });
  } catch (error) {
    console.error("Error fetching appointment details:", error);
    res.status(500).send("Error loading page.");
  }
});

// Handle Prescription Form Submission
router.post("/add-prescription", async (req, res) => {
  try {
    const { user, medication, dosage, instructions } = req.body;

    // Fetch the appointment rows
    const [appointment] = await appointmentModel.getAppointmentByUserId(user);
    const appointmentID = appointment.id;

    if (!appointment) {
      return res.status(404).send("Appointment not found.");
    }

    const doctor_id = req.user.id;

    // Create a new prescription
    await prescriptionModel.createPrescription({
      user_id: user,
      appointment_id: appointmentID,
      doctor_id,
      medication,
      dosage,
      instructions,
    });

    req.flash("success", "Prescription added successfully.");
    res.redirect("/doctor/add-prescription");
  } catch (error) {
    console.error("Error adding prescription:", error);
    res.status(500).send("Error adding prescription.");
  }
});


module.exports = router;
