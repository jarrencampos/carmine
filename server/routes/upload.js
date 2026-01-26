const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getMediaType } = require('../utils/fileScanner');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const mediaType = getMediaType(file.originalname);
    let uploadDir;

    switch (mediaType) {
      case 'video':
        uploadDir = req.config.media.videos[0];
        break;
      case 'audio':
        uploadDir = req.config.media.music[0];
        break;
      case 'image':
        uploadDir = req.config.media.photos[0];
        break;
      default:
        uploadDir = './media';
    }

    const resolved = path.resolve(__dirname, '../..', uploadDir);

    // Ensure directory exists
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true });
    }

    cb(null, resolved);
  },
  filename: (req, file, cb) => {
    // Keep original filename, but add timestamp if exists
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const resolved = path.resolve(__dirname, '../..', req.config.media.videos[0]);
    const targetPath = path.join(resolved, file.originalname);

    if (fs.existsSync(targetPath)) {
      cb(null, `${base}_${Date.now()}${ext}`);
    } else {
      cb(null, file.originalname);
    }
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024 // 10GB
  },
  fileFilter: (req, file, cb) => {
    const mediaType = getMediaType(file.originalname);
    if (mediaType) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only video, audio, and image files are allowed.'));
    }
  }
});

// Upload progress tracking
const uploadProgress = new Map();

// Upload single file
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    success: true,
    file: {
      name: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      type: getMediaType(req.file.originalname),
      path: req.file.path
    }
  });
});

// Upload multiple files
router.post('/multiple', upload.array('files', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const results = req.files.map(file => ({
    name: file.filename,
    originalName: file.originalname,
    size: file.size,
    type: getMediaType(file.originalname),
    path: file.path
  }));

  res.json({
    success: true,
    files: results
  });
});

// Upload to specific directory
router.post('/to/:type', (req, res, next) => {
  const type = req.params.type;

  // Override destination based on type
  const customStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      let uploadDir;
      switch (type) {
        case 'videos':
          uploadDir = req.config.media.videos[0];
          break;
        case 'music':
          uploadDir = req.config.media.music[0];
          break;
        case 'photos':
          uploadDir = req.config.media.photos[0];
          break;
        default:
          return cb(new Error('Invalid upload type'));
      }

      const resolved = path.resolve(__dirname, '../..', uploadDir);
      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }
      cb(null, resolved);
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });

  const customUpload = multer({ storage: customStorage });
  customUpload.array('files', 50)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = req.files.map(file => ({
      name: file.filename,
      originalName: file.originalname,
      size: file.size,
      path: file.path
    }));

    res.json({
      success: true,
      files: results
    });
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large' });
    }
  }
  res.status(400).json({ error: error.message });
});

module.exports = router;
