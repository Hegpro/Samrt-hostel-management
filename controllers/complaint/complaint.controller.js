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
