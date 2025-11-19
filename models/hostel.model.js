import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },

    code: {
      type: String,
      required: true,
      unique: true
      // Example: "A_BLOCK", "B_BLOCK"
      // Helps uniquely identify hostel
    },

    totalFloors: {
      type: Number,
      default: 4,        // Ground + 3 floors
      immutable: true    // Hostels always have 4 floors
    },

    wardenId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null       // Chief will assign a warden later
    },

    description: {
      type: String,
      default: null       // Optional: “Near main gate”, “Boys hostel”, etc.
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",        // Chief Warden
      required: true
    }
  },
  { timestamps: true }
);

const Hostel = mongoose.model("Hostel", hostelSchema);
export default Hostel;
