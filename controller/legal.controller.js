const { TermsConditions, PrivacyPolicy } = require("../models");

// Get Terms of Service
exports.getTerms = async (req, res) => {
  try {
    const terms = await TermsConditions.findOne({
      order: [['createdAt', 'DESC']],
    });

    if (!terms) {
      return res.status(404).json({
        status: 0,
        message: "Terms of Service not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Terms of Service retrieved successfully",
      data: {
        id: terms.id,
        content: terms.text,
        lastUpdated: terms.updatedAt,
      },
    });
  } catch (error) {
    console.error("GetTerms Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

// Get Privacy Policy
exports.getPrivacyPolicy = async (req, res) => {
  try {
    const privacyPolicy = await PrivacyPolicy.findOne({
      order: [['createdAt', 'DESC']],
    });

    if (!privacyPolicy) {
      return res.status(404).json({
        status: 0,
        message: "Privacy Policy not found",
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Privacy Policy retrieved successfully",
      data: {
        id: privacyPolicy.id,
        content: privacyPolicy.text,
        lastUpdated: privacyPolicy.updatedAt,
      },
    });
  } catch (error) {
    console.error("GetPrivacyPolicy Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

// Update Terms of Service (Admin only)
exports.updateTerms = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        status: 0,
        message: "Content is required",
      });
    }

    const terms = await TermsConditions.create({
      text: content,
    });

    return res.status(200).json({
      status: 1,
      message: "Terms of Service updated successfully",
      data: {
        id: terms.id,
        content: terms.text,
        lastUpdated: terms.updatedAt,
      },
    });
  } catch (error) {
    console.error("UpdateTerms Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

// Update Privacy Policy (Admin only)
exports.updatePrivacyPolicy = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        status: 0,
        message: "Content is required",
      });
    }

    const privacyPolicy = await PrivacyPolicy.create({
      text: content,
    });

    return res.status(200).json({
      status: 1,
      message: "Privacy Policy updated successfully",
      data: {
        id: privacyPolicy.id,
        content: privacyPolicy.text,
        lastUpdated: privacyPolicy.updatedAt,
      },
    });
  } catch (error) {
    console.error("UpdatePrivacyPolicy Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};

// Get all legal content (Admin only)
exports.getAllLegalContent = async (req, res) => {
  try {
    const terms = await TermsConditions.findOne({
      order: [['createdAt', 'DESC']],
    });

    const privacyPolicy = await PrivacyPolicy.findOne({
      order: [['createdAt', 'DESC']],
    });

    const legalContent = [];

    if (terms) {
      legalContent.push({
        id: terms.id,
        type: 'terms',
        content: terms.text,
        lastUpdated: terms.updatedAt,
      });
    }

    if (privacyPolicy) {
      legalContent.push({
        id: privacyPolicy.id,
        type: 'privacy',
        content: privacyPolicy.text,
        lastUpdated: privacyPolicy.updatedAt,
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Legal content retrieved successfully",
      data: legalContent,
    });
  } catch (error) {
    console.error("GetAllLegalContent Error:", error);
    return res.status(500).json({
      status: 0,
      message: "Something went wrong",
    });
  }
};
