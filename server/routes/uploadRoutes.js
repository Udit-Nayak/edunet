const express = require('express');
const router = express.Router();
const {
  getSignedUploadUrl,
  uploadFileDirect,
  deleteFile,
  getMyFiles,
} = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Get signed upload URL (recommended - client uploads directly to Supabase)
router.post('/signed-url', getSignedUploadUrl);

// Direct upload through backend (alternative - for small files)
router.post('/direct', uploadFileDirect);

// Delete file
router.delete('/file', deleteFile);

// Get user's files
router.get('/my-files/:bucket', getMyFiles);

module.exports = router;