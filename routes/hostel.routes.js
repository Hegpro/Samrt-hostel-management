import express from "express";
import Hostel from "../models/hostel.model.js";

const router = express.Router();

// TEMPORARY: Developer creates hostel manually
router.post("/create", async (req, res) => {
  try {
    const { name, code, createdBy } = req.body;

    const hostel = await Hostel.create({
      name,
      code,
      createdBy
    });

    res.status(201).json({
      message: "Hostel created",
      hostel
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
