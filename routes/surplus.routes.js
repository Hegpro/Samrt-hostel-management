import express from "express";
import {
  createSurplus,
  getAvailableSurplus,
  claimSurplus,
  updateSurplusStatus,
  getAllSurplus,
  getAllNGOs,
  deleteNGO,
  getClaimedSurplus
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

// Get all surplus created by logged-in Mess Manager
router.get(
  "/all",
  protect,
  authorizeRoles("messManager"),
  getAllSurplus
);

router.get("/ngos/all", protect, authorizeRoles("messManager"), getAllNGOs);

router.delete("/ngos/:ngoId", protect, authorizeRoles("messManager"), deleteNGO);

router.get("/claimed", protect, authorizeRoles("ngo"), getClaimedSurplus);

export default router;
