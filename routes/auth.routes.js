// routes/auth.routes.js
import express from "express";
import {
  login,
  createWarden,
  createStaff,
  createStudent,
  createMessManager, 
  registerNGO,
  changePassword,
  sendPasswordResetCode,
  verifyCodeAndChangePassword,
  sendNGOVerificationCode,
  verifyNGOCodeAndRegister
} from "../controllers/auth.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

console.log("🚨 I AM IN THE AUTH ROUTES FILE YOU EDITED!");


const router = express.Router();

// PUBLIC ROUTES
router.post("/login", login);
// router.post("/ngo/register", registerNGO);
router.post("/ngo/send-code", sendNGOVerificationCode);
router.post("/ngo/verify-register", verifyNGOCodeAndRegister);
router.post("/password/send-code", sendPasswordResetCode);
router.post("/password/verify-change", verifyCodeAndChangePassword);

// PROTECTED ROUTE (change own password)
router.put("/change-password", protect, changePassword);

// ==============================================
// CHIEF WARDEN ROUTES
// ==============================================

router.post(
  "/chief/warden",
  (req, res, next) => {
    console.log("🔵 ROUTE HIT: /chief/warden");
    next();
  },
  protect,
  (req, res, next) => {
    console.log("🟢 PROTECT PASSED");
    next();
  },
  authorizeRoles("chiefWarden"),
  (req, res, next) => {
    console.log("🟣 AUTHORIZE PASSED (chiefWarden)");
    next();
  },
  createWarden
);

router.post(
  "/chief/student",
  (req, res, next) => {
    console.log("🔵 ROUTE HIT: /chief/student");
    next();
  },
  protect,
  (req, res, next) => {
    console.log("🟢 PROTECT PASSED");
    next();
  },
  authorizeRoles("chiefWarden"),
  (req, res, next) => {
    console.log("🟣 AUTHORIZE PASSED (chiefWarden)");
    next();
  },
  createStudent
);

router.post(
  "/chief/mess-manager",
  protect,
  authorizeRoles("chiefWarden"),
  createMessManager
);


// ==============================================
// WARDEN ROUTES
// ==============================================

router.post(
  "/warden/staff",
  (req, res, next) => {
    console.log("🔵 ROUTE HIT: /warden/staff");
    next();
  },
  protect,
  (req, res, next) => {
    console.log("🟢 PROTECT PASSED");
    next();
  },
  authorizeRoles("warden"),
  (req, res, next) => {
    console.log("🟣 AUTHORIZE PASSED (warden)");
    next();
  },
  createStaff
);

router.post("/ngo/register", registerNGO);


export default router;
