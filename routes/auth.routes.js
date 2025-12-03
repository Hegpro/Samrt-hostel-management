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
  verifyNGOCodeAndRegister,
  deleteStudent,
  getStudentsByRoom,
  getAllMessManagers,
  getAllWardens,
  deleteMessManager,
  deleteWarden,
  getAllHostels,
  parentLogin
} from "../controllers/auth.controller.js";
import { getStaffList, deleteStaff, getWardenStudents } from "../controllers/auth.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

import { getMe } from "../controllers/auth.controller.js";


// console.log(" I AM IN THE AUTH ROUTES FILE YOU EDITED!");


const router = express.Router();

import { sendEmail } from "../utils/email.js";

router.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: "prathamhegde6@gmail.com",
      subject: "Smart Hostel – Email Test",
      html: "<h2>This is a test email from Smart Hostel via Brevo SMTP!</h2>"
    });

    return res.json({ message: "Email test sent!" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// PUBLIC ROUTES
router.post("/login", login);
router.post("/parent-login", parentLogin);
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
    console.log(" ROUTE HIT: /chief/warden");
    next();
  },
  protect,
  (req, res, next) => {
    console.log(" PROTECT PASSED");
    next();
  },
  authorizeRoles("chiefWarden"),
  (req, res, next) => {
    console.log(" AUTHORIZE PASSED (chiefWarden)");
    next();
  },
  createWarden
);

router.post(
  "/chief/student",
  (req, res, next) => {
    console.log(" ROUTE HIT: /chief/student");
    next();
  },
  protect,
  (req, res, next) => {
    console.log(" PROTECT PASSED");
    next();
  },
  authorizeRoles("chiefWarden"),
  (req, res, next) => {
    console.log(" AUTHORIZE PASSED (chiefWarden)");
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

router.delete(
  "/remove/:studentId",
  protect,
  authorizeRoles("chiefWarden"),  // Only chief warden can remove
  deleteStudent
);

router.get(
  "/students/room/:roomId",
  protect,
  authorizeRoles("chiefWarden", "warden"),
  getStudentsByRoom
);

router.get(
  "/mess-managers/all",
  protect,
  authorizeRoles("chiefWarden"),
  getAllMessManagers
);    

router.delete(
  "/mess-managers/:messManagerId",
  protect,
  authorizeRoles("chiefWarden"),
  deleteMessManager
);  

router.delete(
  "/wardens/:wardenId",
  protect,
  authorizeRoles("chiefWarden"),
  deleteWarden
);

router.get(
  "/wardens/all",
  protect,
  authorizeRoles("chiefWarden"),
  getAllWardens
);

router.get(
  "/hostels/all",
  protect,
  authorizeRoles("chiefWarden"),
  getAllHostels
);

// ==============================================
// WARDEN ROUTES
// ==============================================

router.post(
  "/warden/staff",
  (req, res, next) => {
    console.log(" ROUTE HIT: /warden/staff");
    next();
  },
  protect,
  (req, res, next) => {
    console.log(" PROTECT PASSED");
    next();
  },
  authorizeRoles("warden"),
  (req, res, next) => {
    console.log(" AUTHORIZE PASSED (warden)");
    next();
  },
  createStaff
);

// 🆕 Warden gets his staff list
router.get(
  "/warden/staff",
  protect,
  authorizeRoles("warden"),
  getStaffList
);
// const sample = (req,res,err,next) => {  console.log("sample")};

router.delete("/warden/staff/:id",protect,authorizeRoles("warden"), deleteStaff);

router.get(
  "/warden/students",
  protect,
  authorizeRoles("warden"), 
  getWardenStudents
);

router.post("/ngo/register", registerNGO);

router.get("/me", protect, getMe);


export default router;
