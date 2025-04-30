const mongoose = require("mongoose");
const config = require("config");
const dbr = require("debug")("development:mongoose");
const db = config.get("MONGODB_URI");

mongoose
  .connect(db)
  .then(() => {
    console.log("connected.");
  })
  .catch((err) => {
    dbr(err);
  });

module.exports = mongoose.connection;
