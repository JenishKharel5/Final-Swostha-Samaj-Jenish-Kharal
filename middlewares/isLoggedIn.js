const jwt = require("jsonwebtoken");
const userModel = require("../models/user-model");

module.exports = async (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const user = await userModel.getUserByEmail(decoded.email);

      if (user) {
        req.user = user; 
        res.locals.loggedin = true;
        res.locals.fullname = user.fullname;
        res.locals.avatar = user.avatar;
        res.locals.role = user.role;
      } else {
        res.clearCookie("token");
        res.locals.loggedin = false;
        res.locals.fullname = "";
        res.locals.role = "";
      }
    } catch (err) {
      console.error("JWT Verification Error:", err);
      res.clearCookie("token");
      res.locals.loggedin = false;
      res.locals.fullname = "";
      res.locals.role = "";
    }
  } else {
    res.locals.loggedin = false;
    res.locals.fullname = "";
    res.locals.role = "";
  }

  
  next();
};