
const Patient = require('../../models/Patient');
const User = require('../../models/User');
const { Op } = require('sequelize');
const Sequelize = require('sequelize');

exports.GetAllPatients = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.body;

    const offset = (page - 1) * Number(limit);

    const where = {};

    if (search) {
      where[Op.or] = [
Sequelize.where(
      Sequelize.cast(Sequelize.col('gender'), 'TEXT'),
      { [Op.iLike]: `%${search}%` }
    ),        { country: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
     
      

        { "$user.name$": { [Op.iLike]: `%${search}%` } },
        { "$user.email$": { [Op.iLike]: `%${search}%` } },
        { "$user.mobile$": { [Op.iLike]: `%${search}%` } },

      ];
    }

    const { count, rows } = await Patient.findAndCountAll({
      where,

      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email", "mobile", "image"],
          required: false,
        },
      ],

      distinct: true,

      limit: Number(limit),
      offset,

      order: [["id", "DESC"]],
    });

    console.log("patient fetched:", rows);

    return res.status(200).json({
      status: 1,
      message: "Patients fetched successfully",
      data: {
        patients: rows,
        totalRecords: count,
        currentPage: Number(page),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};
exports.DeletePatient = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    console.log(patientId);
    
    

const patient = await Patient.findByPk(patientId);
    if (!patient) {
      return res.status(404).json({
        status: 0,
        message: "Patient not found",
      });
    }

    console.log(patient);
    
    const userId = patient.userId;
    console.log(userId,"user");
    


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
      id,
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
    console.log(req.body,"BODY");
    

    const patient = await Patient.findByPk(id);

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

    // Check if email or mobile already exists for another user
    if (email || mobile) {
      const existingUser = await User.findOne({
        where: {
          [Op.or]: [
            ...(email ? [{ email }] : []),
            ...(mobile ? [{ mobile }] : []),
          ],
          id: { [Op.ne]: patient.userId },
        },
      });

      if (existingUser) {
        return res.status(400).json({
          status: 0,
          message: existingUser.email === email ? "Email already exists" : "Mobile already exists",
        });
      }
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
    console.log(error,"errpr")
    next(error);
  }
};
