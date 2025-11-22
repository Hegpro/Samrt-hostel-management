import express from "express";
import {
  createSurplus,
  getAvailableSurplus,
  claimSurplus,
  updateSurplusStatus
} from "../controllers/surplus/surplus.controller.js";

import upload from "../middlewares/uploadCloudinary.js";
import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Mess manager posts surplus
router.post(
  "/create",
  protect,
  authorizeRoles("messManager"),
  upload.single("image"),
  createSurplus
);

// NGO sees available surplus
router.get(
  "/available",
  protect,
  authorizeRoles("ngo"),
  getAvailableSurplus
);

// NGO claims surplus
router.put(
  "/claim/:surplusId",
  protect,
  authorizeRoles("ngo"),
  claimSurplus
);

// Mess manager updates status
router.put(
  "/status/:surplusId",
  protect,
  authorizeRoles("messManager"),
  updateSurplusStatus
);

export default router;
