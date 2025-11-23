import Complaint from "../../models/complaint.model.js";
import { uploadToCloudinary } from "../../middlewares/uploadCloudinary.js";
import User from "../../models/user.model.js";


// ---------------------------------------------
// 1. STUDENT CREATES COMPLAINT
// ---------------------------------------------
export const createComplaint = async (req, res) => {
  try {
    const { description, category } = req.body;

    if (!description || !category) {
      return res.status(400).json({ message: "description & category required" });
    }

    // get student details
    const student = await User.findById(req.user.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // upload image if provided
    let imageUrl = null;
    if (req.file && req.file.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "complaints");
      imageUrl = uploaded.secure_url;
    }

    // Create complaint
    const complaint = await Complaint.create({
      description,
      category,
      createdBy: req.user.id,
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

// ---------------------------------------------
// 2. STAFF GET COMPLAINTS (FILTER + SORT) + ROOM DETAILS
// ---------------------------------------------
export const getStaffComplaints = async (req, res) => {
  try {
    const staff = await User.findById(req.user.id);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    if (!staff.staffType) {
      return res.status(403).json({ message: "You are not a staff member" });
    }

    const { hostelId } = req.query;

    if (!hostelId) {
      return res.status(400).json({ message: "hostelId is required" });
    }

    // Fetch complaints for staff category + hostel
    const complaints = await Complaint.find({
      category: staff.staffType,
      hostelId: hostelId,
      status: { $ne: "closed" }
    })
      .sort({ createdAt: 1 }) // oldest first
      .populate("createdBy", "name usn roomId")
      .populate({
        path: "createdBy",
        populate: {
          path: "roomId",
          select: "roomNumber floor type"
        }
      });

    return res.status(200).json({
      message: "Complaints fetched",
      complaints
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// -----------------------------------------------------------
// 3. STAFF UPDATES COMPLAINT STATUS + OPTIONAL IMAGE UPLOAD
// -----------------------------------------------------------
export const updateComplaintStatus = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status } = req.body;

    // Allowed statuses for staff
    const allowed = ["in-progress", "resolved", "not-resolvable"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status for staff" });
    }

    // Find complaint
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Staff category must match complaint category
    const staff = await User.findById(req.user.id);
    if (staff.staffType !== complaint.category) {
      return res.status(403).json({ message: "Not allowed for this complaint type" });
    }

    // Upload resolution image (optional)
    let resolutionImageUrl = complaint.resolutionImageUrl;

    if (req.file && req.file.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer, "complaints/resolution");
      resolutionImageUrl = uploaded.secure_url;
    }

    // Update based on status
    if (status === "resolved") {
      complaint.status = "closed"; // Auto-close
      complaint.resolutionImageUrl = resolutionImageUrl;
      complaint.handledBy = req.user.id;

    } else if (status === "not-resolvable") {
      complaint.status = "not-resolvable";
      complaint.handledBy = req.user.id;

    } else if (status === "in-progress") {
      complaint.status = "in-progress";
      complaint.handledBy = req.user.id;
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

// -----------------------------------------------------------
// 4. WARDEN GET ESCALATED (NOT-RESOLVABLE) COMPLAINTS
// -----------------------------------------------------------
export const getWardenComplaints = async (req, res) => {
  try {
    const warden = await User.findById(req.user.id);
    if (!warden || warden.role !== "warden") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Warden only sees complaints from HIS hostel
    const hostelId = warden.hostelId;

    const complaints = await Complaint.find({
      hostelId,
      status: "not-resolvable"
    })
      .sort({ createdAt: 1 }) // oldest first
      .populate("createdBy", "name usn roomId")
      .populate({
        path: "createdBy",
        populate: {
          path: "roomId",
          select: "roomNumber floor type"
        }
      })
      .populate("handledBy", "name staffType");

    return res.status(200).json({
      message: "Escalated complaints fetched",
      complaints
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// -----------------------------------------------------------
// 5. WARDEN CLOSES ESCALATED COMPLAINT
// -----------------------------------------------------------
export const wardenCloseComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { note } = req.body;

    const warden = await User.findById(req.user.id);
    if (!warden || warden.role !== "warden") {
      return res.status(403).json({ message: "Access denied" });
    }

    // Find complaint
    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    // Warden can close only his hostel complaints
    if (complaint.hostelId.toString() !== warden.hostelId.toString()) {
      return res.status(403).json({ message: "Not your hostel complaint" });
    }

    // Only not-resolvable complaints can be closed by warden
    if (complaint.status !== "not-resolvable") {
      return res.status(400).json({ message: "Only escalated complaints can be closed" });
    }

    // Close complaint
    complaint.status = "closed";
    complaint.wardenNote = note || null; // optional note
    await complaint.save();

    return res.status(200).json({
      message: "Complaint closed by warden",
      complaint
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// -----------------------------------------------------------
// 6. CHIEF WARDEN – VIEW + FILTER BY HOSTEL
// -----------------------------------------------------------
export const getChiefComplaints = async (req, res) => {
  try {
    const chief = await User.findById(req.user.id);

    if (!chief || chief.role !== "chiefWarden") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { hostelId } = req.query;

    let filter = {};

    // If hostelId is provided → filter
    if (hostelId) {
      filter.hostelId = hostelId;
    }

    // Retrieve complaints
    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 }) // newest first for chief
      .populate("createdBy", "name usn roomId hostelId")
      .populate({
        path: "createdBy",
        populate: {
          path: "roomId",
          select: "roomNumber floor type"
        }
      })
      .populate("handledBy", "name staffType");

    return res.status(200).json({
      message: "Chief complaints fetched",
      complaints
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 4. COMPLAINT SUMMARY (counts by status, optional breakdown by category)
// GET /api/reports/complaints/summary?hostelId=<>&from=YYYY-MM-DD&to=YYYY-MM-DD
export const getComplaintSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { hostelId: qHostelId, from, to } = req.query;

    // determine scope: chief sees all (unless hostelId provided), warden limited to his hostel
    let hostelId = qHostelId;
    if (user.role === "warden") hostelId = user.hostelId;

    // build match stage
    const match = {};
    if (hostelId) match.hostelId = mongoose.Types.ObjectId(hostelId);
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ];

    const result = await Complaint.aggregate(pipeline);

    // convert to object { pending: n, in-progress: m, closed: p, ... }
    const summary = {};
    result.forEach(r => (summary[r._id] = r.count));

    // optional breakdown by category
    const byCategory = await Complaint.aggregate([
      { $match: match },
      {
        $group: {
          _id: { category: "$category", status: "$status" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.category": 1 } }
    ]);

    return res.status(200).json({ message: "Complaint summary", summary, byCategory });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 5. COMPLAINT TREND (monthly) - GET /api/reports/complaints/trend?hostelId=&months=6
export const getComplaintTrendByMonth = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const months = parseInt(req.query.months, 10) || 6; // last N months
    let hostelId = req.query.hostelId;
    if (user.role === "warden") hostelId = user.hostelId;

    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    const match = { createdAt: { $gte: start } };
    if (hostelId) match.hostelId = mongoose.Types.ObjectId(hostelId);

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ];

    const rows = await Complaint.aggregate(pipeline);

    // fill missing months with 0
    const labels = [];
    const counts = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const keyYear = d.getFullYear();
      const keyMonth = d.getMonth() + 1;
      labels.push(`${keyYear}-${String(keyMonth).padStart(2, "0")}`);

      const found = rows.find(r => r._id.year === keyYear && r._id.month === keyMonth);
      counts.push(found ? found.count : 0);
    }

    return res.status(200).json({ message: "Complaint trend", labels, counts });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 6. DETAILED COMPLAINT LIST with filters
// GET /api/reports/complaints/list?hostelId=&status=&category=&from=&to=&page=&limit=
export const getComplaintsList = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { status, category, from, to, hostelId: qHostelId, page = 1, limit = 50 } = req.query;

    let hostelId = qHostelId;
    if (user.role === "warden") hostelId = user.hostelId;

    const filter = {};
    if (hostelId) filter.hostelId = mongoose.Types.ObjectId(hostelId);
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const complaints = await Complaint.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("createdBy", "name usn roomId")
      .populate({
        path: "createdBy",
        populate: { path: "roomId", select: "roomNumber floor type" }
      })
      .populate("handledBy", "name staffType");

    const total = await Complaint.countDocuments(filter);

    return res.status(200).json({ message: "Complaints list", complaints, total, page: Number(page), limit: Number(limit) });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
