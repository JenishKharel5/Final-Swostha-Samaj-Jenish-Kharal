const express = require("express");
const app = express();
const path = require("path");
const session = require("express-session");
const flash = require("connect-flash");
const authMiddleware = require("./middlewares/isLoggedIn");
const db = require("./models/db");
require("dotenv").config();
const multer = require("multer");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");
const cookie = require("cookie");
const userModel = require("./models/user-model");
const appointmentModel = require("./models/appointment-model");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Basic middleware setup
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "Uploads")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.set("view engine", "ejs");

// Session and flash setup
app.use(
  session({
    secret: process.env.EXPRESS_SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use(flash());

// Authentication middleware
app.use(async (req, res, next) => {
  try {
    // Check for token in cookies
    const token = req.cookies.token;

    if (token) {
      try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        
        // Get user from database
        const user = await userModel.getUserByEmail(decoded.email);
        
        if (user) {
          // Set user in session and request
          req.session.user = user;
          req.user = user;
          
          // Set user data in res.locals
          res.locals.loggedin = true;
          res.locals.fullname = user.fullname;
          res.locals.avatar = user.avatar || null;
          res.locals.role = user.role;
          res.locals.user = user;
        } else {
          // Clear invalid token
          res.clearCookie('token');
          clearUserData(req, res);
        }
      } catch (err) {
        console.error('Token verification failed:', err);
        res.clearCookie('token');
        clearUserData(req, res);
      }
    } else if (req.session && req.session.user) {
      // Use session data if available
      const user = req.session.user;
      req.user = user;
      
      // Set user data in res.locals
      res.locals.loggedin = true;
      res.locals.fullname = user.fullname;
      res.locals.avatar = user.avatar || null;
      res.locals.role = user.role;
      res.locals.user = user;
    } else {
      clearUserData(req, res);
    }
    next();
  } catch (error) {
    console.error('Error in auth middleware:', error);
    clearUserData(req, res);
    next();
  }
});

// Helper function to clear user data
function clearUserData(req, res) {
  req.user = null;
  res.locals.loggedin = false;
  res.locals.fullname = '';
  res.locals.avatar = null;
  res.locals.role = '';
  res.locals.user = null;
}

// User data middleware
app.use(async (req, res, next) => {
  if (res.locals.loggedin && res.locals.user) {
    try {
      const appointments = await appointmentModel.getAppointmentByUserId(res.locals.user.id);
      res.locals.hasAcceptedAppointment = appointments.some(
        (appointment) => appointment.status === "Accepted"
      );
    } catch (error) {
      console.error("app.js - Error fetching appointments:", error);
      res.locals.hasAcceptedAppointment = false;
    }
  } else {
    res.locals.hasAcceptedAppointment = false;
  }
  next();
});

// Make flash messages available to all views
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success');
  res.locals.error_msg = req.flash('error');
  next();
});

// Share session with Socket.IO
const wrap = (middleware) => (socket, next) =>
  middleware(socket.request, {}, next);

io.use(
  wrap(
    session({
      secret: process.env.EXPRESS_SESSION_SECRET,
      resave: false,
      saveUninitialized: true,
    })
  )
);

io.use(async (socket, next) => {
  console.log("Socket.IO: Processing authentication");
  const cookies = socket.request.headers.cookie
    ? cookie.parse(socket.request.headers.cookie)
    : {};
  const token = cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const user = await userModel.getUserByEmail(decoded.email);
      if (user) {
        socket.request.user = user;
        console.log(`Socket.IO: Authenticated user ${user.id} (${user.role})`);
        return next();
      }
    } catch (err) {
      console.error("Socket.IO: JWT Verification Error:", err);
    }
  }

  console.log("Socket.IO: No valid user, rejecting connection");
  next(new Error("Please log in to access chat."));
});

io.on("connection", (socket) => {
  const user = socket.request.user;

  socket.on("joinRoom", async ({ userId, adminId }) => {
    if (user.id !== parseInt(userId)) {
      console.log(
        `Unauthorized room access by user ${user.id} for room with ${userId} and ${adminId}`
      );
      socket.emit("error", "Unauthorized room access.");
      return;
    }

    if (user.role !== "admin") {
      const appointments = await appointmentModel.getAppointmentByUserId(user.id);
      const hasAcceptedAppointment = appointments.some(
        (appointment) => appointment.status === "Accepted"
      );
      if (!hasAcceptedAppointment) {
        socket.emit("error", "You need an accepted appointment to access the chat.");
        return;
      }
    }

    const room = [userId, adminId].sort().join("_");
    socket.join(room);
    console.log(`User ${userId} joined room ${room}`);
  });

  socket.on("sendMessage", ({ userId, adminId, content }, callback) => {
    console.log(`Received sendMessage event:`, { userId, adminId, content });
    if (user.id !== parseInt(userId)) {
      console.log(`Unauthorized message send by user ${user.id}`);
      if (callback) callback({ error: "Unauthorized message send." });
      return;
    }
    const room = [userId, adminId].sort().join("_");
    require("./models/message-model").createMessage(
      { sender_id: userId, receiver_id: adminId, room, content },
      (err, messageId) => {
        if (err) {
          console.error("Error saving message to database:", err);
          if (callback) callback({ error: "Failed to save message." });
          return;
        }
        console.log(`Message saved with ID: ${messageId}`);
        require("./models/message-model").getMessagesByRoom(room, (err, messages) => {
          if (err) {
            console.error("Error fetching messages:", err);
            if (callback) callback({ error: "Failed to fetch messages." });
            return;
          }
          const savedMessage = messages.find((msg) => msg.id === messageId);
          if (!savedMessage) {
            console.error("Saved message not found in room:", room);
            if (callback) callback({ error: "Message not found after saving." });
            return;
          }
          console.log(`Broadcasting message to room ${room}:`, savedMessage);
          io.to(room).emit("receiveMessage", {
            sender_id: userId,
            sender_name: savedMessage.sender_name,
            content,
            created_at: savedMessage.created_at,
          });
          if (callback) callback({ success: true });
        });
      }
    );
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${user.id}`);
  });
});

const ownersRouter = require("./routes/ownersRouter");
const usersRouter = require("./routes/usersRouter");
const ProductsRouter = require("./routes/productsRouter");
const staffRouter = require("./routes/staffRouter");
const indexRouter = require("./routes/index");
const doctorRouter = require("./routes/doctorRouter");
const chatRouter = require("./routes/chatRouter");
const messageRouter = require("./routes/messageRouter");
const staffBlogRouter = require("./routes/staffBlogRouter");

app.use("/", indexRouter);
app.use("/owners", ownersRouter);
app.use("/users", usersRouter);
app.use("/products", ProductsRouter);
app.use("/doctor", doctorRouter);
app.use("/staff", staffRouter);
app.use("/chat", chatRouter);
app.use("/message", messageRouter);
app.use("/staff", staffBlogRouter);

// Debug middleware for res.locals - moved to the end
app.use((req, res, next) => {
  console.log("app.js - res.locals before rendering:", {
    loggedin: res.locals.loggedin,
    fullname: res.locals.fullname,
    avatar: res.locals.avatar,
    role: res.locals.role,
  });
  next();
});

server.listen(3000, () => {
  console.log("Server running on port 3000");
});