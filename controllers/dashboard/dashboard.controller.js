import User from "../../models/user.model.js";
import Room from "../../models/room.model.js";
import Hostel from "../../models/hostel.model.js";

export const getStudentRoomDetails = async (req, res) => {
  try {
    const student = await User.findById(req.user.id)
      .select("name usn roomId hostelId");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const room = await Room.findById(student.roomId)
      .populate("students", "name usn");

    const hostel = await Hostel.findById(student.hostelId)
      .select("name block floors");

    return res.status(200).json({
      student,
      hostel,
      room,
      roommates: room.students.filter(s => s._id.toString() !== req.user.id)
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

import Complaint from "../../models/complaint.model.js";

export const getStudentComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      complaints
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

import Notice from "../../models/notice.model.js";

export const getStudentNotices = async (req, res) => {
  try {
    const notices = await Notice.find().sort({ createdAt: -1 });
    return res.status(200).json({ notices });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getStudentDashboard = async (req, res) => {
  try {
    // Get basic student + roommates
    const studentData = await User.findById(req.user.id)
      .select("name usn hostelId roomId");

    const room = await Room.findById(studentData.roomId)
      .populate("students", "name usn");

    const hostel = await Hostel.findById(studentData.hostelId)
      .select("name");

    const roommates = room.students.filter(s => s._id.toString() !== req.user.id);

    // Complaints
    const complaints = await Complaint.find({ createdBy: req.user.id })
      .sort({ createdAt: -1 });

    // Notices
    const notices = await Notice.find().sort({ createdAt: -1 });

    return res.status(200).json({
      student: studentData,
      hostel,
      room,
      roommates,
      complaints,
      notices
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getParentDashboard = async (req, res) => {
  try {
    const student = await User.findOne({ usn: req.user.identifier })
      .select("name usn hostelId roomId");

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const room = await Room.findById(student.roomId)
      .populate("students", "name usn");

    const hostel = await Hostel.findById(student.hostelId)
      .select("name");

    const roommates = room.students.filter(
      s => s.usn !== student.usn
    );

    const complaints = await Complaint.find({ createdBy: student._id })
      .sort({ createdAt: -1 });

    const notices = await Notice.find().sort({ createdAt: -1 });

    return res.status(200).json({
      student,
      hostel,
      room,
      roommates,
      complaints,
      notices
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getChiefDashboard = async (req, res) => {
  try {
    const totalHostels = await Hostel.countDocuments();
    const totalStudents = await User.countDocuments({ role: "student" });
    const totalWardens = await User.countDocuments({ role: "warden" });
    const totalStaff = await User.countDocuments({ role: "staff" });

    // complaint summary
    const complaintSummary = await Complaint.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    // surplus summary
    const surplusSummary = await SurplusFood.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const recentComplaints = await Complaint.find()
      .sort({ createdAt: -1 })
      .limit(5);

    const recentNotices = await Notice.find()
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      totalHostels,
      totalStudents,
      totalWardens,
      totalStaff,
      complaintSummary,
      surplusSummary,
      recentComplaints,
      recentNotices
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getWardenDashboard = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id);
    const hostelId = warden.hostelId;

    const studentCount = await User.countDocuments({ role: "student", hostelId });
    const staffCount = await User.countDocuments({ role: "staff", hostelId });

    const complaintSummary = await Complaint.aggregate([
      { $match: { hostelId } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);

    const escalatedComplaints = await Complaint.countDocuments({
      hostelId,
      status: "not-resolvable"
    });

    const rooms = await Room.find({ hostelId });
    const filled = rooms.filter(r => r.students.length > 0).length;
    const empty = rooms.filter(r => r.students.length === 0).length;

    const recentComplaints = await Complaint.find({ hostelId })
      .sort({ createdAt: -1 })
      .limit(5);

    const notices = await Notice.find().sort({ createdAt: -1 }).limit(5);

    return res.status(200).json({
      studentCount,
      staffCount,
      complaintSummary,
      escalatedComplaints,
      roomStats: { filled, empty },
      recentComplaints,
      notices
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getStaffDashboard = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id);
    const category = staff.staffType;

    const complaints = await Complaint.find({ category });

    const summary = {
      total: complaints.length,
      pending: complaints.filter(c => c.status === "pending").length,
      inProgress: complaints.filter(c => c.status === "in-progress").length,
      closed: complaints.filter(c => c.status === "closed").length,
      notResolvable: complaints.filter(c => c.status === "not-resolvable").length
    };

    const latest = await Complaint.find({ category })
      .sort({ createdAt: 1 })
      .limit(5);

    return res.status(200).json({ summary, latest });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getMessManagerDashboard = async (req, res) => {
  try {
    const surplus = await SurplusFood.find();

    const summary = {
      posted: surplus.length,
      available: surplus.filter(s => s.status === "available").length,
      claimed: surplus.filter(s => s.status === "claimed").length,
      expired: surplus.filter(s => s.status === "expired").length,
      distributed: surplus.filter(s => s.status === "distributed").length
    };

    const latest = await SurplusFood.find()
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({ summary, latest });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getNGODashboard = async (req, res) => {
  try {
    const ngoId = req.user.id;

    const available = await SurplusFood.find({ status: "available" });
    const claimed = await SurplusFood.find({ claimedBy: ngoId });

    const latest = await SurplusFood.find()
      .sort({ createdAt: -1 })
      .limit(5);

    return res.status(200).json({
      available,
      claimed,
      latest
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

