const nodemailer = require('nodemailer');

const sendPasswordResetCode = async (recipient, code) => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM) {
    throw new Error('Email delivery is not configured');
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined
  });
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: recipient,
    subject: 'SAPES password reset code',
    text: `Your SAPES password reset code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`
  });
};

module.exports = { sendPasswordResetCode };
