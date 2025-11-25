import express from "express";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";
import { resetAcademicYear } from "../controllers/admin/reset.controller.js";

const router = express.Router();

router.delete(
  "/academic-year",
  protect,
  authorizeRoles("chiefWarden"),
  resetAcademicYear
);

export default router;
