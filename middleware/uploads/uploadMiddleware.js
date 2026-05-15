const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET,
  
});
console.log("Cloudinary check:", {
  cloud: process.env.CLOUD_NAME ? "✅" : "❌",
  key: process.env.API_KEY ? "✅" : "❌",
  secret: process.env.API_SECRET ? "✅" : "❌",
});
// ==================== BRAND LOGO UPLOAD ====================
const brandLogoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "factorybridge/brand_logos",
    allowed_formats: ["jpg", "png", "jpeg", "gif"],
    resource_type: "auto",
  },
});

const uploadBrandLogo = multer({
  storage: brandLogoStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// ==================== FACTORY MEDIA UPLOAD ====================
const factoryMediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "factorybridge/factory_media",
    allowed_formats: ["jpg", "png", "jpeg", "gif", "mp4", "avi", "mov"],
    resource_type: "auto",
  },
});

const uploadFactoryMedia = multer({
  storage: factoryMediaStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for videos
});

// ==================== ERROR HANDLING ====================
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "File size too large" });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({ message: "Too many files" });
    }
  }
  next(err);
};

module.exports = {
  uploadBrandLogo,
  uploadFactoryMedia,
  handleUploadError,
  cloudinary,
};
