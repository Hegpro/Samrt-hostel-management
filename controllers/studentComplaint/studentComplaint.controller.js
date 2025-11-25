// controllers/studentComplaint/studentComplaint.controller.js
import User from "../../models/user.model.js";
import StudentComplaint from "../../models/studentComplaint.model.js";

// 1) Warden / Chief creates a student complaint by USN
export const createStudentComplaint = async (req, res) => {
  try {
    const { usn, title, description } = req.body;
    if (!usn || !title || !description) {
      return res.status(400).json({ message: "usn, title and description are required" });
    }

    // find student
    const student = await User.findOne({ role: "student", usn });
    if (!student) return res.status(404).json({ message: "Student not found" });

    // find parent if exists (linkedStudent used in your DB)
    const parent = await User.findOne({ role: "parent", linkedStudent: student._id });

    // create complaint
    const complaint = await StudentComplaint.create({
      studentId: student._id,
      parentId: parent?._id || null,
      raisedBy: req.user.id,
      raisedRole: req.user.role,
      title,
      description
    });

    return res.status(201).json({ message: "Student complaint created", complaint });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 2) Parent lists complaints about their child
export const getParentStudentComplaints = async (req, res) => {
  try {
    const parent = await User.findById(req.user.id);
    if (!parent || parent.role !== "parent") {
      return res.status(403).json({ message: "Access denied" });
    }

    const complaints = await StudentComplaint.find({ parentId: parent._id })
      .sort({ createdAt: -1 })
      .populate("studentId", "name usn")
      .populate("raisedBy", "name role");

    return res.status(200).json({ message: "Complaints fetched", complaints });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// 3) Warden / Chief closes complaint
export const closeStudentComplaint = async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { note } = req.body;

    const complaint = await StudentComplaint.findById(complaintId);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    if (!["warden", "chiefWarden"].includes(req.user.role)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // ensure warden only closes complaints for their hostel's students (optional)
    if (req.user.role === "warden") {
      const warden = await User.findById(req.user.id);
      if (!warden) return res.status(403).json({ message: "Unauthorized" });
      const student = await User.findById(complaint.studentId).select("hostelId");
      if (!student) return res.status(404).json({ message: "Student not found" });
      if (String(student.hostelId) !== String(warden.hostelId)) {
        return res.status(403).json({ message: "Not your hostel complaint" });
      }
    }

    complaint.status = "closed";
    complaint.closedBy = req.user.id;
    complaint.closedNote = note || null;
    await complaint.save();

    return res.status(200).json({ message: "Complaint closed", complaint });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
