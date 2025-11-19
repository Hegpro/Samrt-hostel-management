import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    hostelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true
    },

    floor: {
      type: Number,
      required: true,
      enum: [0, 1, 2, 3]   // Ground + 3 floors
    },

    roomNumber: {
      type: String,
      required: true
    },

    roomType: {
      type: String,
      required: true,
      enum: [
        "single",
        "singleAttach",
        "double",
        "doubleAttach",
        "triple",
        "tripleAttach",
        "four"
      ]
    },

    capacity: {
      type: Number,
      required: true
    },

    occupants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],

    status: {
      type: String,
      enum: ["available", "full", "maintenance"],
      default: "available"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Room", roomSchema);
