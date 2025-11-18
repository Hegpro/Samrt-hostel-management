// routes/auth.routes.js
import express from "express";
import {
  login,
  createWarden,
  createStaff,
  createStudent,
  registerNGO,
  changePassword,
  sendPasswordResetCode,
  verifyCodeAndChangePassword
} from "../controllers/auth.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

// public
router.post("/login", login);
router.post("/ngo/register", registerNGO);
router.post("/password/send-code", sendPasswordResetCode);
router.post("/password/verify-change", verifyCodeAndChangePassword);

// protected: change password with old password
router.put("/change-password", protect, changePassword);

// chief-only create warden & student
router.post("/chief/warden", protect, authorizeRoles("chiefWarden"), createWarden);
router.post("/chief/student", protect, authorizeRoles("chiefWarden"), createStudent);

// warden creates staff
router.post("/warden/staff", protect, authorizeRoles("warden"), createStaff);

export default router;
