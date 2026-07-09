const User = require("../../models/User");
const Doctor = require("../../models/Doctor");
const Patient = require("../../models/Patient");
const Appointment = require("../../models/Appointment");
const Payment = require("../../models/Payment");

exports.GetDashboardStats = async (req, res, next) => {
  try {
    // 1. Get Total Patients Count
    const totalPatients = await Patient.count();

    // 2. Get Active Doctors Count (where associated User is active)
    const activeDoctors = await Doctor.count({
      include: [
        {
          model: User,
          as: "user",
          where: { isActive: true },
        },
      ],
    });

    // 3. Get Total Appointments Count
    const totalAppointments = await Appointment.count();

    // 4. Get Total Revenue (Sum of all paid payments)
    const totalRevenueResult = await Payment.sum("amount", {
      where: { status: "paid" },
    });
    const totalRevenue = totalRevenueResult ? parseFloat(totalRevenueResult) : 0.00;

    // 5. Get Recent Appointments (top 5, sorted by appointmentDateTime DESC)
    const recentAppointmentsRaw = await Appointment.findAll({
      limit: 5,
      order: [["appointmentDateTime", "DESC"]],
      include: [
        {
          model: Patient,
          as: "patient",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name"],
            },
          ],
        },
        {
          model: Doctor,
          as: "doctor",
          attributes: ["id"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["name"],
            },
          ],
        },
        {
          model: Payment,
          as: "payment",
          attributes: ["status"],
        },
      ],
    });

    const recentAppointments = recentAppointmentsRaw.map((appt) => ({
      id: appt.id,
      patientName: appt.patient && appt.patient.user ? appt.patient.user.name : "Unknown",
      doctorName: appt.doctor && appt.doctor.user ? appt.doctor.user.name : "Not Assigned",
      date: appt.appointmentDateTime,
      status: appt.status,
      paymentStatus: appt.payment ? appt.payment.status : "pending",
    }));
console.log(totalAppointments,
  totalPatients,
  totalRevenueResult,
  recentAppointments

);

    return res.status(200).json({
      status: 1,
      message: "Dashboard stats fetched successfully",
      data: {
        stats: {
          totalPatients,
          activeDoctors,
          totalAppointments,
          totalRevenue,
        },
        recentAppointments,
      },
    });
  } catch (error) {
    console.error("Error in GetDashboardStats: ", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong while fetching dashboard stats",
    });
  }
};
