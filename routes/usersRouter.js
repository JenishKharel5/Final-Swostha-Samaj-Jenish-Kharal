const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const blogModel = require("../models/blog-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const isLoggedIn = require("../middlewares/isLoggedIn");
const upload = require("../config/multer-config");
const {
  checkExistingAppointment,
  checkAppointmentLimit,
  convertTo12HourFormat,
} = require("../utils/appointmentHelpers");
const {
  registerUser,
  loginUser,
  logout,
} = require("../controllers/authController");
const prescriptionModel = require("../models/prescription-model");
const cartModel = require("../models/cart-model");
const vaccineModel = require("../models/vaccine-model");
const bookingModel = require("../models/booking-model");
const { sendAppointmentStatusEmail } = require("../utils/emailService");
const billingModel = require('../models/billing-model');

router.post("/register", registerUser);

//login
router.post("/login", loginUser);

router.get("/logout", logout);

// My appointments of user
router.get("/myappointments", isLoggedIn, async (req, res) => {
  let success = req.flash("success");
  try {
    if (!req.user) {
      return res.redirect("/register");
    }


    const appointments = await appointmentModel.getAppointmentByUserId(
      req.user.id
    );

    console.log(appointments);

    // Render the myappointments view with the user's appointments
    res.render("myappointments", { appointments, success });
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).send("Internal Server Error");
  }
});
//delete appointment
router.post("/myappointments/delete/:id", async (req, res) => {
  try {
    const appointmentId = req.params.id;
    await appointmentModel.deleteAppointment(appointmentId);
    req.flash("success", "Appointment deleted successfully!");
    res.redirect("/users/myappointments");
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).send("Internal Server Error");
  }
});

/* PROFILE PART */
//profile
router.get('/profile', isLoggedIn, async (req, res) => {
  try {

    const user = await userModel.getUserById(req.user.id);

    if (!user) {
      // User not found in DB
      return res.status(404).send('User not found');
    }

    let success = req.flash("success");
    let error = req.flash("error");

    // Pass user safely to template
    res.render('profile', { user, success, error });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send('Server error');
  }
});


//upload avatar
router.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user.id;
    const imagePath = req.file ? 'uploads/' + req.file.filename : null;
    await userModel.updateAvatar(userId, imagePath);
    res.redirect('/users/profile');
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).send('Server error');
  }
});

//edit-profile
router.get("/edit-profile", isLoggedIn, async (req, res) => {
  let user = await userModel.getUserByEmail(req.user.email);
  let success = req.flash("success");
  res.render("edit-profile", { user, success });
});

//post edit profile
router.post("/edit-profile", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    let user = await userModel.getUserByEmail(req.user.email);
    user.fullname = req.body.fullname;
    user.phone = req.body.phone;
    user.address = req.body.address;
    user.age = req.body.age;
    await userModel.updateUser(userId, user);
    req.flash("success", "Profile updated successfully!");
    res.redirect("/users/profile");
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).send("Server error");
  }
});

/* ---------------This is a change password part where
user can change the password------------------*/
//change-Password 
router.get("/change-password", isLoggedIn, async (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  res.render("change-password", { user: req.user, error, success });
});

//post change-password and replace it with previous one and also check if current password is correct
router.post('/change-password', isLoggedIn, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    const email = req.user.email;

    // Validate new password
    if (newPassword.length < 8) {
      req.flash('error', 'New password must be at least 8 characters long.');
      return res.redirect('/users/change-password');
    }

    // Check if new password contains at least one number and one letter
    const hasNumber = /\d/.test(newPassword);
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    if (!hasNumber || !hasLetter) {
      req.flash('error', 'New password must contain at least one number and one letter.');
      return res.redirect('/users/change-password');
    }

    // Check if passwords match
    if (newPassword !== confirmNewPassword) {
      req.flash('error', 'New passwords do not match.');
      return res.redirect('/users/change-password');
    }

    // Check if new password is same as current password
    if (currentPassword === newPassword) {
      req.flash('error', 'New password must be different from current password.');
      return res.redirect('/users/change-password');
    }

    // 1. Get user by email
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      req.flash('error', 'User not found.');
      return res.redirect('/users/change-password');
    }

    // 2. Compare old password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash('error', 'Incorrect current password.');
      return res.redirect('/users/change-password');
    }

    // 3. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 4. Update password in DB
    await userModel.updatePasswordByEmail(email, hashedPassword);

    // 5. Update last password change timestamp
    await userModel.updateLastPasswordChange(email);

    req.flash('success', 'Password updated successfully! Please login again with your new password.');
    
    // Logout user after password change
    req.logout((err) => {
      if (err) {
        console.error('Error logging out:', err);
      }
      res.redirect('/login');
    });

  } catch (error) {
    console.error('Error changing password:', error);
    req.flash('error', 'Server error. Please try again.');
    res.redirect('/users/change-password');
  }
});

/* ------------This is a appointment part------------------------- */
// Appointment Part
router.get("/appointment", isLoggedIn, (req, res) => {
  let success = req.flash("success");
  let error = req.flash("error");
  if (!req.user) {
    return res.redirect("/login");
  }
  res.render("appointment", { success, error, user: req.user });
});

// Post-appointment
router.post("/book-appointment", async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      req.flash("error", "User not found.");
      return res.redirect("/users/appointment");
    }

    const { date, time, service } = req.body;
    const formattedTime = convertTo12HourFormat(time);

    // Check if any appointment exists at the same date and time (for all users)
    const slotTaken = await appointmentModel.checkAnyAppointmentAtDateTime(date, formattedTime);
    if (slotTaken) {
      req.flash(
        "error",
        "This time slot is already booked. Please choose a different time."
      );
      return res.redirect("/users/appointment");
    }

    // Check if the user already has an appointment for the same service at the same time
    const existingAppointment = await appointmentModel.checkExistingAppointmentForSameServiceAtSameTime(
      userId,
      service,
      date,
      formattedTime
    )

    if (existingAppointment) {
      req.flash(
        "error",
        "You already have an appointment for this service at the same time."
      );
      return res.redirect("/users/appointment");
    }

    // Check if the user has already made 3 appointments
    if (await appointmentModel.checkAppointmentLimit(userId)) {
      req.flash("error", "You can only make 3 appointments.");
      return res.redirect("/users/appointment");
    }

    // Save the appointment to the database, associating the full user object
    await appointmentModel.createAppointment({
      date,
      time: formattedTime,
      service,
      user_id: userId,
    });

    // Redirect or render a success page
    req.flash("success", "Appointment booked successfully!");
    res.redirect("/users/appointment");
  } catch (error) {
    console.error(error);
    req.flash("error", "Error booking appointment.");
    res.redirect("/users/appointment");
  }
});

//user dashboard
router.get("/user-dashboard", isLoggedIn, async (req, res) => {
  try {
    // Fetch the logged-in user's data
    const user = req.user;
    // Fetch upcoming appointments for the user
    const appointments = await appointmentModel.getUpcomingAppointmentsByUserId(user.id || user._id);
    let success = req.flash("success");
    let error = req.flash("error");
    // Fetch billing records for the user
    const billings = await billingModel.getBillingsByUserId(user.id);
    // Render the dashboard with data
    res.render("user-dashboard", {
      user,
      appointments,
      billings, // Pass billings to the view
      success,
      error
    });
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    res.status(500).send("Error loading dashboard.");
  }
});

// Add product to cart or update quantity if it already exists
router.post("/addtocart/:productId", isLoggedIn, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id; // Get logged-in user's ID
    const quantityToAdd = parseInt(req.body.quantity) || 1;

    // Check if the product already exists in the user's cart
    let cartItem = await cartModel.getCartItemsByUserAndProduct(userId, productId);

    if (cartItem) {
      // If exists, update the quantity
      cartItem.quantity += quantityToAdd;
      await cartModel.updateCartQuantity(userId, productId, cartItem.quantity); // Update quantity();
    } else {
      // If not exists, create a new cart entry
      await cartModel.createCartItem(userId, productId, quantityToAdd);
    }

    req.flash("success", "Item added to cart successfully!");
    const redirectUrl = req.body.redirect || "/";
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Error adding to cart:", error);
    res.redirect("/users/cart");
  }
});

//this will show added cart items in page
router.get("/cart", isLoggedIn, async (req, res) => {
  try {
    const success = req.flash("success");
    const userId = req.user.id;

    let [cartItems] = await cartModel.getCartItemsByUser(userId);

    res.render("cart", { success, cartItems, user: req.user });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.redirect("/");
  }
});

router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    const success = req.flash("success");
    const userId = req.user.id;
    let [cartItems] = await cartModel.getCartItemsByUser(userId);

    // Calculate grand total
    let grandTotal = 0;
    if (cartItems && cartItems.length > 0) {
      grandTotal = cartItems.reduce((sum, item) => {
        return sum + (item.product_price - item.product_discount) * item.quantity;
      }, 0);
    }

    res.render("checkout", { success, items: cartItems, user: req.user, grandTotal });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    res.redirect("/");
  }
});

router.post("/cart/delete/:cartItemId", isLoggedIn, async (req, res) => {
  try {
    userId = req.user.id;
    cartItemId = req.params.cartItemId;
    await cartModel.removeCartItem(cartItemId, userId);
    req.flash("success", `Product removed from cart successfully!`);
    res.redirect("/users/cart");
  } catch (error) {
    console.error("Error deleting cart item:", error);
    req.flash("error", "Failed to remove item from cart. Please try again.");
    res.redirect("/users/cart");
  }
});

//update quantity whenever user click tick and set new quantity
router.post("/cart/updateQuantity/:itemId", async (req, res) => {
  try {
    const itemId = req.params.itemId;
    const { quantity } = req.body;

    await cartModel.updateCartQuantity(req.user.id, itemId, quantity);

    req.flash("success", "Quantity updated successfully.");
    res.redirect("/users/cart"); // Redirect back to cart after updating
  } catch (error) {
    console.error("Error updating quantity:", error);
    req.flash("error", "An error occurred while updating the quantity.");
    res.redirect("/users/cart");
  }
});

// Apply Discount Route
router.post("/apply-discount", (req, res) => {
  const { discountCode } = req.body;

  // Add your discount validation logic here
  if (discountCode === "DISCOUNT10") {
    // Apply a 10% discount
    res.redirect("/checkout?discount=10");
  } else {
    res.redirect("/checkout?error=Invalid discount code");
  }
});

// Render View Prescription Page
router.get("/view-prescription", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id; // Assuming req.user contains the logged-in user's details

    // Fetch the prescription details and ensure it belongs to the logged-in user
    const prescription = await prescriptionModel.getPrescriptionsOfUser(userId);

    console.log(prescription);

    if (!prescription || prescription.length === 0)  {
      
      return res.status(404).send("No prescriptions found for this user.");
      
    }

    // Render the view prescription page
    res.render("view-prescription", { prescription, user: req.user });
  } catch (error) {
    console.error("Error fetching prescription details:", error);
    res.status(500).send("Error loading page.");
  }
});

router.get("/blog/:blogId", async (req, res) => {
  try {
    const blogId = req.params.blogId;
    const blog = await blogModel.getBlogById(blogId);
    res.render("blog-view", { user: req.user, blog });
  } catch (error) {
    console.error("Error fetching blog details:", error);
    res.status(500).send("Error loading page.");
  }
});

// GET route for add blog form
router.get("/blog-add", isLoggedIn, async (req, res) => {
  try {
    let success = req.flash("success");
    let error = req.flash("error");
    res.render("add-blog", {
      user: req.user,
      success,
      error
    });
  } catch (error) {
    console.error("Error rendering add-blog page:", error);
  }
});

// POST route to handle blog form submission
router.post(
  "/blog/add",
  isLoggedIn,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, content } = req.body;
      const userId = req.user.id || req.user._id;
      const imagePath = req.file ? 'uploads/' + req.file.filename : null;

      await blogModel.createBlog({
        title,
        image: imagePath,
        content,
        author_id: userId,
      });

      res.redirect("/blog");
    } catch (error) {
      console.error("Error adding blog:", error);
      res.status(500).send("Server Error");
    }
  }
);



//vaccine part//......
// Render Vaccines Page
router.get("/vaccines", async (req, res) => {
  try {
    const error = req.flash("error");
    const success = req.flash("success");
    // Fetch all vaccines, not just available ones
    const [vaccines] = await vaccineModel.getAllVaccines();

    // Render the vaccines page
    res.render("vaccines", { user: req.user, vaccines, error, success });
  } catch (error) {
    console.error("Error fetching vaccines:", error);
    res.status(500).send("Error loading vaccines.");
  }
});

// Render Book Vaccine Page
router.get("/book-vaccine/:vaccineId", isLoggedIn, async (req, res) => {
  try {
    const vaccineId = req.params.vaccineId;
    let success = req.flash("success");
    let error = req.flash("error");
    // Fetch the vaccine details
    const vaccine = await vaccineModel.getVaccineById(vaccineId);

    if (!vaccine) {
      return res.status(404).send("Vaccine not found.");
    }

    // Render the book vaccine page
    res.render("book-vaccine", { user: req.user, vaccine, success, error });
  } catch (error) {
    console.error("Error fetching vaccine details:", error);
    res.status(500).send("Error loading page.");
  }
});


router.post("/book-vaccine/:vaccineId", async (req, res) => {
  try {
    const vaccineId = req.params.vaccineId;
    const userId = req.user.id;

    // Fetch the vaccine
    const vaccine = await vaccineModel.getVaccineById(vaccineId);

    if (!vaccine) {
      req.flash("error", "Vaccine not found.");
      return res.redirect(`/users/book-vaccine/${vaccineId}`);
    }

    // Check if slots are available
    if (vaccine.availableSlots <= 0) {
      req.flash("error", "No slots available for this program.");
      return res.redirect(`/users/book-vaccine/${vaccineId}`);
    }

    // Check if the user already has a booking for this vaccine
    const existingBooking = await bookingModel.getBookingsByUserIdAndVaccineId(userId, vaccineId);
    if (existingBooking && existingBooking.length > 0) {
      req.flash("error", "You already have a booking for this program.");
      return res.redirect(`/users/book-vaccine/${vaccineId}`);
    }

    // Generate a unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await bookingModel.createBooking({
      user_id: userId,
      vaccine_id: vaccineId,
      ticketId,
    });

    // Decrease the available slots for the vaccine
    vaccine.availableSlots -= 1;
    await vaccineModel.updateVaccine(vaccineId, { availableSlots: vaccine.availableSlots });

    // Get the booking ID for the ticket page
    const bookingId = await bookingModel.getBookingByTicketId(ticketId);

    // Send confirmation email
    const user = req.user;
    sendAppointmentStatusEmail(
      user.email,
      "Booked",
      { ...vaccine, ticketId, user_fullname: user.fullname },
      null
    );

    // Redirect to the ticket page with a success message
    req.flash("success", "Program booked successfully! Your ticket is below.");
    res.redirect(`/users/vaccine-ticket/${bookingId.id}`);
  } catch (error) {
    console.error("Error booking vaccine:", error);
    req.flash("error", "Error booking program. Please try again.");
    res.redirect(`/users/book-vaccine/${req.params.vaccineId}`);
  }
});


router.get("/vaccine-ticket/:bookingId", async (req, res) => {
  try {
    const bookingId = req.params.bookingId;
    let success = req.flash("success");
    let error = req.flash("error");
    // Fetch the booking details and populate the vaccine and user details
    const booking = await bookingModel.getBookingById(bookingId);

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    // Render the ticket page
    res.render("vaccine-ticket", { user: req.user, booking, success, error });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).send("Error loading ticket.");
  }
});

// Get all booked times for a given date (for calendar filtering)
router.get('/booked-times', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json([]);
    // Get all appointments for this date with status Pending or Accepted
    const sql = `SELECT time FROM appointments WHERE date = ? AND status IN ('Pending', 'Accepted')`;
    const connection = require('../models/db');
    connection.query(sql, [date], (err, results) => {
      if (err) return res.status(500).json([]);
      // Extract only the time part (in HH:mm format)
      const bookedTimes = results.map(row => {
        // If time is stored as 'HH:mm AM/PM', convert to 24h 'HH:mm'
        let t = row.time;
        if (/AM|PM/i.test(t)) {
          const [time, ampm] = t.split(' ');
          let [h, m] = time.split(':').map(Number);
          if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
          if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
          return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        }
        // If already in 24h format
        return t.slice(0,5);
      });
      res.json(bookedTimes);
    });
  } catch (err) {
    res.status(500).json([]);
  }
});

// Guest booking for vaccine/program (no login required)
router.post("/guest-book-vaccine/:vaccineId", async (req, res) => {
  try {
    const vaccineId = req.params.vaccineId;
    const { fullname, email, phone } = req.body;

    console.log('Guest booking attempt:', { vaccineId, fullname, email, phone });

    // Validate required fields
    if (!fullname || !email || !phone) {
      console.log('Missing required fields:', { fullname, email, phone });
      req.flash("error", "Please fill in all required fields.");
      return res.redirect("/users/vaccines");
    }

    // Fetch the vaccine
    const vaccine = await vaccineModel.getVaccineById(vaccineId);
    if (!vaccine) {
      console.log('Vaccine not found:', vaccineId);
      req.flash("error", "Program not found.");
      return res.redirect("/users/vaccines");
    }

    if (vaccine.availableSlots <= 0) {
      console.log('No slots available for vaccine:', vaccineId);
      req.flash("error", "No slots available for this program.");
      return res.redirect("/users/vaccines");
    }

    // Store guest booking as Pending
    const bookingObj = {
      user_id: null, // Explicitly set to null for guest bookings
      vaccine_id: vaccineId,
      bookingDate: new Date(),
      status: 'Pending',
      ticketId: null,
      guest_fullname: fullname,
      guest_email: email,
      guest_phone: phone
    };

    console.log('Creating guest booking:', bookingObj);

    // Create the booking
    const result = await bookingModel.createBooking(bookingObj);
    
    if (!result || !result.insertId) {
      console.error('Failed to create booking:', result);
      throw new Error('Failed to create booking');
    }

    console.log('Guest booking created successfully:', result);

    // Send confirmation email to guest
    try {
      await sendAppointmentStatusEmail(
        email,
        'Pending',
        {
          name: vaccine.name,
          hospital: vaccine.hospital,
          user_fullname: fullname
        },
        'Staff' // Use 'Staff' as the default staff name for pending emails
      );
      console.log('Confirmation email sent to guest:', email);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't throw error here, continue with success message
    }

    req.flash("success", "Your booking request has been submitted! Staff will review and you will receive an email once approved or rejected.");
    res.redirect("/users/vaccines");
  } catch (error) {
    console.error("Error submitting guest booking:", error);
    req.flash("error", "Error submitting booking request. Please try again.");
    res.redirect("/users/vaccines");
  }
});

router.get('/billing-history', isLoggedIn, async (req, res) => {
  try {
    const billings = await billingModel.getBillingsByUserId(req.user.id);
    res.render('billing', { user: req.user, billings });
  } catch (error) {
    req.flash('error', 'Could not fetch billing history.');
    res.redirect('/users/user-dashboard');
  }
});

router.get('/esewa-success', isLoggedIn, async (req, res) => {
  try {
    console.log('eSewa success route hit');
    const userId = req.user.id;
    let [cartItems] = await cartModel.getCartItemsByUser(userId);
    console.log('Cart items:', cartItems);

    const billNo = 'BILL-' + Date.now();

    for (const item of cartItems) {
      console.log('Inserting billing for item:', item);
      await billingModel.createBilling({
        user_id: userId,
        product_id: item.product_id,
        bill_no: billNo,
        quantity: item.quantity,
        unit_price: item.product_price,
        total_price: (item.product_price - item.product_discount) * item.quantity,
        discount: item.product_discount,
        status: 'Paid'
      });
    }

    await cartModel.clearCart(userId);

    req.flash('success', 'Payment successful! Your billing record has been updated.');
    res.redirect('/users/billing-history');
  } catch (error) {
    console.error('Error saving billing record:', error);
    req.flash('error', 'Payment succeeded, but failed to update billing record.');
    res.redirect('/users/user-dashboard');
  }
});

module.exports = router;
