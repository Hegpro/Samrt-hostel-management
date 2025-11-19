import express from "express";
import {
  addRoom,
  getRoomsByHostel,
  getRoomDetails,
  updateRoomStatus,
  relocateFullRoom
} from "../controllers/room/room.controller.js";

import { protect, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/:hostelId/add", addRoom);
router.get("/hostel/:hostelId", getRoomsByHostel);
router.get("/:roomId", getRoomDetails);
router.put(
  "/:roomId/status",
  protect,
  authorizeRoles("chiefWarden", "warden"),
  updateRoomStatus
);
router.put(
  "/relocate-full",
  protect,
  authorizeRoles("chiefWarden"),
  relocateFullRoom
);

export default router;
