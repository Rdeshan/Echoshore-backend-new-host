const fileUploadService = require('../service/fileUpload.service');

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const folderName = req.body.folder || 'general';
    const result = await fileUploadService.uploadFile(req.file, folderName);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('File Upload Controller Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'File upload failed',
    });
  }
};

module.exports = {
  uploadFile,
};
