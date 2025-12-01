import express from "express";
import upload from "../middlewares/uploadCloudinary.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

import {
  createComplaint,
  getStaffComplaints,
  updateComplaintStatus,
  getWardenComplaints,
  wardenCloseComplaint,
  getChiefComplaints,
  deleteStudentComplaint,
  getWardenClosedComplaints
} from "../controllers/complaint/complaint.controller.js";

const router = express.Router();


// --------------------------------------------------
// STUDENT: CREATE COMPLAINT
// POST /api/complaints/create
// --------------------------------------------------
router.post(
  "/create",
  protect,
  authorizeRoles("student"),
  upload.single("image"),
  createComplaint
);


// --------------------------------------------------
// STAFF: GET COMPLAINTS (WITH HOSTEL FILTER)
// GET /api/complaints/staff?hostelId=xyz
// --------------------------------------------------
router.get(
  "/staff",
  protect,
  authorizeRoles("staff", "electrician", "plumber", "cleaner", "roomBoy", "carpenter", "civil"),
  getStaffComplaints
);


// --------------------------------------------------
// STAFF: UPDATE COMPLAINT STATUS
// PUT /api/complaints/update/:complaintId
// --------------------------------------------------
router.put(
  "/update/:complaintId",
  protect,
  upload.single("image"), // resolution image
  updateComplaintStatus
);


// --------------------------------------------------
// WARDEN: GET ESCALATED COMPLAINTS
// GET /api/complaints/warden
// --------------------------------------------------
router.get(
  "/warden",
  protect,
  authorizeRoles("warden"),
  getWardenComplaints
);


// --------------------------------------------------
// WARDEN: CLOSE ESCALATED COMPLAINT
// PUT /api/complaints/warden/close/:complaintId
// --------------------------------------------------
router.put(
  "/warden/close/:complaintId",
  protect,
  authorizeRoles("warden"),
  wardenCloseComplaint
);


// --------------------------------------------------
// CHIEF: VIEW + FILTER BY HOSTEL
// GET /api/complaints/chief?hostelId=xyz
// --------------------------------------------------
router.get(
  "/chief",
  protect,
  authorizeRoles("chiefWarden"),
  getChiefComplaints
);

router.delete(
  "/delete/:complaintId",
  protect,
  authorizeRoles("student"),
  deleteStudentComplaint
);

// --------------------------------------------------
// WARDEN: CLOSED COMPLAINTS OF HIS HOSTEL
// GET /api/complaints/warden/closed
// --------------------------------------------------
router.get(
  "/warden/closed",
  protect,
  authorizeRoles("warden"),
  getWardenClosedComplaints
);


export default router;
