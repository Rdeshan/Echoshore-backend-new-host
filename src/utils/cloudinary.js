const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const dotenv = require('dotenv');
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();

const upload = multer({ storage });

const imageUploadUtil = async (file, folderName = 'general') => {
  // Convert buffer to base64
  const base64 = file.buffer.toString('base64');

  // Construct Cloudinary data URI
  const dataUri = `data:${file.mimetype};base64,${base64}`;

  // Upload to Cloudinary
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `EcoShore/${folderName}`,
    resource_type: 'auto',
  });

  return result;
};

module.exports = {
  upload,
  imageUploadUtil,
};
