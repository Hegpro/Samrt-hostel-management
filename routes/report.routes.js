import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

import {
  getRoomOccupancy,
  exportRoomOccupancyExcel,
  exportRoomOccupancyPDF
} from "../controllers/report/report.controller.js";

const router = express.Router();


// Chief & Warden Route
router.get("/rooms", protect, authorizeRoles("chiefWarden", "warden"), getRoomOccupancy);

// Excel
router.get("/rooms/excel", protect, authorizeRoles("chiefWarden", "warden"), exportRoomOccupancyExcel);

// PDF
router.get("/rooms/pdf", protect, authorizeRoles("chiefWarden", "warden"), exportRoomOccupancyPDF);

import {
  getComplaintSummary,
  getComplaintTrendByMonth,
  getComplaintsList
} from "../controllers/complaint/complaint.controller.js";

// Complaint reports
router.get("/complaints/summary", protect, authorizeRoles("chiefWarden", "warden"), getComplaintSummary);
router.get("/complaints/trend", protect, authorizeRoles("chiefWarden", "warden"), getComplaintTrendByMonth);
router.get("/complaints/list", protect, authorizeRoles("chiefWarden", "warden"), getComplaintsList);


export default router;
