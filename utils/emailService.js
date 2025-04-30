const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

const sendOTPEmail = (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "swosthasamaj@gmail.com",
      pass: "tknb cngh wabq bkhd",
    },
  });

  const mailOptions = {
    from: "swosthasamaj@gmail.com",
    to: email,
    subject: "OTP Verification - Swostha Samaj",
    html: `
      <p>Welcome to Swostha Samaj!</p>
      <p>Your OTP for verification is: <strong>${otp}</strong></p>
      <p>Please do not reply to this email. If you did not request this OTP, please ignore this message.</p>
      <p>Thank you,<br>Swostha Samaj Team</p>
    `,
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error("Error sending OTP:", error);
    } else {
      console.log("OTP sent successfully:", info.response);
    }
  });
};

const generateOTP = () => {
  const otp = otpGenerator.generate(6, {
    specialChars: false,
    upperCaseAlphabets: false,
  });

  const otpExpiry = Date.now() + 5 * 60 * 1000; // Set OTP expiry time (5 minutes)

  return { otp, otpExpiry };
};

const verifyOTP = (otp, sessionOtp, otpExpiry) => {
  if (otp !== sessionOtp) {
    return { success: false, message: "Invalid OTP. Please try again." };
  }
  if (Date.now() > otpExpiry) {
    return { success: false, message: "OTP has expired. Please try again." };
  }
  return { success: true };
};
module.exports = { sendOTPEmail, generateOTP, verifyOTP };
