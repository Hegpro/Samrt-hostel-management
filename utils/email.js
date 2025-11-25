import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // Brevo uses TLS on port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      text: text || undefined,
      html: html || undefined
    });

    console.log(" Email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error(" Email sending failed:", error);
    throw new Error("Email sending failed");
  }
};
