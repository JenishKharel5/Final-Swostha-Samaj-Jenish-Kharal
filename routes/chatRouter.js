const express = require("express");
const router = express.Router();
const Message = require("../models/message-model");
const userModel = require("../models/user-model");
const isLoggedIn = require("../middlewares/isLoggedIn");



// Render Chat Page
router.get("/:adminId", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const adminId = parseInt(req.params.adminId);
    if (isNaN(adminId)) {
      req.flash("error", "Invalid admin ID.");
      return res.redirect("/chat");
    }

    const room = [userId, adminId].sort().join("_");
    const admin = await userModel.getUserById(adminId);

    if (!admin) {
      req.flash("error", "Invalid admin.");
      return res.redirect("/chat");
    }

    // Role-based restrictions
    if (["admin", "staff"].includes(req.user.role)) {
      if (admin.role !== "user") {
        req.flash("error", "You can only message users.");
        return res.redirect("/chat");
      }
    } else if (req.user.role === "user") {
      if (!["admin", "staff"].includes(admin.role)) {
        req.flash("error", "You can only message admins.");
        return res.redirect("/chat");
      }
    }

    Message.getMessagesByRoom(room, (err, messages) => {
      if (err) {
        console.error("Error fetching messages:", err);
        req.flash("error", "Error loading chat.");
        return res.redirect("/chat");
      }

      // Fetch sidebar data
      if (["admin", "staff"].includes(req.user.role)) {
        Message.getRecentChats(userId, req.user.role, (err, chats) => {
          if (err) {
            console.error("Error fetching chats:", err);
            req.flash("error", "Error loading chats.");
            return res.redirect("/chat");
          }
          res.render("chat", {
            user: req.user,
            admin,
            messages,
            room,
            admins: [],
            chats,
            success: req.flash("success"),
            error: req.flash("error"),
          });
        });
      } else {
        userModel.getUsersByRole(["admin", "staff"], (err, admins) => {
          if (err) {
            console.error("Error fetching admins:", err);
            req.flash("error", "Error loading admins.");
            return res.redirect("/chat");
          }
          res.render("chat", {
            user: req.user,
            admin,
            messages,
            room,
            admins,
            chats: [],
            success: req.flash("success"),
            error: req.flash("error"),
          });
        });
      }
    });
  } catch (error) {
    console.error("Error in /chat/:adminId:", error);
    req.flash("error", "Error loading chat.");
    res.redirect("/chat");
  }
});

// Select Admin to Chat With (Users) or Recent Chats (Admins)
router.get("/", isLoggedIn, (req, res) => {
  if (["admin", "staff"].includes(req.user.role)) {
    Message.getRecentChats(req.user.id, req.user.role, (err, chats) => {
      if (err) {
        console.error("Error fetching chats:", err);
        req.flash("error", "Error loading chats.");
        return res.redirect("/staff/staff-dashboard");
      }
      // If there are no recent chats, fetch the list of users
      if (chats.length === 0) {
        userModel.getUsersByRole(["user"], (err, users) => {
          if (err) {
            console.error("Error fetching users:", err);
            req.flash("error", "Error loading users.");
            return res.redirect("/staff/staff-dashboard");
          }
          res.render("select-user", {
            user: req.user,
            chats,
            users,
            success: req.flash("success"),
            error: req.flash("error"),
          });
        });
      } else {
        res.render("select-user", {
          user: req.user,
          chats,
          success: req.flash("success"),
          error: req.flash("error"),
        });
      }
    });
  } else if (req.user.role === "user") {
    userModel.getUsersByRole(["admin", "staff"], (err, admins) => {
      if (err) {
        console.error("Error fetching admins:", err);
        req.flash("error", "Error loading admins.");
        return res.redirect("/users/user-dashboard");
      }
      res.render("select-admin", {
        user: req.user,
        admins,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    });
  } else {
    req.flash("error", "Unauthorized.");
    res.redirect("/");
  }
});

// Staff/Admins: List Users to Chat With (if no prior chats)
router.get("/users", isLoggedIn, (req, res) => {
  if (!["admin", "staff"].includes(req.user.role)) {
    req.flash("error", "Unauthorized.");
    return res.redirect("/");
  }
  userModel.getUsersByRole(["user"], (err, users) => {
    if (err) {
      console.error("Error fetching users:", err);
      req.flash("error", "Error loading users.");
      return res.redirect("/staff/staff-dashboard");
    }
    res.render("select-user", {
      user: req.user,
      users,
      chats: [],
      success: req.flash("success"),
      error: req.flash("error"),
    });
  });
});

const checkChatAccess = async (req, res, next) => {
  try {
    const user = req.user;

    // Check if user is an admin
    if (user.role === "admin") {
      return next(); // Admins can access the chat
    }

    // For non-admins, check if they have an accepted appointment
    const appointments = await appointmentModel.getAppointmentByUserId(user.id);
    const hasAcceptedAppointment = appointments.some(
      (appointment) => appointment.status === "Accepted"
    );

    if (!hasAcceptedAppointment) {
      req.flash("error", "You need an accepted appointment to access the chat.");
      return res.redirect("/users/user-dashboard");
    }

    next(); // User has an accepted appointment, allow access
  } catch (error) {
    console.error("Error checking chat access:", error);
    res.status(500).send("Server error");
  }
};

// Select Admin to Chat With (Users) or Recent Chats (Admins)
router.get("/", isLoggedIn, checkChatAccess, (req, res) => {
  if (["admin", "staff"].includes(req.user.role)) {
    Message.getRecentChats(req.user.id, req.user.role, (err, chats) => {
      if (err) {
        console.error("Error fetching chats:", err);
        req.flash("error", "Error loading chats.");
        return res.redirect("/staff/staff-dashboard");
      }
      // If there are no recent chats, fetch the list of users
      if (chats.length === 0) {
        userModel.getUsersByRole(["user"], (err, users) => {
          if (err) {
            console.error("Error fetching users:", err);
            req.flash("error", "Error loading users.");
            return res.redirect("/staff/staff-dashboard");
          }
          res.render("select-user", {
            user: req.user,
            chats,
            users,
            success: req.flash("success"),
            error: req.flash("error"),
          });
        });
      } else {
        res.render("select-user", {
          user: req.user,
          chats,
          success: req.flash("success"),
          error: req.flash("error"),
        });
      }
    });
  } else if (req.user.role === "user") {
    userModel.getUsersByRole(["admin", "staff"], (err, admins) => {
      if (err) {
        console.error("Error fetching admins:", err);
        req.flash("error", "Error loading admins.");
        return res.redirect("/users/user-dashboard");
      }
      res.render("select-admin", {
        user: req.user,
        admins,
        success: req.flash("success"),
        error: req.flash("error"),
      });
    });
  } else {
    req.flash("error", "Unauthorized.");
    res.redirect("/");
  }
});
module.exports = router;