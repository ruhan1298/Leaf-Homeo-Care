// Test multer upload directly
const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/test-upload', upload.single('Image'), (req, res) => {
  console.log('=== TEST UPLOAD ===');
  console.log('Request body:', req.body);
  console.log('Request file:', req.file);
  console.log('Body keys:', Object.keys(req.body));
  
  res.json({
    success: true,
    body: req.body,
    file: req.file ? {
      originalname: req.file.originalname,
      filename: req.file.filename,
      path: req.file.path
    } : null
  });
});

app.listen(3001, () => {
  console.log('Test server running on port 3001');
  console.log('Test with: curl -X POST http://localhost:3001/test-upload -F "title=Test" -F "description=<p>Test</p>" -F "type=Patient"');
});