// middlewares/uploadCloudinary.js
import multer from "multer";
import streamifier from "streamifier";
import cloudinary from "../config/cloudinary.js";

// use memory storage so we can stream file to cloudinary
const upload = multer({ storage: multer.memoryStorage() });

// helper to upload buffer to cloudinary via upload_stream
export const uploadToCloudinary = (buffer, folder = "notices") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

export default upload;
