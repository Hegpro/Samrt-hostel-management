// routes/studentComplaint.routes.js
import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import {
  createStudentComplaint,
  getParentStudentComplaints,
  closeStudentComplaint
} from "../controllers/studentComplaint/studentComplaint.controller.js";

const router = express.Router();

// Warden/Chief create (warden or chiefWarden)
router.post(
  "/create",
  protect,
  authorizeRoles("warden", "chiefWarden"),
  createStudentComplaint
);

// Parent list
router.get(
  "/parent",
  protect,
  authorizeRoles("parent","warden","chiefWarden"),
  getParentStudentComplaints
);

// Warden/Chief close
router.put(
  "/close/:complaintId",
  protect,
  authorizeRoles("warden", "chiefWarden"),
  closeStudentComplaint
);

export default router;
