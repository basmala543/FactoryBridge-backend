const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Configure the server using Gmail credentials
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // factorybridge7@gmail.com
      pass: process.env.GMAIL_PASS, // Gmail app password (16 characters)
    },
  });

  const mailOptions = {
    from: `"FactoryBridge Support" <${process.env.GMAIL_USER}>`,
    to: options.email,          // recipient (support or user)
    subject: options.subject,   // email subject
    text: options.message,      // email body
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;