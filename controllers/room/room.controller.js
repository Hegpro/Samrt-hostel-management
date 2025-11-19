import Room from "../../models/room.model.js";
import Hostel from "../../models/hostel.model.js";

export const addRoom = async (req, res) => {
  try {
    const { hostelId } = req.params;
    const { floor, roomNumber, roomType, capacity } = req.body;

    // Validate fields
    if (floor === undefined || !roomNumber || !roomType || !capacity) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check hostel exists
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    // Prevent duplicate room number for same hostel
    const exists = await Room.findOne({ hostelId, roomNumber });
    if (exists) {
      return res.status(400).json({ message: "Room already exists in this hostel" });
    }

    // Create room
    const room = await Room.create({
      hostelId,
      floor,
      roomNumber,
      roomType,
      capacity,
      occupants: []
    });

    return res.status(201).json({
      message: "Room added successfully",
      room
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getRoomsByHostel = async (req, res) => {
  try {
    const { hostelId } = req.params;

    // Check hostel exists
    const hostel = await Hostel.findById(hostelId);
    if (!hostel) {
      return res.status(404).json({ message: "Hostel not found" });
    }

    // Fetch all rooms of this hostel
    const rooms = await Room.find({ hostelId }).sort({ floor: 1, roomNumber: 1 });

    return res.status(200).json({
      hostel: hostel.name,
      totalRooms: rooms.length,
      rooms: rooms
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getRoomDetails = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId)
      .populate("occupants", "name usn role");

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    return res.status(200).json(room);

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateRoomStatus = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { status } = req.body;

    const validStatuses = ["available", "full", "maintenance"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid room status" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    room.status = status;
    await room.save();

    return res.status(200).json({
      message: "Room status updated successfully",
      room
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

//Reallocation of rooms
export const relocateFullRoom = async (req, res) => {
  try {
    const { oldRoomId, newRoomId } = req.body;

    if (!oldRoomId || !newRoomId) {
      return res.status(400).json({ message: "oldRoomId and newRoomId are required" });
    }

    // old room
    const oldRoom = await Room.findById(oldRoomId).populate("occupants");
    if (!oldRoom) return res.status(404).json({ message: "Old room not found" });

    // new room
    const newRoom = await Room.findById(newRoomId).populate("occupants");
    if (!newRoom) return res.status(404).json({ message: "New room not found" });

    if (newRoom.status === "maintenance") {
      return res.status(400).json({ message: "New room is under maintenance" });
    }

    const movingCount = oldRoom.occupants.length;
    const availableSpace = newRoom.capacity - newRoom.occupants.length;

    if (availableSpace < movingCount) {
      return res.status(400).json({ message: "New room does not have enough space" });
    }

    // Move all students from oldRoom → newRoom
    for (let student of oldRoom.occupants) {
      student.roomId = newRoom._id;
      student.hostelId = newRoom.hostelId;
      await student.save();
    }

    // Update occupants list
    newRoom.occupants.push(...oldRoom.occupants.map(s => s._id));
    oldRoom.occupants = [];

    // Update status
    oldRoom.status = "available";
    newRoom.status =
      newRoom.occupants.length >= newRoom.capacity ? "full" : "available";

    await newRoom.save();
    await oldRoom.save();

    return res.status(200).json({
      message: "Room fully relocated successfully",
      movedStudents: movingCount,
      from: oldRoom.roomNumber,
      to: newRoom.roomNumber
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


