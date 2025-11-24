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
// 2. EXPORT ROOM OCCUPANCY TO EXCEL
// -----------------------------------------------------------
export const exportRoomOccupancyExcel = async (req, res) => {
  try {
    const { hostelId } = req.query;
    const user = await User.findById(req.user.id);

    let finalHostelId = hostelId;
    if (user.role === "warden") {
      finalHostelId = user.hostelId;
    }

    const rooms = await Room.find({ hostelId: finalHostelId })
      .populate("students", "name usn");

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Room Occupancy");

    sheet.addRow(["Room Number", "Type", "Floor", "Students", "Count"]);

    rooms.forEach(room => {
      sheet.addRow([
        room.roomNumber,
        room.type,
        room.floor,
        room.students.map(s => `${s.name} (${s.usn})`).join(", "),
        room.students.length
      ]);
    });

    const fileName = `room_occupancy_${Date.now()}.xlsx`;

    await workbook.xlsx.writeFile(fileName);

    return res.download(fileName, fileName, () => {
      fs.unlinkSync(fileName);
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// -----------------------------------------------------------
// 3. EXPORT ROOM OCCUPANCY TO PDF
// -----------------------------------------------------------
export const exportRoomOccupancyPDF = async (req, res) => {
  try {
    const { hostelId } = req.query;
    const user = await User.findById(req.user.id);

    let finalHostelId = hostelId;
    if (user.role === "warden") {
      finalHostelId = user.hostelId;
    }

    const rooms = await Room.find({ hostelId: finalHostelId })
      .populate("students", "name usn");

    const fileName = `room_occupancy_${Date.now()}.pdf`;
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(fileName));

    doc.fontSize(18).text("Room Occupancy Report", { underline: true });
    doc.moveDown();

    rooms.forEach(room => {
      doc.fontSize(14).text(`Room: ${room.roomNumber}`);
      doc.text(`Type: ${room.type}`);
      doc.text(`Floor: ${room.floor}`);
      doc.text(`Students: ${room.students.map(s => `${s.name} (${s.usn})`).join(", ")}`);
      doc.moveDown();
    });

    doc.end();

    doc.on("finish", () => {
      res.download(fileName, fileName, () => {
        fs.unlinkSync(fileName);
      });
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
