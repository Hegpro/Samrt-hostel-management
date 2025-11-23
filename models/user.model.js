// models/user.model.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, unique: true, sparse: true, default: null }, // sparse: allows nulls for staff who may not have email
    phone: { type: String },

    password: { type: String, required: true },

    role: {
      type: String,
      required: true,
      enum: ["chiefWarden", "warden", "staff", "student", "parent", "messManager", "ngo"],
    },

    staffType: {
      type: String,
      enum: ["electrician","plumber","cleaner","roomBoy","carpenter","civil"],
      default: null
    },

    // student-specific
    usn: { type: String, unique: true, sparse: true }, // 12-char unique for students

    // linkage
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // who created this account
    linkedStudent: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null }, // parent -> student link

    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel", default: null },
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", default: null },

    emailVerified: { type: Boolean, default: false },
    emailVerificationCode: { type: String, default: null }, // store OTP for verify/change flow
    emailVerificationExpiry: { type: Date, default: null },

    tempPassword: { type: Boolean, default: true } // true when system generated; user must change
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
