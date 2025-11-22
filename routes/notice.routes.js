import express from "express";
import {
  createNotice,
  getNotices
} from "../controllers/notice/notice.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * POST /api/notices/create
 * Chief Warden & Warden can create a notice
 */
router.post(
  "/create",
  protect,
  authorizeRoles("chiefWarden", "warden"),
  createNotice
);

/**
 * GET /api/notices/
 * All logged-in users can view notices
 * (students, parents, staff, mess, ngo, warden, chief)
 */
router.get(
  "/",
  protect,
  getNotices
);

export default router;
