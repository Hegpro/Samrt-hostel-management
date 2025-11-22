import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    message: {
      type: String,
      required: true
    },

    // Image or document (URL)
    imageUrl: {
      type: String,
      default: null
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    postedRole: {
      type: String,
      enum: ["chiefWarden", "warden"],
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Notice", noticeSchema);
