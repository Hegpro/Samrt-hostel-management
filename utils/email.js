// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: process.env.EMAIL_HOST,
//   port: Number(process.env.EMAIL_PORT) || 587,
//   secure: false, // Brevo uses TLS on port 587
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

// export const sendEmail = async ({ to, subject, html, text }) => {
//   try {
//     const info = await transporter.sendMail({
//       from: process.env.EMAIL_FROM,
//       to,
//       subject,
//       text: text || undefined,
//       html: html || undefined
//     });

//     console.log(" Email sent:", info.messageId);
//     return info;
//   } catch (error) {
//     console.error(" Email sending failed:", error);
//     throw new Error("Email sending failed");
//   }
// };
// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   host: "smtp-relay.brevo.com",
//   port: 587,
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER || "9c6d6d001@smtp-brevo.com",
//     pass: process.env.EMAIL_PASS || "IW1s6GEyBNPDY8a4",
//   },
// });

// export const sendEmail = async ({ to, subject, html, text }) => {
//   try {
//     const info = await transporter.sendMail({
//       from: process.env.EMAIL_FROM,
//       to,
//       subject,
//       text,
//       html,
//     });

//     console.log("Email sent:", info.messageId);
//     return info;
//   } catch (error) {
//     console.error("BREVO EMAIL ERROR:", error);
//     throw error;
//   }
// };
import axios from "axios";

const BREVO_API_KEY = process.env.BREVO_API_KEY;
export const sendEmail = async (to, subject, text, html = "") => {
  try {
    const payload = {
      sender: {
        name: "Smart Hostel",
        email: "prathamhegde6@gmail.com", // MUST be Brevo-verified
      },
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html || `<p>${text}</p>`,
    };

    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      payload,
      {
        headers: {
          "api-key": BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Email sent via Brevo API:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "BREVO API ERROR:",
      error.response?.data || error.message
    );
    throw error;
  }
};
