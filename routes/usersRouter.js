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
    const { currentPassword, newPassword } = req.body;
    const email = req.user.email;

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

    req.flash('success', 'Password updated successfully!');
    res.redirect('/users/change-password');

  } catch (error) {
    console.error('Error changing password:', error);
    req.flash('error', 'Server error. Please try again.');
    res.redirect('/change-password');
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

    // Check if the user has already made 4 appointments
    if (await appointmentModel.checkAppointmentLimit(userId)) {
      req.flash("error", "You can only make 4 appointments.");
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
router.get("/user-dashboard", async (req, res) => {
  try {
    // Fetch the logged-in user's data
    const user = req.user; // Assuming req.user is populated by your authentication middleware

    // Fetch upcoming appointments for the user
    const appointments = await appointmentModel.getUpcomingAppointmentsByUserId(user.id || user._id);
    // Render the dashboard with data
    res.render("user-dashboard", {
      user,
      appointments,
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
    res.redirect("/");
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

    res.render("checkout", { success, items: cartItems, user: req.user });
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

// Checkout Page Route
router.get("/checkout", isLoggedIn, async (req, res) => {
  try {
    // Find all cart items for the logged-in user
    const cartItems = await cartModel
      .find({ userId: req.user._id })
      .populate("productId");

    if (!cartItems.length) {
      req.flash("error", "Your cart is empty!");
      return res.redirect("/users/cart");
    }

    // Map cart items to include required details
    const items = cartItems.map((cartItem) => {
      const discount = cartItem.productId.discount || 0;
      const price = cartItem.productId.price;
      const discountedPrice = price - (price * discount) / 100;
      return {
        _id: cartItem._id,
        name: cartItem.productId.name,
        discount,
        price,
        discountedPrice,
        quantity: cartItem.quantity,
      };
    });

    // Calculate subtotal
    const subtotal = items.reduce(
      (total, cartItem) => total + cartItem.discountedPrice * cartItem.quantity,
      0
    );

    // Example discount logic (replace with actual discount logic)
    const discountApplied = false; // Change based on actual discount criteria
    const totalPriceAfterDiscount = discountApplied ? subtotal * 0.9 : subtotal; // 10% discount if applied

    res.render("checkout", {
      items,
      subtotal,
      discountApplied,
      totalPriceAfterDiscount,
    });
  } catch (error) {
    console.error("Error fetching cart items:", error);
    req.flash("error", "Error fetching cart items.");
    res.redirect("/users/cart"); // Redirect back to the cart page in case of an error
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
    res.render("add-blog", {
      user: req.user,
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
    // Fetch all available vaccines
    const [vaccines] = await vaccineModel.getAvailableVaccines();

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

    // Fetch the vaccine details
    const vaccine = await vaccineModel.getVaccineById(vaccineId);

    if (!vaccine) {
      return res.status(404).send("Vaccine not found.");
    }

    // Render the book vaccine page
    res.render("book-vaccine", { user: req.user, vaccine });
  } catch (error) {
    console.error("Error fetching vaccine details:", error);
    res.status(500).send("Error loading page.");
  }
});


router.post("/book-vaccine/:vaccineId", async (req, res) => {
  try {
    const vaccineId = req.params.vaccineId;
    const userId = req.user.id; // Assuming req.user contains the logged-in user's details


    // Fetch the vaccine
    const vaccine = await vaccineModel.getVaccineById(vaccineId);

    if (!vaccine) {
      return res.status(404).send("Vaccine not found.");
    }

    // Check if slots are available
    if (vaccine.availableSlots <= 0) {
      return res.status(400).send("No slots available for this vaccine.");
    }

    // Check if the user already has a booking for this vaccine
    const existingBooking = await bookingModel.getBookingsByUserIdAndVaccineId(userId, vaccineId);

    if (existingBooking) {
      req.flash("error", "You already have a booking for this vaccine.");
      return res.redirect("/users/vaccines");
    }

    // Generate a unique ticket ID
    const ticketId = `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newBooking = await bookingModel.createBooking({
      user_id: userId,
      vaccine_id: vaccineId,
      ticketId,
    });

    const bookingId = await bookingModel.getBookingByTicketId(ticketId);

    // Decrease the available slots for the vaccine
    vaccine.availableSlots -= 1;
    await vaccineModel.updateVaccine(vaccineId, { availableSlots: vaccine.availableSlots });

    // Redirect to the ticket page
    res.redirect(`/users/vaccine-ticket/${bookingId.id}`);
  } catch (error) {
    console.error("Error booking vaccine:", error);
    res.status(500).send("Error booking vaccine.");
  }
});


router.get("/vaccine-ticket/:bookingId", async (req, res) => {
  try {
    const bookingId = req.params.bookingId;

    // Fetch the booking details and populate the vaccine and user details
    const booking = await bookingModel.getBookingById(bookingId);

    if (!booking) {
      return res.status(404).send("Booking not found.");
    }

    // Render the ticket page
    res.render("vaccine-ticket", { user: req.user, booking });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).send("Error loading ticket.");
  }
});

module.exports = router;
