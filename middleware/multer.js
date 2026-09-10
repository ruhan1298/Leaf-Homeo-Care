const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log('=== MULTER DESTINATION ===');
    console.log('Setting destination to: uploads/');
    cb(null, "uploads/");
  },

  filename: (req, file, cb) => {
    console.log('=== MULTER FILENAME ===');
    console.log('Original filename:', file.originalname);
    const uniqueName = Date.now() + path.extname(file.originalname);
    console.log('Generated filename:', uniqueName);
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  console.log('=== MULTER FILE FILTER ===');
  console.log('File:', file);
  
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    // Videos
    "video/mp4",
    "video/webm",
    "video/quicktime",
    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/ogg"
  ];

  if (allowedTypes.includes(file.mimetype)) {
    console.log('File type allowed:', file.mimetype);
    cb(null, true);
  } else {
    console.log('File type rejected:', file.mimetype);
    cb(new Error("File type not allowed. Only images, documents, videos, and audio are supported."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Create upload instance that doesn't require file
const uploadOptional = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// Helper function to determine file type
const getFileType = (mimetype) => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf') || mimetype.includes('word') || mimetype.includes('document') || mimetype.includes('text')) return 'document';
  return 'document';
};

module.exports = { upload, uploadOptional, getFileType };