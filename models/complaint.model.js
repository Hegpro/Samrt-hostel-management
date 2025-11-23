// models/complaint.model.js
import mongoose from "mongoose";

const complaintSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Complaint" },

    description: {
      type: String,
      required: true
    },

    // type/category determines which staff category will handle it
    // allowed values: electrical, plumbing, cleaning, roomBoy, other
    category: {
        type: String,
        enum: ["electrical", "plumbing", "cleaning", "roomBoy", "carpenter", "civil", "other"],
        required: true
    },

    // who created the complaint (student)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    // hostel where complaint belongs (derived from student)
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true
    },

    // optional image uploaded by student when creating complaint
    imageUrl: { type: String, default: null },

    // image or proof uploaded by staff after resolving
    resolutionImageUrl: { type: String, default: null },

    // status flow:
    // pending -> in-progress -> resolved -> closed (auto-closed when resolved)
    // or pending -> in-progress -> not-resolvable -> escalated (warden)
    status: {
      type: String,
      enum: ["pending", "in-progress", "resolved", "not-resolvable", "closed"],
      default: "pending"
    },

    // who (user id) last updated/handled it (optional)
    handledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    // optional warden note when they close or act on escalation
    wardenNote: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("Complaint", complaintSchema);
