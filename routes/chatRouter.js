const express = require("express");
const router = express.Router();
const Message = require("../models/message-model");
const userModel = require("../models/user-model");
const appointmentModel = require("../models/appointment-model");
const isLoggedIn = require("../middlewares/isLoggedIn");
const checkRole = require("../middlewares/checkRole");

// Middleware to check if user has an accepted appointment (only for regular users)
const checkChatAccess = async (req, res, next) => {
  try {
    const user = req.user;

    // Skip check for staff, doctors, and admins
    if (["admin", "staff", "doctor"].includes(user.role)) {
      return next();
    }

    // For regular users, check if they have an accepted appointment
    const appointments = await appointmentModel.getAppointmentByUserId(user.id);
    const hasAcceptedAppointment = appointments.some(
      (appointment) => appointment.status === "Accepted"
    );

    if (!hasAcceptedAppointment) {
      req.flash("error", "You need an accepted appointment to access the chat.");
      return res.redirect("/users/user-dashboard");
    }

    next();
  } catch (error) {
    console.error("Error checking chat access:", error);
    res.status(500).send("Server error");
  }
};

// Middleware to check if user can chat with a doctor (must have accepted appointment)
const checkDoctorChatAccess = async (req, res, next) => {
  try {
    const user = req.user;
    const doctorId = parseInt(req.params.adminId);
    const doctor = await userModel.getUserById(doctorId);
    if (!doctor || doctor.role !== 'doctor') return next(); // Only restrict for doctors
    // For users, check if they have an accepted appointment with this doctor
    const appointments = await appointmentModel.getAppointmentByUserId(user.id);
    const hasAccepted = appointments.some(a => a.status === 'Accepted' && a.doctor_id === doctorId);
    if (!hasAccepted) {
      req.flash('error', 'You can only chat with doctors who have accepted your appointment.');
      return res.redirect('/users/user-dashboard');
    }
    next();
  } catch (err) {
    console.error('Error in doctor chat access:', err);
    req.flash('error', 'Server error.');
    res.redirect('/users/user-dashboard');
  }
};

// Render Chat Page
router.get("/:adminId", isLoggedIn, async (req, res, next) => {
  const adminId = parseInt(req.params.adminId);
  const admin = await userModel.getUserById(adminId);
  if (admin && admin.role === 'doctor' && req.user.role === 'user') {
    return checkDoctorChatAccess(req, res, next);
  }
  next();
}, async (req, res) => {
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
    if (["admin", "staff", "doctor"].includes(req.user.role)) {
      if (admin.role !== "user") {
        req.flash("error", "You can only message users.");
        return res.redirect("/chat");
      }
    } else if (req.user.role === "user") {
      if (!["admin", "staff", "doctor"].includes(admin.role)) {
        req.flash("error", "You can only message staff or doctors.");
        return res.redirect("/chat");
      }
    }

    Message.getMessagesByRoom(room, async (err, messages) => {
      if (err) {
        console.error("Error fetching messages:", err);
        req.flash("error", "Error loading chat.");
        return res.redirect("/chat");
      }

      // Check mute state for both staff and user
      let isMuted = false;
      const MessageModel = require("../models/message-model");
      isMuted = await new Promise(resolve => {
        MessageModel.isChatMuted(userId, adminId, (err, muted) => {
          resolve(muted);
        });
      });

      // Fetch sidebar data
      if (["admin", "staff", "doctor"].includes(req.user.role)) {
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
            isMuted
          });
        });
      } else {
        userModel.getUsersByRole(["admin", "staff", "doctor"], (err, admins) => {
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
            isMuted
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
router.get("/", isLoggedIn, async (req, res) => {
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
    // Fetch all staff
    const staffPromise = new Promise((resolve, reject) => {
      userModel.getUsersByRole(["staff"], (err, staff) => {
        if (err) return reject(err);
        resolve(staff);
      });
    });
    // Fetch assigned doctors (with accepted appointment)
    const assignedDoctorsPromise = appointmentModel.getAppointmentByUserId(req.user.id)
      .then(appointments => {
        // Get doctor IDs with accepted appointments
        const doctorIds = appointments
          .filter(a => a.status === 'Accepted' && a.doctor_id)
          .map(a => a.doctor_id);
        // Remove duplicates
        const uniqueDoctorIds = [...new Set(doctorIds)];
        if (uniqueDoctorIds.length === 0) return [];
        // Fetch doctor details
        return new Promise((resolve, reject) => {
          if (uniqueDoctorIds.length === 0) return resolve([]);
          const placeholders = uniqueDoctorIds.map(() => '?').join(',');
          const sql = `SELECT * FROM users WHERE id IN (${placeholders}) AND role = 'doctor'`;
          const db = require('../models/db');
          db.query(sql, uniqueDoctorIds, (err, doctors) => {
            if (err) return reject(err);
            resolve(doctors);
          });
        });
      });
    // Fetch recent chats
    const recentChatsPromise = new Promise((resolve, reject) => {
      Message.getRecentChats(req.user.id, req.user.role, (err, chats) => {
        if (err) return reject(err);
        resolve(chats);
      });
    });
    try {
      const [staff, assignedDoctors, chats] = await Promise.all([
        staffPromise,
        assignedDoctorsPromise,
        recentChatsPromise
      ]);
      if (chats && chats.length > 0) {
      res.render("select-admin", {
        user: req.user,
          chats,
          admins: [],
          staff,
          assignedDoctors,
        success: req.flash("success"),
        error: req.flash("error"),
      });
      } else {
        // Show staff and assigned doctors if no recent chats
        res.render("select-admin", {
          user: req.user,
          chats: [],
          admins: [],
          staff,
          assignedDoctors,
          success: req.flash("success"),
          error: req.flash("error"),
        });
      }
    } catch (err) {
      console.error("Error fetching chat selection data for user:", err);
      req.flash("error", "Error loading chat selection.");
      return res.redirect("/users/user-dashboard");
    }
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

// Delete a conversation (all messages in a room)
router.post("/delete/:otherUserId", isLoggedIn, async (req, res) => {
  if (!['doctor', 'staff'].includes(req.user.role)) {
    req.flash("error", "You do not have permission to delete conversations.");
    return res.redirect("/chat");
  }
  try {
    const userId = req.user.id;
    const otherUserId = parseInt(req.params.otherUserId);
    if (isNaN(otherUserId)) {
      req.flash("error", "Invalid user ID.");
      return res.redirect("/chat");
    }
    const room = [userId, otherUserId].sort().join("_");
    Message.deleteConversation(room, (err) => {
      if (err) {
        req.flash("error", "Failed to delete conversation.");
      } else {
        req.flash("success", "Conversation deleted successfully.");
      }
      res.redirect("/chat");
    });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    req.flash("error", "Error deleting conversation.");
    res.redirect("/chat");
  }
});

// Delete a single message (doctor/staff only, must be sender)
router.post("/delete-message/:messageId", isLoggedIn, async (req, res) => {
  try {
    const user = req.user;
    const messageId = parseInt(req.params.messageId);
    if (!['admin', 'staff'].includes(user.role)) {
      req.flash("error", "You do not have permission to delete messages.");
      return res.redirect("/chat");
    }
    // Find the message to get the room and sender
    Message.getMessagesByRoom = Message.getMessagesByRoom || require("../models/message-model").getMessagesByRoom;
    // Find the message (inefficient, but works for now)
    // Ideally, add a getMessageById method
    const db = require("../models/db");
    db.query('SELECT * FROM messages WHERE id = ?', [messageId], (err, results) => {
      if (err || results.length === 0) {
        req.flash("error", "Message not found.");
        return res.redirect("/chat");
      }
      const msg = results[0];
      if (msg.sender_id !== user.id) {
        req.flash("error", "You can only delete your own messages.");
        return res.redirect(`/chat/${msg.receiver_id === user.id ? msg.sender_id : msg.receiver_id}`);
      }
      Message.deleteMessageById(messageId, user.id, (err2) => {
        if (err2) {
          req.flash("error", "Failed to delete message.");
        } else {
          req.flash("success", "Message deleted successfully.");
        }
        res.redirect(`/chat/${msg.receiver_id === user.id ? msg.sender_id : msg.receiver_id}`);
      });
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    req.flash("error", "Error deleting message.");
    res.redirect("/chat");
  }
});

// Mute a chat (staff/doctor only)
router.post('/mute/:userId', isLoggedIn, checkRole(['staff', 'doctor']), (req, res) => {
  const staffId = req.user.id;
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    req.flash('error', 'Invalid user ID.');
    return res.redirect('/chat');
  }
  Message.muteChat(staffId, userId, (err) => {
    if (err) {
      console.error('Error muting chat:', err);
      req.flash('error', 'Failed to mute chat.');
    } else {
      req.flash('success', 'Chat muted successfully.');
    }
    res.redirect(`/chat/${userId}`);
  });
});

// Unmute a chat (staff/doctor only)
router.post('/unmute/:userId', isLoggedIn, checkRole(['staff', 'doctor']), (req, res) => {
  const staffId = req.user.id;
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) {
    req.flash('error', 'Invalid user ID.');
    return res.redirect('/chat');
  }
  Message.unmuteChat(staffId, userId, (err) => {
    if (err) {
      console.error('Error unmuting chat:', err);
      req.flash('error', 'Failed to unmute chat.');
    } else {
      req.flash('success', 'Chat unmuted successfully.');
    }
    res.redirect(`/chat/${userId}`);
  });
});

module.exports = router;