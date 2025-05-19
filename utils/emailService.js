const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

const sendOTPEmail = (email, otp) => {
  if (!email || !otp) {
    console.error("Email or OTP is missing");
    return;
  }

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
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Welcome to Swostha Samaj!</h2>
        <p style="font-size: 16px; color: #4b5563; margin-bottom: 20px;">Your OTP for verification is:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #1e40af;">${otp}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">This OTP will expire in 5 minutes.</p>
        <p style="font-size: 14px; color: #6b7280;">Please do not reply to this email. If you did not request this OTP, please ignore this message.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 14px; color: #6b7280;">Thank you,<br>Swostha Samaj Team</p>
      </div>
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
    digits: true,
    alphabets: true,
    upperCase: false,
    specialChars: false,
  });

  const otpExpiry = Date.now() + 5 * 60 * 1000; // Set OTP expiry time (5 minutes)

  return { otp, otpExpiry };
};

const verifyOTP = (otp, sessionOtp, otpExpiry) => {
  if (!otp || !sessionOtp) {
    return { success: false, message: "Invalid OTP format." };
  }
  if (otp !== sessionOtp) {
    return { success: false, message: "Invalid OTP. Please try again." };
  }
  if (Date.now() > otpExpiry) {
    return { success: false, message: "OTP has expired. Please try again." };
  }
  return { success: true };
};

// Send appointment status email
async function sendAppointmentStatusEmail(email, status, appointment, staffName) {
  try {
    let subject = "";
    let htmlContent = "";

    // Generate ticket ID if not provided
    const ticketId = appointment.ticketId || `TICKET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Common email template parts with enhanced styling
    const header = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8eb 100%);">
        <div style="text-align: center; padding: 20px; background: linear-gradient(135deg, #4b6cb7 0%, #182848 100%); border-radius: 8px; margin-bottom: 20px;">
          <h2 style="color: white; margin: 0; font-size: 24px;">Swostha Samaj</h2>
          <p style="color: #e0e0e0; margin: 10px 0; font-size: 16px;">Healthcare Management System</p>
        </div>
    `;

    const footer = `
        <div style="text-align: center; margin-top: 20px; padding: 20px; border-top: 1px solid #e0e0e0; color: #666; background: #f8f9fa; border-radius: 0 0 8px 8px;">
          <p style="margin: 5px 0; font-size: 15px;">Thank you for choosing Swostha Samaj</p>
          <p style="margin: 5px 0; font-size: 14px;">For any queries, please contact us at SwosthaSamaj@gmail.com</p>
        </div>
      </div>
    `;

    // Status-specific content with enhanced colors
    let statusColor = "";
    let statusMessage = "";
    let statusText = "";
    let additionalMessage = "";
    let statusIcon = "";

    switch (status) {
      case "Accepted":
      case "Booked":
        statusColor = "#28a745";
        statusMessage = "Your program booking has been BOOKED";
        statusText = "BOOKED";
        statusIcon = "✅";
        additionalMessage = "Your program booking has been confirmed. Please keep this ticket for your records. If you have any questions, reply to this email or contact our support.";
        break;
      case "Rejected":
        statusColor = "#dc3545";
        statusMessage = "Your program booking has been REJECTED";
        statusText = "REJECTED";
        statusIcon = "❌";
        additionalMessage = "We regret to inform you that your program booking could not be confirmed at this time. Please try booking another program or contact support for assistance.";
        break;
      case "Pending":
        statusColor = "#ffc107";
        statusMessage = "Your program booking is PENDING";
        statusText = "PENDING";
        statusIcon = "⏳";
        additionalMessage = "Your program booking request is being reviewed. You will receive another email once it is approved or rejected.";
        break;
    }

    // Construct the email content with enhanced styling
    htmlContent = `
      ${header}
      <div style="padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Dear ${appointment.user_fullname},</p>
        
        <div style="background-color: ${statusColor}15; border-left: 4px solid ${statusColor}; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
          <p style="font-size: 18px; color: ${statusColor}; margin: 0; font-weight: bold;">
            ${statusIcon} ${statusMessage}
          </p>
        </div>

        ${status === 'Booked' ? `
          <div style="background-color: #fff3cd; border: 2px dashed #ffc107; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-weight: bold; color: #856404;">Ticket ID: ${ticketId}</p>
          </div>
        ` : ''}

        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4b6cb7;">
          <p style="margin: 0; line-height: 1.6;">
            <strong style="color: #2d3748;">Program:</strong> ${appointment.name || appointment.vaccine_name}<br>
            <strong style="color: #2d3748;">Hospital:</strong> ${appointment.hospital || appointment.vaccine_hospital}
          </p>
        </div>

        <p style="font-size: 15px; color: #374151; margin: 20px 0; line-height: 1.6; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
          ${additionalMessage}
        </p>

        <div style="background-color: #e8f4f8; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #17a2b8;">
          <p style="font-size: 14px; color: #2d3748; margin: 0;">
            Handled by: <strong style="color: #2d3748;">${staffName || 'Staff'}</strong>
          </p>
        </div>
      </div>
      ${footer}
    `;

    // Set the subject based on status
    subject = `Swostha Samaj - Program Booking ${statusText}${ticketId ? ` (${ticketId})` : ''}`;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "swosthasamaj@gmail.com",
        pass: "tknb cngh wabq bkhd",
      },
    });

    await transporter.sendMail({
      from: "swosthasamaj@gmail.com",
      to: email,
      subject: subject,
      html: htmlContent,
    });

    console.log(`Appointment status email sent to ${email}`);
  } catch (error) {
    console.error("Error sending appointment status email:", error);
    throw error;
  }
}

// Send reply to contact message
async function sendReplyToContact(email, name, replyMessage, staffName) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "swosthasamaj@gmail.com",
      pass: "tknb cngh wabq bkhd",
    },
  });

  const mailOptions = {
    from: 'swosthasamaj@gmail.com',
    to: email,
    subject: `Reply from Swostha Samaj Support`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Hello <b>${name}</b>,</h2>
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">You have received a reply from our staff at Swostha Samaj:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-bottom: 20px; border-left: 4px solid #2563eb;">
          <span style="font-size: 16px; color: #1e40af;">${replyMessage}</span>
        </div>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">If you have further questions, feel free to reply to this email or contact us again through our website.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 14px; color: #6b7280;">Best regards,<br>${staffName}<br>Swostha Samaj Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail, generateOTP, verifyOTP, sendAppointmentStatusEmail, sendReplyToContact };
