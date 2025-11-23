import express from "express";
import {
  getChiefDashboard,
  getWardenDashboard,
  getStaffDashboard,
  getMessManagerDashboard,
  getNGODashboard,
  getStudentDashboard,
  getParentDashboard
} from "../controllers/dashboard/dashboard.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

/* ----------------------------------------------
   CHIEF WARDEN DASHBOARD
   /api/dashboard/chief
------------------------------------------------*/
router.get(
  "/chief",
  protect,
  authorizeRoles("chiefWarden"),
  getChiefDashboard
);

/* ----------------------------------------------
   WARDEN DASHBOARD
   /api/dashboard/warden
------------------------------------------------*/
router.get(
  "/warden",
  protect,
  authorizeRoles("warden"),
  getWardenDashboard
);

/* ----------------------------------------------
   STAFF DASHBOARD (electrician, plumber, etc.)
   /api/dashboard/staff
------------------------------------------------*/
router.get(
  "/staff",
  protect,
  authorizeRoles("electrician", "plumber", "cleaner", "roomBoy", "carpenter", "civil", "staff"),
  getStaffDashboard
);

/* ----------------------------------------------
   MESS MANAGER DASHBOARD
   /api/dashboard/mess
------------------------------------------------*/
router.get(
  "/mess",
  protect,
  authorizeRoles("messManager"),
  getMessManagerDashboard
);

/* ----------------------------------------------
   NGO DASHBOARD
   /api/dashboard/ngo
------------------------------------------------*/
router.get(
  "/ngo",
  protect,
  authorizeRoles("ngo"),
  getNGODashboard
);

/* ----------------------------------------------
   STUDENT DASHBOARD
   /api/dashboard/student
------------------------------------------------*/
router.get(
  "/student",
  protect,
  authorizeRoles("student"),
  getStudentDashboard
);

/* ----------------------------------------------
   PARENT DASHBOARD
   /api/dashboard/parent
------------------------------------------------*/
router.get(
  "/parent",
  protect,
  authorizeRoles("parent"),
  getParentDashboard
);

export default router;
