
const Patient = require('../../models/Patient');
const User = require('../../models/User');
const { Op } = require('sequelize');

exports.GetAllPatients = async (req, res, next) => {
  try {
    const page = Number(req.body.page) || 1;
    const limit = Number(req.body.limit) || 10;

    const offset = (page - 1) * limit;

    const { count, rows } = await Patient.findAndCountAll({
      include: [
        {
          model: User,
          attributes: ["id", "name", "email", "mobile"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      distinct: true,
    });

    return res.status(200).json({
      status: 1,
      message: "Patients fetched successfully",
      data: rows,
      pagination: {
        totalRecords: count,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.DeletePatient = async (req, res, next) => {
  try {
    const { patientId } = req.body;

const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient not found",
      });
    }

    const userId = patient.userId;

    await patient.destroy();

    await User.destroy({
      where: {
        id: userId,
      },
    });

    return res.status(200).json({
      status: 1,
      message: "Patient deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
exports.UpdatePatient = async (req, res, next) => {
  try {
    const {
      patientId,
      name,
      email,
      mobile,
      gender,
      dob,
        houseNumber,
        addressLine1,
        addressLine2,
        landmark,
        city,
        state,
        pincode,
        country,

    

      
    } = req.body;

    const patient = await Patient.findByPk(patientId);

    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient not found",
      });
    }

    const user = await User.findByPk(patient.userId);

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: "User not found",
      });
    }

    await user.update({
      name,
      email,
      mobile,
    });

    await patient.update({
      gender,
      dob,
      houseNumber,
      addressLine1,
      addressLine2,
      landmark,
      city,
      state,
      pincode,
      country,
    });

    return res.status(200).json({
      status: 1,
      message: "Patient updated successfully",
    });
  } catch (error) {
    next(error);
  }
};