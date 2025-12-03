import User from "../../models/user.model.js";
import Room from "../../models/room.model.js";
import Complaint from "../../models/complaint.model.js";
import StudentComplaint from "../../models/studentComplaint.model.js";
import SurplusFood from "../../models/surplus.model.js";
import Notice from "../../models/notice.model.js";

export const resetAcademicYear = async (req, res) => {
  try {
    const chief = await User.findById(req.user.id);

    if (!chief || chief.role !== "chiefWarden") {
      return res.status(403).json({ message: "Only Chief Warden can reset data" });
    }

// ---------- CONFIRMATION CHECK ----------

    const { confirm } = req.body;

    if (!confirm) {
      return res.status(400).json({
        message: "Confirmation code required. Send { \"confirm\": \"RESET-ACADEMIC-YEAR\" }"
      });
    }

    if (confirm !== "RESET-ACADEMIC-YEAR") {
      return res.status(400).json({
        message: "Incorrect confirmation code. Reset aborted."
      });
    }

    // -------------------------------------------
    // 1. DELETE ALL STUDENTS + PARENTS
    // -------------------------------------------
    await User.deleteMany({ role: "student" });
    await User.deleteMany({ role: "parent" });

    // -------------------------------------------
    // 2. DELETE ALL COMPLAINTS
    // -------------------------------------------
    await Complaint.deleteMany({});
    await StudentComplaint.deleteMany({});

    // -------------------------------------------
    // 3. DELETE ALL SURPLUS FOOD RECORDS
    // -------------------------------------------
    await SurplusFood.deleteMany({});

    // -------------------------------------------
    // 4. DELETE ALL NOTICES
    // -------------------------------------------
    await Notice.deleteMany({});

    // -------------------------------------------
    // 5. RESET ALL ROOMS (but keep room structure)
    // -------------------------------------------
    await Room.updateMany(
      {},
      {
        $set: {
          occupants: [],
          status: "available"
        }
      }
    );

    return res.status(200).json({
      message: "Academic year reset successful. Students, parents, complaints, surplus food, and notices cleared. Wardens & Staff retained."
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


