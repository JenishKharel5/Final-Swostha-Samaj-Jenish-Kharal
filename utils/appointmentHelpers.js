// Helper function to convert 24-hour time format to 12-hour AM/PM format
function convertTo12HourFormat(time) {
  const [hours, minutes] = time.split(":");
  let hour = parseInt(hours);
  let ampm = "AM";

  if (hour >= 12) {
    ampm = "PM";
    if (hour > 12) {
      hour -= 12; // Convert to 12-hour format for PM
    }
  } else if (hour === 0) {
    hour = 12; // Handle midnight (00:xx as 12:xx AM)
  }

  return `${hour}:${minutes} ${ampm}`;
}

// Helper function to check if the user already has an appointment for the same service at the same time
async function checkExistingAppointment(
  userId,
  service,
  time,
  appointmentModel
) {
  return await appointmentModel.findOne({
    user: userId,
    service,
    time,
  });
}

// Helper function to check if the user has already made 4 appointments
async function checkAppointmentLimit(userId, appointmentModel) {
  const totalAppointments = await appointmentModel.countDocuments({
    user: userId,
  });
  return totalAppointments >= 4;
}

module.exports = {
  convertTo12HourFormat,
  checkExistingAppointment,
  checkAppointmentLimit,
};
