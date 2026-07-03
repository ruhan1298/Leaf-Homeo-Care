const User = require("./User");
const Doctor = require("./Doctor");
const Patient = require("./Patient");
const Appointment = require("./Appointment");
const Payment = require("./Payment");
const Notification = require("./Notification");
/*

 User Relations with Doctor 

*/

User.hasOne(Doctor, {
  foreignKey: "userId",
  as: "doctorProfile",
});

Doctor.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

/*
    User Relations with Patient
*/

User.hasOne(Patient, {
  foreignKey: "userId",
  as: "patientProfile",
});

Patient.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

/*
patient relations with appointment
*/

Patient.hasMany(Appointment, {
  foreignKey: "patientId",
  as: "appointments",
});

Appointment.belongsTo(Patient, {
  foreignKey: "patientId",
  as: "patient",
});

/*
Doctor relations with appointment
*/

Doctor.hasMany(Appointment, {
  foreignKey: "doctorId",
  as: "appointments",
});

Appointment.belongsTo(Doctor, {
  foreignKey: "doctorId",
  as: "doctor",
});

/*
Appointment relations with payment


*/

Appointment.hasOne(Payment, {
  foreignKey: "appointmentId",
  as: "payment",
});

Payment.belongsTo(Appointment, {
  foreignKey: "appointmentId",
  as: "appointment",
});
User.hasMany(Notification, {
  foreignKey: "userId",
  as: "notifications",
});

Notification.belongsTo(User, {
  foreignKey: "userId",
  as: "receiver",
});

Notification.belongsTo(User, {
  foreignKey: "senderId",
  as: "sender",
});

console.log("✅ Model Relations Loaded");

module.exports = {
  User,
  Doctor,
  Patient,
  Appointment,
  Payment,
  Notification,
};