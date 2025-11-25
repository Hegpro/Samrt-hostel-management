import Room from "../../models/room.model.js";
import Hostel from "../../models/hostel.model.js";
import User from "../../models/user.model.js";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import fs from "fs";

// -----------------------------------------------------------
// 1. GET ROOM OCCUPANCY (CHIEF + WARDEN)
// -----------------------------------------------------------
export const getRoomOccupancy = async (req, res) => {
  try {
    const { hostelId } = req.query;
    const user = await User.findById(req.user.id);

    let finalHostelId = hostelId;

    // Warden sees only his hostel
    if (user.role === "warden") {
      finalHostelId = user.hostelId;
    }

    // Chief can view all hostels
    let hostels = [];
    if (!finalHostelId) {
      hostels = await Hostel.find();
    } else {
      hostels = await Hostel.find({ _id: finalHostelId });
    }

    const report = [];

    for (let h of hostels) {
      const rooms = await Room.find({ hostelId: h._id }).populate("occupants", "name usn");

      report.push({
        hostelName: h.name,
        hostelId: h._id,
        rooms
      });
    }

    return res.status(200).json({
      message: "Room occupancy report generated",
      report
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// -----------------------------------------------------------
// 2. EXPORT STUDENT LIST TO EXCEL (WARDEN + CHIEF)
// -----------------------------------------------------------
export const exportStudentListExcel = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let students;

    if (user.role === "warden") {
      // Warden → only their hostel
      students = await User.find({ role: "student", hostelId: user.hostelId })
        .populate("hostelId", "name")
        .populate("roomId", "roomNumber");
    } else {
      // Chief → all students from all hostels
      students = await User.find({ role: "student" })
        .populate("hostelId", "name")
        .populate("roomId", "roomNumber");
    }

    // Create Excel file
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Student List");

    // Column differences
    if (user.role === "chiefWarden") {
      sheet.addRow(["Name", "USN", "Hostel", "Room", "Signature"]);
    } else {
      sheet.addRow(["Name", "USN", "Room", "Signature"]);
    }

    // Insert rows
    students.forEach((s) => {
      if (!s.roomId) return;

      if (user.role === "chiefWarden") {
        sheet.addRow([
          s.name,
          s.usn,
          s.hostelId?.name || "",
          s.roomId?.roomNumber || "",
          ""
        ]);
      } else {
        sheet.addRow([s.name, s.usn, s.roomId?.roomNumber || "", ""]);
      }
    });

    const fileName = `student_list_${Date.now()}.xlsx`;
    await workbook.xlsx.writeFile(fileName);

    return res.download(fileName, () => fs.unlinkSync(fileName));

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};



// -----------------------------------------------------------
// 3. EXPORT STUDENT LIST TO PDF (WARDEN + CHIEF)
// -----------------------------------------------------------
export const exportStudentListPDF = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    let students;

    if (user.role === "warden") {
      students = await User.find({ role: "student", hostelId: user.hostelId })
        .populate("hostelId", "name")
        .populate("roomId", "roomNumber");
    } else {
      students = await User.find({ role: "student" })
        .populate("hostelId", "name")
        .populate("roomId", "roomNumber");
    }

    const fileName = `student_list_${Date.now()}.pdf`;
    const doc = new PDFDocument({ margin: 40 });

    doc.pipe(fs.createWriteStream(fileName));

    doc.fontSize(20).text("Student Allocation Report", { underline: true });
    doc.moveDown();

    if (user.role === "chiefWarden") {
      doc.fontSize(12).text("Name | USN | Hostel | Room | Signature");
      doc.moveDown();
      doc.moveDown();
    } else {
      doc.fontSize(12).text("Name | USN | Room | Signature");
      doc.moveDown();
      doc.moveDown();
    }

    students.forEach((s) => {
      if (!s.roomId) return;

      if (user.role === "chiefWarden") {
        doc.fontSize(11).text(
          `${s.name} | ${s.usn} | ${s.hostelId?.name || ""} | ${s.roomId.roomNumber} | ____________`
        );
      } else {
        doc.fontSize(11).text(
          `${s.name} | ${s.usn} | ${s.roomId.roomNumber} | ____________`
        );
      }
      doc.moveDown();
    });

    doc.end();

    doc.on("finish", () => {
      res.download(fileName, () => fs.unlinkSync(fileName));
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};
