const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const { ChatMessage, User } = require("../models");

// Rate limiting store (in-memory for simplicity, use Redis in production)
const rateLimitStore = new Map();
const MAX_MESSAGES_PER_MINUTE = 30;
const MAX_MESSAGE_LENGTH = 5000;

// Typing indicator store (in-memory, use Redis in production)
const typingUsers = new Map();

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    // Check both auth object and query parameters for token (makes it easy for React Native / client to connect)
    const token = 
      socket.handshake.auth?.token || 
      socket.handshake.query?.token || 
      socket.handshake.headers?.token;

    if (!token) {
      console.log("❌ Socket Auth Failed: No token provided");
      return next(new Error("Authentication error: Token required"));
    }

    try {
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || "homeopathy_secret_key");
      
      socket.user = {
        id: decoded.id,
        role: decoded.role
      };
      next();
    } catch (err) {
      console.log("❌ Socket Auth Failed: Invalid token", err.message);
      return next(new Error("Authentication error: Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.id;
    const userRoom = `user_${userId}`;
    
    // Join a private room named after the userId
    socket.join(userRoom);
    console.log(`⚡ Socket Connected: User ID ${userId} (Role: ${socket.user.role}) joined room ${userRoom}`);

    // Handle incoming messages
    socket.on("send_message", async (data, callback) => {
      try {
        const { receiverId, message, attachmentUrl, attachmentType, attachmentName, attachmentSize } = data;
        
        if (!receiverId) {
          if (callback) callback({ status: 0, error: "Receiver ID is required" });
          return;
        }

        // Allow either message or attachment (or both)
        if ((!message || message.trim() === "") && !attachmentUrl) {
          if (callback) callback({ status: 0, error: "Message content or attachment is required" });
          return;
        }

        // Rate limiting check
        const now = Date.now();
        const userMessages = rateLimitStore.get(userId) || [];
        const recentMessages = userMessages.filter(timestamp => now - timestamp < 60000); // Last minute
        
        if (recentMessages.length >= MAX_MESSAGES_PER_MINUTE) {
          if (callback) callback({ status: 0, error: "Rate limit exceeded. Please wait before sending more messages." });
          return;
        }
        
        // Update rate limit store
        recentMessages.push(now);
        rateLimitStore.set(userId, recentMessages);

        // Message size validation
        if (message && message.length > MAX_MESSAGE_LENGTH) {
          if (callback) callback({ status: 0, error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` });
          return;
        }

        // Save message to database
        const chatMessage = await ChatMessage.create({
          senderId: userId,
          receiverId: parseInt(receiverId, 10),
          message: message ? message.trim() : null,
          attachmentUrl: attachmentUrl || null,
          attachmentType: attachmentType || null,
          attachmentName: attachmentName || null,
          attachmentSize: attachmentSize || null,
          isRead: false
        });

        // Retrieve sender info
        const sender = await User.findByPk(userId, {
          attributes: ["id", "name", "image"]
        });

        const formattedMessage = {
          id: chatMessage.id,
          senderId: chatMessage.senderId,
          receiverId: chatMessage.receiverId,
          message: chatMessage.message,
          attachmentUrl: chatMessage.attachmentUrl,
          attachmentType: chatMessage.attachmentType,
          attachmentName: chatMessage.attachmentName,
          attachmentSize: chatMessage.attachmentSize,
          isRead: chatMessage.isRead,
          createdAt: chatMessage.createdAt,
          sender: sender ? {
            id: sender.id,
            name: sender.name,
            image: sender.image
          } : null
        };

        // Emit to receiver's private room
        const receiverRoom = `user_${receiverId}`;
        io.to(receiverRoom).emit("receive_message", formattedMessage);

        console.log(`✉️ Message sent from ${userId} to ${receiverId}`);

        // Acknowledge back to sender
        if (callback) {
          callback({ status: 1, data: formattedMessage });
        }
      } catch (error) {
        console.error("❌ Error sending message in socket:", error);
        if (callback) {
          callback({ status: 0, error: "Failed to send message: " + error.message });
        }
      }
    });

    // Handle typing indicators
    socket.on("typing_start", (data) => {
      const { receiverId } = data;
      if (receiverId) {
        const receiverRoom = `user_${receiverId}`;
        io.to(receiverRoom).emit("user_typing", { userId });
        
        // Store typing state with timeout
        typingUsers.set(userId, Date.now());
        
        // Clear typing indicator after 3 seconds of inactivity
        setTimeout(() => {
          const lastTyping = typingUsers.get(userId);
          if (lastTyping && Date.now() - lastTyping >= 3000) {
            typingUsers.delete(userId);
            io.to(receiverRoom).emit("user_stopped_typing", { userId });
          }
        }, 3000);
      }
    });

    socket.on("typing_stop", (data) => {
      const { receiverId } = data;
      if (receiverId) {
        typingUsers.delete(userId);
        const receiverRoom = `user_${receiverId}`;
        io.to(receiverRoom).emit("user_stopped_typing", { userId });
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket Disconnected: User ID ${userId}`);
      // Clean up typing state
      typingUsers.delete(userId);
      // Clean up rate limit store
      rateLimitStore.delete(userId);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io is not initialized yet!");
  }
  return io;
};

module.exports = { initSocket, getIO };
