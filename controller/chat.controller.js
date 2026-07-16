const { ChatMessage, User, Appointment, Doctor, Patient } = require("../models");
const { Op, literal, fn, col } = require("sequelize");
const sequelize = require("../config/database").sequelize;
const { upload, getFileType } = require("../middleware/multer");

// Get chat history with another user
exports.getChatHistory = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    if (!otherUserId) {
      return res.status(400).json({ 
        status: 0, 
        message: "Other User ID is required" 
      });
    }

    const { count, rows: messages } = await ChatMessage.findAndCountAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: currentUserId }
        ]
      },
      order: [["createdAt", "DESC"]],
      limit,
      offset,
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "image"] },
        { model: User, as: "receiver", attributes: ["id", "name", "image"] }
      ]
    });

    // Reverse messages to show in chronological order
    const chronologicalMessages = messages.reverse();

    // Mark messages sent by the other user to current user as read
    await ChatMessage.update(
      { isRead: true },
      {
        where: {
          senderId: otherUserId,
          receiverId: currentUserId,
          isRead: false
        }
      }
    );

    return res.status(200).json({
      status: 1,
      message: "Chat history retrieved successfully",
      data: chronologicalMessages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalMessages: count,
        hasMore: page < Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error("❌ Error fetching chat history:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};

// Get contacts list (all doctors/patients we have appointments or chat history with)
exports.getContacts = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const role = req.user.role;

    let contactUserIds = new Set();

    // 1. Get contacts from appointments
    if (role === "patient") {
      const patient = await Patient.findOne({ where: { userId: currentUserId } });
      if (patient) {
        const appointments = await Appointment.findAll({
          where: { patientId: patient.id },
          include: [
            {
              model: Doctor,
              as: "doctor",
              include: [{ model: User, as: "user", attributes: ["id"] }]
            }
          ]
        });
        appointments.forEach(app => {
          if (app.doctor && app.doctor.user) {
            contactUserIds.add(app.doctor.user.id);
          }
        });
      }
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ where: { userId: currentUserId } });
      if (doctor) {
        const appointments = await Appointment.findAll({
          where: { doctorId: doctor.id },
          include: [
            {
              model: Patient,
              as: "patient",
              include: [{ model: User, as: "user", attributes: ["id"] }]
            }
          ]
        });
        appointments.forEach(app => {
          if (app.patient && app.patient.user) {
            contactUserIds.add(app.patient.user.id);
          }
        });
      }
    }

    // 2. Get contacts from ChatMessage history (just in case they chatted but no appointment records are there)
    const chatMessages = await ChatMessage.findAll({
      where: {
        [Op.or]: [{ senderId: currentUserId }, { receiverId: currentUserId }]
      },
      attributes: ["senderId", "receiverId"]
    });

    chatMessages.forEach(msg => {
      if (msg.senderId !== currentUserId) contactUserIds.add(msg.senderId);
      if (msg.receiverId !== currentUserId) contactUserIds.add(msg.receiverId);
    });

    const contactIdsArray = Array.from(contactUserIds);
    if (contactIdsArray.length === 0) {
      return res.status(200).json({ 
        status: 1, 
        data: [] 
      });
    }

    // 3. Fetch user details for all contacts
    const contacts = await User.findAll({
      where: { id: contactIdsArray },
      attributes: ["id", "name", "email", "mobile", "role", "image"],
      include: [
        { model: Doctor, as: "doctorProfile", attributes: ["specialization", "qualification"] },
        { model: Patient, as: "patientProfile", attributes: ["gender", "city"] }
      ]
    });

    // 4. Fetch all last messages using a simpler approach
    // Get all messages and then filter for the latest per conversation
    const allMessages = await ChatMessage.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId },
          { receiverId: currentUserId }
        ]
      },
      order: [["createdAt", "DESC"]],
      attributes: ['senderId', 'receiverId', 'message', 'createdAt']
    });

    // Group by conversation and get the latest message for each
    const lastMessageMap = {};
    allMessages.forEach(msg => {
      const conversationId = msg.senderId === currentUserId ? msg.receiverId : msg.senderId;
      if (!lastMessageMap[conversationId]) {
        lastMessageMap[conversationId] = msg;
      }
    });

    // 5. Fetch all unread counts in a single query
    const unreadCounts = await ChatMessage.findAll({
      where: {
        receiverId: currentUserId,
        isRead: false
      },
      attributes: [
        'senderId',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['senderId'],
      raw: true
    });

    const unreadCountMap = {};
    unreadCounts.forEach(row => {
      unreadCountMap[row.senderId] = parseInt(row.count);
    });

    // 6. Format contacts with metadata
    const contactsWithMeta = contacts.map(contact => {
      const contactData = contact.toJSON();

      // Use image path directly without adding /uploads prefix
      const imageUrl = contactData.image
        ? (contactData.image.startsWith("http") 
          ? contactData.image 
          : `${process.env.API_URL || 'http://localhost:5000'}/${contactData.image}`)
        : null;

      return {
        id: contactData.id,
        name: contactData.name,
        email: contactData.email,
        mobile: contactData.mobile,
        role: contactData.role,
        image: imageUrl,
        specialization: contactData.doctorProfile?.specialization || null,
        qualification: contactData.doctorProfile?.qualification || null,
        gender: contactData.patientProfile?.gender || null,
        city: contactData.patientProfile?.city || null,
        lastMessage: lastMessageMap[contactData.id] || null,
        unreadCount: unreadCountMap[contactData.id] || 0
      };
    });

    // Sort: contacts with messages first (by latest message time), then alphabetical order
    contactsWithMeta.sort((a, b) => {
      if (a.lastMessage && b.lastMessage) {
        return new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt);
      }
      if (a.lastMessage) return -1;
      if (b.lastMessage) return 1;
      return a.name.localeCompare(b.name);
    });

    return res.status(200).json({
      status: 1,
      message: "Contacts retrieved successfully",
      data: contactsWithMeta
    });
  } catch (error) {
    console.error("❌ Error fetching chat contacts:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};

// Get details for a single contact by user ID (to allow starting a chat with someone not already in history/appointments)
exports.getContactById = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ 
        status: 0, 
        message: "User ID is required" 
      });
    }

    const contact = await User.findByPk(userId, {
      attributes: ["id", "name", "email", "mobile", "role", "image"],
      include: [
        { model: Doctor, as: "doctorProfile", attributes: ["specialization", "qualification"] },
        { model: Patient, as: "patientProfile", attributes: ["gender", "city"] }
      ]
    });

    if (!contact) {
      return res.status(404).json({
        status: 0,
        message: "User not found"
      });
    }

    const contactData = contact.toJSON();
    const imageUrl = contactData.image
      ? (contactData.image.startsWith("http") 
        ? contactData.image 
        : `${process.env.API_URL || 'http://localhost:5000'}/uploads/${contactData.image}`)
      : null;

    const formattedContact = {
      id: contactData.id,
      name: contactData.name,
      email: contactData.email,
      mobile: contactData.mobile,
      role: contactData.role,
      image: imageUrl,
      specialization: contactData.doctorProfile?.specialization || null,
      qualification: contactData.doctorProfile?.qualification || null,
      gender: contactData.patientProfile?.gender || null,
      city: contactData.patientProfile?.city || null,
      lastMessage: null,
      unreadCount: 0
    };

    return res.status(200).json({
      status: 1,
      message: "Contact retrieved successfully",
      data: formattedContact
    });
  } catch (error) {
    console.error("❌ Error fetching contact by ID:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};

// Edit a message
exports.editMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;
    const { message } = req.body;

    if (!messageId || !message || message.trim() === "") {
      return res.status(400).json({ 
        status: 0, 
        message: "Message ID and content are required" 
      });
    }

    // Find the message
    const chatMessage = await ChatMessage.findByPk(messageId);

    if (!chatMessage) {
      return res.status(404).json({
        status: 0,
        message: "Message not found"
      });
    }

    // Check if user is the sender
    if (chatMessage.senderId !== currentUserId) {
      return res.status(403).json({
        status: 0,
        message: "You can only edit your own messages"
      });
    }

    // Update the message
    await chatMessage.update({ message: message.trim() });

    // Get updated message with sender info
    const updatedMessage = await ChatMessage.findByPk(messageId, {
      include: [
        { model: User, as: "sender", attributes: ["id", "name", "image"] },
        { model: User, as: "receiver", attributes: ["id", "name", "image"] }
      ]
    });

    return res.status(200).json({
      status: 1,
      message: "Message updated successfully",
      data: updatedMessage
    });
  } catch (error) {
    console.error("❌ Error editing message:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};

// Delete a message
exports.deleteMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ 
        status: 0, 
        message: "Message ID is required" 
      });
    }

    // Find the message
    const chatMessage = await ChatMessage.findByPk(messageId);

    if (!chatMessage) {
      return res.status(404).json({
        status: 0,
        message: "Message not found"
      });
    }

    // Check if user is the sender
    if (chatMessage.senderId !== currentUserId) {
      return res.status(403).json({
        status: 0,
        message: "You can only delete your own messages"
      });
    }

    // Delete the message
    await chatMessage.destroy();

    return res.status(200).json({
      status: 1,
      message: "Message deleted successfully",
      data: { id: messageId }
    });
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};

// Upload attachment
exports.uploadAttachment = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: 0,
        message: "No file uploaded"
      });
    }

    const attachmentUrl = `${process.env.API_URL || 'http://localhost:5000'}/uploads/${req.file.filename}`;
    const attachmentType = getFileType(req.file.mimetype);

    return res.status(200).json({
      status: 1,
      message: "File uploaded successfully",
      data: {
        url: attachmentUrl,
        type: attachmentType,
        name: req.file.originalname,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error("❌ Error uploading attachment:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};

// Send structured medical message
exports.sendMedicalMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { receiverId, messageType, medicalData, message } = req.body;

    if (!receiverId || !messageType) {
      return res.status(400).json({
        status: 0,
        message: "Receiver ID and message type are required"
      });
    }

    const validMessageTypes = ['text', 'symptom_report', 'prescription', 'appointment_reminder', 'lab_result'];
    if (!validMessageTypes.includes(messageType)) {
      return res.status(400).json({
        status: 0,
        message: "Invalid message type"
      });
    }

    // Create medical message
    const chatMessage = await ChatMessage.create({
      senderId: currentUserId,
      receiverId: parseInt(receiverId, 10),
      message: message || null,
      messageType,
      medicalData: medicalData || null,
      isRead: false
    });

    // Get sender info
    const sender = await User.findByPk(currentUserId, {
      attributes: ["id", "name", "image"]
    });

    const formattedMessage = {
      id: chatMessage.id,
      senderId: chatMessage.senderId,
      receiverId: chatMessage.receiverId,
      message: chatMessage.message,
      messageType: chatMessage.messageType,
      medicalData: chatMessage.medicalData,
      isRead: chatMessage.isRead,
      createdAt: chatMessage.createdAt,
      sender: sender ? {
        id: sender.id,
        name: sender.name,
        image: sender.image
      } : null
    };

    return res.status(200).json({
      status: 1,
      message: "Medical message sent successfully",
      data: formattedMessage
    });
  } catch (error) {
    console.error("❌ Error sending medical message:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};

// Get appointment details for chat context
exports.getAppointmentContext = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { otherUserId } = req.params;

    if (!otherUserId) {
      return res.status(400).json({
        status: 0,
        message: "Other User ID is required"
      });
    }

    let appointment = null;
    const role = req.user.role;

    if (role === "patient") {
      const patient = await Patient.findOne({ where: { userId: currentUserId } });
      if (patient) {
        appointment = await Appointment.findOne({
          where: { 
            patientId: patient.id,
            doctorId: otherUserId
          },
          include: [
            { model: Doctor, as: "doctor", include: [{ model: User, as: "user", attributes: ["id", "name", "image"] }] },
            { model: Patient, as: "patient", include: [{ model: User, as: "user", attributes: ["id", "name", "image"] }] }
          ],
          order: [["appointmentDate", "DESC"]]
        });
      }
    } else if (role === "doctor") {
      const doctor = await Doctor.findOne({ where: { userId: currentUserId } });
      if (doctor) {
        appointment = await Appointment.findOne({
          where: { 
            doctorId: doctor.id,
            patientId: otherUserId
          },
          include: [
            { model: Doctor, as: "doctor", include: [{ model: User, as: "user", attributes: ["id", "name", "image"] }] },
            { model: Patient, as: "patient", include: [{ model: User, as: "user", attributes: ["id", "name", "image"] }] }
          ],
          order: [["appointmentDate", "DESC"]]
        });
      }
    }

    if (!appointment) {
      return res.status(200).json({
        status: 1,
        message: "No appointment found",
        data: null
      });
    }

    return res.status(200).json({
      status: 1,
      message: "Appointment context retrieved successfully",
      data: appointment
    });
  } catch (error) {
    console.error("❌ Error fetching appointment context:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};

// Get prescription templates
exports.getPrescriptionTemplates = async (req, res) => {
  try {
    const templates = [
      {
        id: 1,
        name: "General Consultation",
        template: "Based on our consultation, I recommend the following:\n\n📋 Diagnosis: {diagnosis}\n💊 Medication: {medication}\n📅 Dosage: {dosage}\n⏰ Frequency: {frequency}\n📝 Notes: {notes}",
        category: "general"
      },
      {
        id: 2,
        name: "Symptom Follow-up",
        template: "Follow-up for {symptom}:\n\n📊 Current Status: {status}\n🔄 Changes since last visit: {changes}\n🎯 Treatment Plan: {treatment}\n⚠️ Watch for: {warnings}",
        category: "followup"
      },
      {
        id: 3,
        name: "Lab Results Review",
        template: "Lab Results Review:\n\n🔬 Test: {test_name}\n📈 Result: {result}\n📊 Normal Range: {normal_range}\n💡 Interpretation: {interpretation}\n📋 Next Steps: {next_steps}",
        category: "lab"
      },
      {
        id: 4,
        name: "Dietary Recommendations",
        template: "Dietary Recommendations:\n\n🥗 Foods to Include: {include_foods}\n🚫 Foods to Avoid: {avoid_foods}\n💧 Water Intake: {water_intake}\n🍽️ Meal Timing: {meal_timing}\n📝 Special Notes: {special_notes}",
        category: "diet"
      },
      {
        id: 5,
        name: "Lifestyle Changes",
        template: "Lifestyle Recommendations:\n\n🏃 Exercise: {exercise}\n😴 Sleep: {sleep}\n🧘 Stress Management: {stress_management}\n🚭 Habits to Change: {habits}\n📅 Follow-up: {followup_date}",
        category: "lifestyle"
      }
    ];

    return res.status(200).json({
      status: 1,
      message: "Prescription templates retrieved successfully",
      data: templates
    });
  } catch (error) {
    console.error("❌ Error fetching prescription templates:", error);
    return res.status(500).json({ 
      status: 0, 
      message: "Internal server error" 
    });
  }
};
