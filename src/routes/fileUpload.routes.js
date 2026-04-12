const express = require('express');
const fileUploadController = require('../controller/fileUpload.controller');
const requireAuth = require('../middleware/requireAuth');
const authorizeRoles = require('../middleware/authorizeRoles');
const { ROLES } = require('../constants/roles');
const { upload } = require('../utils/cloudinary');

const router = express.Router();

router.post(
  '/',
  requireAuth,
  authorizeRoles(ROLES.ADMIN, ROLES.ORGANIZER),
  upload.single('file'),
  fileUploadController.uploadFile
);

module.exports = router;
