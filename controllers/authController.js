const express = require("express");
const router = express.Router();
const userModel = require("../models/user-model");
const productModel = require("../models/product-model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const cookie = require("cookie-parser");
const { generateToken } = require("../utils/generateToken");
const { sendOTPEmail, generateOTP } = require("../utils/emailService");
const otpGenerator = require("otp-generator");
const nodemailer = require("nodemailer");
const isLoggedIn = require("../middlewares/isLoggedIn");

module.exports.registerUser = async (req, res) => {
  try {
    let { email, fullname, password, address, phone, age, sex } = req.body;

    // Check if user already exists
    let user = await userModel.getUserByEmail(email);
    if (user) {
      req.flash("error", "You already have an account, please login.");
      return res.redirect("/register");
    }

    // Generate hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP and set expiry time
    const { otp, otpExpiry } = generateOTP();
    //  Corrected: Store in session
    if (!req.session) {
      return res.status(500).send("Session is not initialized.");
    }

    req.session.user = {
      email,
      fullname,
      password: hashedPassword,
      address,
      phone,
      age,
      sex,
      otp,
      otpExpiry,
    };
    console.log("User stored in session");

    // Send OTP via Email
    sendOTPEmail(email, otp);

    return res.redirect("/otp-verification");
  } catch (err) {
    console.error("Error registering user:", err);
    res.status(500).send("Internal Server Error");
  }
};

module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findOneByEmailAndVerified(email);

    if (!user) {
      req.flash("error", "Email or password is incorrect!");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error", "Email or password is incorrect!");
      return res.redirect("/login");
    }

    await userModel.updateLastLogin(user.id);

    const token = generateToken(user);
    console.log("authController - Generated token:", token);
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24,
      sameSite: "lax",
      secure: false,
    });
    console.log("authController - Cookie set with token");

    req.flash("success", "User logged in successfully");

    if (user.role === "admin") {
      return res.redirect("/doctor/doctor-dashboard");
    } else if (user.role === "staff") {
      return res.redirect("/owners/admin");
    } else {
      return res.redirect("/");
    }
  } catch (err) {
    console.error("authController - Error during login:", err);
    req.flash("error", "An error occurred during login. Please try again.");
    return res.redirect("/login");
  }
};

module.exports.logout = async (req, res) => {
  try {
    req.flash("success", "User logged out successfully");
    res.clearCookie("token");
    req.session.destroy((err) => {
      if (err) {
        console.error("Error destroying session:", err);
        req.flash("error", "Error during logout");
      }
      res.redirect("/login");
    });
  } catch (err) {
    req.flash("error", "Error during logout");
    res.redirect("/login");
  }
};
const checkChatAccess = async (req, res, next) => {
  const user = req.user;
  // Skip check for staff, doctors, and admins
  if (["admin", "staff", "doctor"].includes(user.role)) {
    return next();
  }
  // For regular users, check if they have an accepted appointment
  // ...
  console.log('checkChatAccess:', req.user && req.user.role);
};

// Only apply checkChatAccess for user chat access
router.get("/chat", isLoggedIn, checkChatAccess, (req, res) => {
});

