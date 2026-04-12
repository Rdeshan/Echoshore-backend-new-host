const { imageUploadUtil } = require('../utils/cloudinary');

const uploadFile = async (file, folderName = 'general') => {
  try {
    const result = await imageUploadUtil(file, folderName);
    return {
      url: result.secure_url,
      public_id: result.public_id,
      resource_type: result.resource_type,
      format: result.format,
    };
  } catch (error) {
    throw new Error(`File upload failed: ${error.message}`);
  }
};

module.exports = {
  uploadFile,
};
