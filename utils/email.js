// utils/email.js
import nodemailer from "nodemailer";

const isProd = process.env.NODE_ENV === "production";

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!isProd) {
    console.log("==DEV EMAIL==");
    console.log("to:", to);
    console.log("subject:", subject);
    console.log("text:", text || html);
    return { ok: true, dev: true };
  }

  // production transport - configure via env
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const info = await transporter.sendMail({ from: process.env.SMTP_FROM, to, subject, text, html });
  return { ok: true, info };
};
