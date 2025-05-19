const express = require("express");
const router = express.Router();
const isLoggedIn = require("../middlewares/isLoggedIn");
const productModel = require("../models/product-model");
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const blogModel = require("../models/blog-model");
const contactModel = require("../models/contact-model");
const bcrypt = require("bcrypt");
const {
  sendOTPEmail,
  generateOTP,
  verifyOTP,
} = require("../utils/emailService");
const checkRole = require("../middlewares/checkRole");

router.get("/register", (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  res.render("register", { error, success });
});

router.get("/login", (req, res) => {
  const success_msg = req.flash("success");
  const error_msg = req.flash("error");
  res.render("login", { 
    user: req.user,
    success_msg,
    error_msg
  });
});

//get medicine in home page
router.get("/", async (req, res) => {
  let success = req.flash("success");
  let error = req.flash("error");
  const [products] = await productModel.getAllProducts();
  res.render("index", { products, success, user: req.user, error });
});


router.post("/buynow", async (req, res) => {
  req.flash("error", "You Need to Login First!");
  res.redirect("/");
});
//service
router.get("/service", (req, res) => {
  let success = req.flash("success");
  let error = req.flash("error");
  res.render("service", { user: req.user });
});
//about
router.get("/about", (req, res) => {
  res.render("about", { user: req.user });
});

//contact us
router.get("/contact", (req, res) => {
  const user = req.user;
  let success = req.flash("success");
  res.render("contact", { user, success });
});
//for contact us message
router.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  contactModel.createContact({ name, email, message }, (err) => {
    if (err) {
      req.flash("error", "Failed to send message.");
      return res.redirect("/contact");
    }
    req.flash("success", "Message sent successfully!");
    res.redirect("/contact");
  });
});

//help
router.get("/help", (req, res) => {
  res.render("help");
});

//blog
router.get("/blog", async (req, res) => {
  try {
    const blogs = await blogModel.getAllBlogsWithAuthors();
    // Filter to only show approved blogs
    const approvedBlogs = blogs.filter(blog => blog.status === 'approved');
    const blogsWithAuthors = approvedBlogs.map(blog => ({
      ...blog,
      author: {
        fullname: blog.author_name,
        email: blog.author_email,
      },
    }));
    // Always define pendingBlogs
    let pendingBlogs = [];
    if (req.user && req.user.role === 'staff') {
      pendingBlogs = await blogModel.getPendingBlogs();
    }
    res.render("blog", {
      title: "Our Blog",
      blogs: blogsWithAuthors,
      user: req.user,
      pendingBlogs: pendingBlogs || []
    });
  } catch (err) {
    console.error("Error fetching blogs:", err);
    res.status(500).send("Server Error");
  }
});

//route to get forgot password page
router.get("/forgot-password", (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  
  // If user is logged in, redirect to change password
  if (req.user) {
    return res.redirect("/users/change-password");
  }
  
  res.render("forgot-password", { error, success });
});

// Route to post forgot password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email format
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailPattern.test(email)) {
      req.flash("error", "Please enter a valid email address.");
      return res.redirect("/forgot-password");
    }

    // Check if user exists
    const user = await userModel.getUserByEmail(email);
    if (!user) {
      req.flash("error", "No account found with this email address. Please check your email or register a new account.");
      return res.redirect("/forgot-password");
    }

    // Check if user is verified
    if (!user.isVerified) {
      req.flash("error", "Your account is not verified. Please verify your account first.");
      return res.redirect("/forgot-password");
    }

    // Check if user is already logged in
    if (req.user) {
      req.flash("error", "You are already logged in. Please use the change password option instead.");
      return res.redirect("/users/change-password");
    }

    // Generate OTP and set expiry time (5 minutes)
    const { otp, otpExpiry } = generateOTP();
    
    // Store in session
    req.session.user = {
      email: user.email,
      otp,
      otpExpiry,
      isPasswordReset: true
    };

    // Send OTP via email
    await sendOTPEmail(user.email, otp);
    
    req.flash("success", "OTP has been sent to your email address. Please check your inbox.");
    res.redirect("/otp-verification");
  } catch (err) {
    console.error("Error in forgot password route:", err);
    req.flash("error", "An error occurred. Please try again later.");
    res.redirect("/forgot-password");
  }
});

// Route to render OTP verification page
router.get("/otp-verification", (req, res) => {
  let error = req.flash("error");
  let success = req.flash("success");
  if (!req.session.user) {
    return res.redirect("/register"); // If session expires, redirect to register
  }
  res.render("otp-verification", { error, success }); // Render OTP input form
});

//resend otp
router.get("/resend-otp", async (req, res) => {
  if (!req.session.user) {
    req.flash("error", "Session expired. Please try again.");
    return res.redirect("/register");
  }

  // Generate new OTP
  const { otp, otpExpiry } = generateOTP();
  
  // Update session with new OTP, preserve all fields
  req.session.user = {
    ...req.session.user,
    otp: otp.toString(),
    otpExpiry
  };

  // Debug: log session user
  console.log("[RESEND OTP] Session user:", req.session.user);

  // Send new OTP
  await sendOTPEmail(req.session.user.email, otp);
  
  req.flash("success", "New OTP has been sent to your email!");
  res.redirect("/otp-verification");
});

// Route to handle OTP verification for register user
router.post("/verify-otp", async (req, res) => {
  try {
    const { otp } = req.body;

    // Check if session exists
    if (!req.session.user) {
      req.flash("error", "Session expired. Please try again.");
      return res.redirect("/forgot-password");
    }

    const {
      email,
      fullname,
      password,
      address,
      phone,
      age,
      sex,
      otp: sessionOtp,
      otpExpiry,
      isPasswordReset,
    } = req.session.user;

    // Debug: log session user
    console.log("[VERIFY OTP] Session user:", req.session.user);

    // Validate OTP format (alphanumeric)
    if (!otp || !/^[A-Za-z0-9]{6}$/.test(otp)) {
      req.flash("error", "Please enter a valid 6-character OTP (letters and numbers only).");
      return res.redirect("/otp-verification");
    }

    // Check if OTP has expired
    if (Date.now() > otpExpiry) {
      req.flash("error", "OTP has expired. Please request a new one.");
      return res.redirect("/otp-verification");
    }

    // Verify OTP (compare as strings)
    if (otp !== String(sessionOtp)) {
      req.flash("error", "Invalid OTP. Please try again.");
      return res.redirect("/otp-verification");
    }

    // Handle password reset flow
    if (isPasswordReset) {
      // Clear OTP from session but keep email for password reset
      req.session.user = {
        email,
        isPasswordReset: true
      };
      req.flash("success", "OTP verified successfully. Please set your new password.");
      return res.redirect("/reset-password");
    }

    // Handle registration flow
    try {
      // Check if user already exists
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        req.flash("error", "An account with this email already exists. Please login.");
        return res.redirect("/login");
      }

      // Create new user
      await new Promise((resolve, reject) => {
        userModel.createUser({
          fullname,
          email,
          password,
          address,
          age,
          phone,
          sex,
          isVerified: true,
        }, (err, result) => {
          if (err) return reject(err);
          resolve(result);
        });
      });

      req.flash("success", "Account created successfully! Please login.");
      return res.redirect("/login");
    } catch (err) {
      console.error("Error creating user:", err);
      req.flash("error", "Failed to create account. Please try again.");
      return res.redirect("/register");
    }
  } catch (err) {
    console.error("Error in OTP verification:", err);
    req.flash("error", "An error occurred. Please try again.");
    return res.redirect("/otp-verification");
  }
});

// Route to render reset password page
router.get("/reset-password", (req, res) => {
  let success = req.flash("success");
  let error = req.flash("error");
  res.render("reset-password", { success, error });
});

// Route to handle reset password form submission
router.post("/reset-password", async (req, res) => {
  try {
    const { newPassword, confirmNewPassword } = req.body;
    const email = req.session.user?.email;

    if (!email) {
      req.flash("error", "Session expired. Please try again.");
      return res.redirect("/forgot-password");
    }

    if (newPassword !== confirmNewPassword) {
      req.flash("error", "Passwords do not match.");
      return res.redirect("/reset-password");
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await userModel.updatePasswordByEmail(email, hashedPassword);
    
    req.flash("success", "Password reset successfully!");
    req.session.destroy();
    res.redirect("/login");
  } catch (err) {
    console.error("Error resetting password:", err);
    req.flash("error", "Failed to reset password. Please try again.");
    res.redirect("/reset-password");
  }
});

router.get("/all-medicines", async (req, res) => {
  let success = req.flash("success");
  let error = req.flash("error");
  const [products] = await productModel.getAllProducts();
  res.render("all-medicines", { products, user: req.user, success, error });
});

router.post('/mute/:userId', isLoggedIn, checkRole(['staff', 'doctor']), (req, res) => {
  // Implementation of the route
});

router.post('/unmute/:userId', isLoggedIn, checkRole(['staff', 'doctor']), (req, res) => {
  // Implementation of the route
});

module.exports = router;
