const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// إعدادات Cloudinary - القيم دي هتيجي من الـ Variables في Railway
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// إعداد المخزن (Storage)
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'factory_bridge_logos', // اسم الفولدر اللي هيتفتح في Cloudinary
    allowed_formats: ['jpg', 'png', 'jpeg'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }] // اختياري: بيصغر حجم الصورة عشان البروفايل
  },
});

const upload = multer({ storage: storage });

module.exports = upload;