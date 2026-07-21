const User = require("./User");
const Doctor = require("./Doctor");
const Patient = require("./Patient");
const Appointment = require("./Appointment");
const Payment = require("./Payment");
const Notification = require("./Notification");
const Availability = require("./Availability"); 
const ChatMessage = require("./ChatMessage");
const Review = require('./Review')
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
Doctor.hasMany(Availability,{
   foreignKey:"doctorId"
})

Availability.belongsTo(Doctor,{
   foreignKey:"doctorId"
})

// ChatMessage relations
ChatMessage.belongsTo(User, {
  foreignKey: "senderId",
  as: "sender",
});

ChatMessage.belongsTo(User, {
  foreignKey: "receiverId",
  as: "receiver",
});
// Doctor
Doctor.hasMany(Review, {
  foreignKey: "doctorId",
  as: "reviews",
});

Review.belongsTo(Doctor, {
  foreignKey: "doctorId",
  as: "doctor",
});

// Patient
Patient.hasMany(Review, {
  foreignKey: "patientId",
  as: "reviews",
});

Review.belongsTo(Patient, {
  foreignKey: "patientId",
  as: "patient",
});

// Appointment
Appointment.hasOne(Review, {
  foreignKey: "appointmentId",
  as: "review",
});

Review.belongsTo(Appointment, {
  foreignKey: "appointmentId",
  as: "appointment",
});

console.log("✅ Model Relations Loaded");

module.exports = {
  User,
  Doctor,
  Patient,
  Appointment,
  Payment,
  Notification,
  Availability,
  ChatMessage,
  Review
};