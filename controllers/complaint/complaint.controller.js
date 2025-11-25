// controllers/complaint/complaint.controller.js

import Complaint from "../../models/complaint.model.js";
import User from "../../models/user.model.js";
import Room from "../../models/room.model.js";
import { uploadToCloudinary } from "../../middlewares/uploadCloudinary.js";
import mongoose from "mongoose";


// --------------------------------------------------------------------
// 1. STUDENT CREATES COMPLAINT
// --------------------------------------------------------------------
export const createComplaint = async (req, res) => {
  try {
    const { description, category } = req.body;

    if (!description || !category) {
      return res.status(400).json({ message: "description & category required" });
    }

    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    let imageUrl = null;
    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "complaints");
      imageUrl = uploaded.secure_url;
    }

    const complaint = await Complaint.create({
      description,
      category,
      createdBy: student._id,
      hostelId: student.hostelId,
      imageUrl,
      status: "pending"
    });

    return res.status(201).json({
      message: "Complaint created successfully",
      complaint
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// CLEAN POPULATE HELPER
const complaintPopulate = [
  {
    path: "createdBy",
    select: "name usn hostelId roomId",
    populate: {
      path: "roomId",
      select: "roomNumber floor type"
    }
  },
  {
    path: "handledBy",
    select: "name staffType"
  }
];

export const deleteStudentComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Only student who created can delete
    if (complaint.createdBy.toString() !== req.user.id) {
      return res.status(403).json({ message: "You can delete only your complaints" });
    }

    // Only delete if complaint is still pending
    if (complaint.status !== "pending") {
      return res.status(400).json({ message: "Cannot delete complaint after it is processed" });
    }

    await Complaint.findByIdAndDelete(complaintId);

    return res.json({
      message: "Complaint deleted successfully"
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// --------------------------------------------------------------------
// 2. STAFF GET COMPLAINTS
// --------------------------------------------------------------------
export const getStaffComplaints = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id);

    if (!staff || !staff.staffType) {
      return res.status(403).json({ message: "You are not a staff member" });
    }

    const { hostelId } = req.query;
    if (!hostelId) {
      return res.status(400).json({ message: "hostelId is required" });
    }

    const complaints = await Complaint.find({
      category: staff.staffType,
      hostelId,
      status: { $ne: "closed" }
    })
      .sort({ createdAt: 1 })
      .populate(complaintPopulate);

    return res.status(200).json({
      message: "Complaints fetched",
      complaints
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// --------------------------------------------------------------------
// 3. STAFF UPDATES COMPLAINT STATUS
// --------------------------------------------------------------------
export const updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;

    const allowed = ["in-progress", "resolved", "not-resolvable"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status for staff" });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const staff = await User.findById(req.user.id);
    if (staff.staffType !== complaint.category) {
      return res.status(403).json({ message: "Not allowed for this complaint type" });
    }

    let resolutionImageUrl = complaint.resolutionImageUrl;

    if (req.file?.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "complaints/resolution");
      resolutionImageUrl = uploaded.secure_url;
    }

    if (status === "resolved") {
      complaint.status = "closed";
      complaint.resolutionImageUrl = resolutionImageUrl;
      complaint.handledBy = staff._id;
    }

    if (status === "not-resolvable") {
      complaint.status = "not-resolvable";
      complaint.handledBy = staff._id;
    }

    if (status === "in-progress") {
      complaint.status = "in-progress";
      complaint.handledBy = staff._id;
    }

    await complaint.save();

    return res.status(200).json({
      message: "Complaint status updated",
      complaint
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// --------------------------------------------------------------------
// 4. WARDEN GET ESCALATED COMPLAINTS
// --------------------------------------------------------------------
export const getWardenComplaints = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id);
    if (!warden || warden.role !== "warden") {
      return res.status(403).json({ message: "Access denied" });
    }

    const complaints = await Complaint.find({
      hostelId: warden.hostelId,
      status: "not-resolvable"
    })
      .sort({ createdAt: 1 })
      .populate(complaintPopulate);

    return res.status(200).json({
      message: "Escalated complaints fetched",
      complaints
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// --------------------------------------------------------------------
// 5. WARDEN CLOSE ESCALATED COMPLAINT
// --------------------------------------------------------------------
export const wardenCloseComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { note } = req.body;

    const warden = await User.findById(req.user.id);
    if (!warden || warden.role !== "warden") {
      return res.status(403).json({ message: "Access denied" });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (complaint.hostelId.toString() !== warden.hostelId.toString()) {
      return res.status(403).json({ message: "Not your hostel complaint" });
    }

    if (complaint.status !== "not-resolvable") {
      return res.status(400).json({ message: "Only escalated complaints can be closed" });
    }

    complaint.status = "closed";
    complaint.wardenNote = note || null;

    await complaint.save();

    return res.status(200).json({
      message: "Complaint closed by warden",
      complaint
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// --------------------------------------------------------------------
// 6. CHIEF – VIEW ALL COMPLAINTS (OPTIONAL HOSTEL FILTER)
// --------------------------------------------------------------------
export const getChiefComplaints = async (req, res) => {
  try {
    const chief = await User.findById(req.user.id);
    if (!chief || chief.role !== "chiefWarden") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { hostelId } = req.query;
    const filter = hostelId ? { hostelId } : {};

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .populate(complaintPopulate);

    return res.status(200).json({
      message: "Chief complaints fetched",
      complaints
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// --------------------------------------------------------------------
// 7. COMPLAINT SUMMARY (REPORT MODULE)
// --------------------------------------------------------------------
export const getComplaintSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { hostelId: qHostelId, from, to } = req.query;

    let hostelId = qHostelId;
    if (user.role === "warden") hostelId = user.hostelId;

    const match = {};
    if (hostelId) match.hostelId = new mongoose.Types.ObjectId(hostelId);
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const result = await Complaint.aggregate([
      { $match: match },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const summary = {};
    result.forEach(r => summary[r._id] = r.count);

    return res.status(200).json({
      message: "Complaint summary",
      summary
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// --------------------------------------------------------------------
// 8. COMPLAINT TREND (MONTHLY REPORT)
// --------------------------------------------------------------------
export const getComplaintTrendByMonth = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const months = parseInt(req.query.months || 6);

    let hostelId = req.query.hostelId;
    if (user.role === "warden") hostelId = user.hostelId;

    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);

    const match = { createdAt: { $gte: start } };
    if (hostelId) match.hostelId = new mongoose.Types.ObjectId(hostelId);

    const rows = await Complaint.aggregate([
      { $match: match },
      { $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 }
      }},
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    return res.status(200).json({
      message: "Complaint trend",
      data: rows
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// --------------------------------------------------------------------
export const getComplaintsList = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    const {
      status,
      category,
      from,
      to,
      hostelId: qHostelId,
      page = 1,
      limit = 50
    } = req.query;

    let hostelId = qHostelId;
    if (user.role === "warden") hostelId = user.hostelId;

    const filter = {};
    if (hostelId) filter.hostelId = new mongoose.Types.ObjectId(hostelId);
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    const complaints = await Complaint
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate(complaintPopulate);

    const total = await Complaint.countDocuments(filter);

    return res.status(200).json({
      message: "Complaints list",
      complaints,
      total,
      page: Number(page),
      limit: Number(limit)
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
