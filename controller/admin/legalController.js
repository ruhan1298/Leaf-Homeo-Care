const PrivacyPolicy = require("../../models/privacypolicy");
const TermsConditions = require("../../models/termsconditions");

// Privacy Policy Controllers
exports.CreatePrivacyPolicy = async (req, res, next) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        status: 0,
        message: "Text is required",
      });
    }

    // Delete existing privacy policy (only one should exist)
    await PrivacyPolicy.destroy({ where: {}, truncate: true });

    // Create new privacy policy
    const privacyPolicy = await PrivacyPolicy.create({ text });

    return res.status(201).json({
      status: 1,
      message: "Privacy Policy created successfully",
      data: privacyPolicy,
    });
  } catch (error) {
    console.error("Error in CreatePrivacyPolicy: ", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong while creating privacy policy",
    });
  }
};

exports.GetPrivacyPolicy = async (req, res, next) => {
  try {
    const privacyPolicy = await PrivacyPolicy.findOne({
      order: [["createdAt", "DESC"]],
    });
    console.log(privacyPolicy,"DATA");
    

    if (!privacyPolicy) {
      return res.status(404).json({
        status: 0,
        message: "Privacy Policy not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Privacy Policy fetched successfully",
      data: privacyPolicy,
    });
  } catch (error) {
    console.error("Error in GetPrivacyPolicy: ", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong while fetching privacy policy",
    });
  }
};

exports.UpdatePrivacyPolicy = async (req, res, next) => {
  try {
    const { id, text } = req.body;

    if (!id || !text) {
      return res.status(400).json({
        status: 0,
        message: "ID and Text are required",
      });
    }

    const privacyPolicy = await PrivacyPolicy.findByPk(id);

    if (!privacyPolicy) {
      return res.status(404).json({
        status: 0,
        message: "Privacy Policy not found",
      });
    }

    await privacyPolicy.update({ text });

    return res.status(200).json({
      status: 1,
      message: "Privacy Policy updated successfully",
      data: privacyPolicy,
    });
  } catch (error) {
    console.error("Error in UpdatePrivacyPolicy: ", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong while updating privacy policy",
    });
  }
};

// Terms & Conditions Controllers
exports.CreateTermsConditions = async (req, res, next) => {
  try {
    const { text } = req.body;
    console.log(req.body,"BODY");
    

    if (!text) {
      return res.status(400).json({
        status: 0,
        message: "Text is required",
      });
    }

    // Delete existing terms & conditions (only one should exist)
    await TermsConditions.destroy({ where: {}, truncate: true });

    // Create new terms & conditions
    const termsConditions = await TermsConditions.create({ text });

    return res.status(201).json({
      status: 1,
      message: "Terms & Conditions created successfully",
      data: termsConditions,
    });
  } catch (error) {
    console.error("Error in CreateTermsConditions: ", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong while creating terms & conditions",
    });
  }
};

exports.GetTermsConditions = async (req, res, next) => {
  try {
    const termsConditions = await TermsConditions.findOne({
      order: [["createdAt", "DESC"]],
    });

    if (!termsConditions) {
      return res.status(404).json({
        status: 0,
        message: "Terms & Conditions not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Terms & Conditions fetched successfully",
      data: termsConditions,
    });
  } catch (error) {
    console.error("Error in GetTermsConditions: ", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong while fetching terms & conditions",
    });
  }
};

exports.UpdateTermsConditions = async (req, res, next) => {
  try {
    const { id, text } = req.body;

    if (!id || !text) {
      return res.status(400).json({
        status: 0,
        message: "ID and Text are required",
      });
    }

    const termsConditions = await TermsConditions.findByPk(id);

    if (!termsConditions) {
      return res.status(404).json({
        status: 0,
        message: "Terms & Conditions not found",
      });
    }

    await termsConditions.update({ text });

    return res.status(200).json({
      status: 1,
      message: "Terms & Conditions updated successfully",
      data: termsConditions,
    });
  } catch (error) {
    console.error("Error in UpdateTermsConditions: ", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong while updating terms & conditions",
    });
  }
};
