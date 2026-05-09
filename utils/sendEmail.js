const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // إعداد السيرفر باستخدام بيانات الجيميل اللي معاكي
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // factorybridge7@gmail.com
      pass: process.env.GMAIL_PASS, // الـ App Password الـ 16 حرف
    },
  });

  const mailOptions = {
    from: `"FactoryBridge Support" <${process.env.GMAIL_USER}>`,
    to: options.email,          // المستلم (سواء الدعم أو المستخدم)
    subject: options.subject,   // عنوان الرسالة
    text: options.message,      // محتوى الرسالة
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;