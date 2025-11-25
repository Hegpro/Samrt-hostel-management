// models/studentComplaint.model.js
import mongoose from "mongoose";

const studentComplaintSchema = new mongoose.Schema(
  {
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    parentId:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    // who raised the complaint (warden or chiefWarden)
    raisedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    raisedRole: { type: String, enum: ["warden", "chiefWarden"], required: true },

    title:       { type: String, required: true },
    description: { type: String, required: true },

    status: { type: String, enum: ["open", "closed"], default: "open" },

    closedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    closedNote: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("StudentComplaint", studentComplaintSchema);
