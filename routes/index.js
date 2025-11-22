import express from "express";
import authRoutes from "./auth.routes.js";
import roomRoutes from "./room.routes.js";
import complaintRoutes from "./complaint.routes.js";
import messRoutes from "./mess.routes.js";
import ngoRoutes from "./ngo.routes.js";
import reportRoutes from "./report.routes.js";
import hostelRoutes from "./hostel.routes.js";
import noticeRoutes from "./notice.routes.js";

const router = express.Router();

console.log("📌 LOADED ROUTES INDEX FROM:", import.meta.url);


console.log("INDEX ROUTES FILE LOADED");

router.use("/auth", (req, res, next) => {
  console.log("AUTH ROUTER HIT");
  next();
}, authRoutes);

router.use("/rooms", (req, res, next) => {
  console.log("ROOM ROUTER HIT");
  next();
}, roomRoutes);

router.use("/complaints", (req, res, next) => {
  console.log("COMPLAINT ROUTER HIT");
  next();
}, complaintRoutes);

router.use("/mess", (req, res, next) => {
  console.log("MESS ROUTER HIT");
  next();
}, messRoutes);

router.use("/ngo", (req, res, next) => {
  console.log("NGO ROUTER HIT");
  next();
}, ngoRoutes);

router.use("/reports", (req, res, next) => {
  console.log("REPORT ROUTER HIT");
  next();
}, reportRoutes);

router.use("/hostels", hostelRoutes);

router.use("/notices", noticeRoutes);

export default router;
