import mongoose from "mongoose";

const surplusSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "Surplus Food"
    },

    description: {
      type: String,
      required: true
    },

    quantity: {
      type: String, // "10 kg", "25 plates"
      required: true
    },

    imageUrl: {
      type: String,
      default: null
    },

    deadline: {
      type: Date,
      required: true
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true // mess manager
    },

    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null // NGO
    },

    status: {
      type: String,
      enum: ["available", "claimed", "expired", "distributed"],
      default: "available"
    }
  },
  { timestamps: true }
);

export default mongoose.model("SurplusFood", surplusSchema);
