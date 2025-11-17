import express from "express";
import authRoutes from "./auth.routes.js";
import roomRoutes from "./room.routes.js";
import complaintRoutes from "./complaint.routes.js";
import messRoutes from "./mess.routes.js";
import ngoRoutes from "./ngo.routes.js";
import reportRoutes from "./report.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/rooms", roomRoutes);
router.use("/complaints", complaintRoutes);
router.use("/mess", messRoutes);
router.use("/ngo", ngoRoutes);
router.use("/reports", reportRoutes);

export default router;
