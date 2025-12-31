// controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";
import Hostel from "../models/hostel.model.js";
import { generatePassword } from "../utils/password.js";
import { sendEmail } from "../utils/email.js";

const SALT_ROUNDS = 10;
const JWT_EXP = "7d";

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: JWT_EXP });

// PUBLIC: login by email or USN (student)
export const login = async (req, res) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: "Provide identifier and password" });
    }

    let user = null;

    // -----------------------------------------
    // 1. If ROLE IS PARENT — special handling
    // -----------------------------------------
    if (role === "parent") {
      user = await User.findOne({ role: "parent", usn: identifier });
    }

    // -----------------------------------------
    // 2. If ROLE IS NOT PARENT — normal flow
    // -----------------------------------------
    if (!user) {
      // Try email
      user = await User.findOne({ email: identifier });

      // Try USN (student login)
      if (!user) user = await User.findOne({ usn: identifier });

      // Try phone (staff login)
      if (!user) user = await User.findOne({ phone: identifier });
    }

    // -----------------------------------------
    // 3. User not found
    // -----------------------------------------
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // -----------------------------------------
    // 4. Validate password
    // -----------------------------------------
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // -----------------------------------------
    // 5. Generate Token
    // -----------------------------------------
    const token = signToken(user);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// CHIEF: create warden (chiefWarden only)
export const createWarden = async (req, res) => {
  try {
    const { name, email, phone, hostelId } = req.body;
    if (!name || !email || !hostelId) return res.status(400).json({ message: "name, email and hostelId required" });

    // ensure unique email
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const rawPass = generatePassword(10);
    const hashed = await bcrypt.hash(rawPass, SALT_ROUNDS);

    const warden = await User.create({
      name, email, phone, hostelId, password: hashed, role: "warden", createdBy: req.user.id, tempPassword: true
    });

    // respond with generated password so chief can screenshot
    return res.status(201).json({ message: "Warden created", warden: { id: warden._id, email: warden.email }, password: rawPass });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// WARDEN: create staff
export const createStaff = async (req, res) => {
  try {
    const { name, phone, email, staffType } = req.body;

    if (!name) return res.status(400).json({ message: "name required" });
    if (!email) return res.status(400).json({ message: "Email required" });
    if (!staffType) return res.status(400).json({ message: "staffType required" });

    // FETCH WARDEN TO GET hostelId
    const warden = await User.findById(req.user.id);
    if (!warden || warden.role !== "warden") {
      return res.status(403).json({ message: "Only warden can create staff" });
    }

    const rawPass = generatePassword(8);
    const hashed = await bcrypt.hash(rawPass, SALT_ROUNDS);

    const staff = await User.create({
      name,
      phone,
      email,
      role: "staff",
      staffType,
      password: hashed,
      hostelId: warden.hostelId,
      createdBy: req.user.id,
      tempPassword: true
    });

    return res.status(201).json({
      message: "Staff created",
      staff: {
        id: staff._id,
        name: staff.name,
        email: staff.email,
        staffType: staff.staffType
      },
      password: rawPass
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// CHIEF: create student + assign room
export const createStudent = async (req, res) => {
  try {
    const { name, usn, phone, email, roomId } = req.body;

    // 1. Validate room
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });

    if (room.occupants.length >= room.capacity) {
      return res.status(400).json({ message: "Room is already full" });
    }

    // 2. Generate ONE password — for both student AND parent
    const plainPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 3. Create student
    const student = await User.create({
      name,
      usn,
      phone,
      email,
      role: "student",
      hostelId: room.hostelId,
      roomId: room._id,
      password: hashedPassword,
      tempPassword: true,
      createdBy: req.user.id
    });

    // Add student into room
    room.occupants.push(student._id);
    await room.save();

    // 4. Create parent using SAME login credentials (shared)
    const parent = await User.create({
      name: `${student.name}'s Parent`,
      role: "parent",
      
      // Parent uses student USN to login
      usn: student.usn,

      linkedStudent: student._id,

      // Attach same hostel/room as student
      hostelId: student.hostelId,
      roomId: student.roomId,

      // Use the SAME password
      password: hashedPassword,
      tempPassword: true,

      createdBy: req.user.id
    });

    return res.status(201).json({
      message: "Student & Parent created successfully",
      studentPassword: plainPassword,   // same as parent
      parentPassword: plainPassword     // same password
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// CHIEF: create mess manager
export const createMessManager = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "name and email required" });
    }

    // ensure email unique
    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // generate password
    const rawPass = generatePassword(10);
    const hashed = await bcrypt.hash(rawPass, 10);

    const messManager = await User.create({
      name,
      email,
      phone,
      role: "messManager",
      password: hashed,
      createdBy: req.user.id,
      tempPassword: true
    });

    return res.status(201).json({
      message: "Mess Manager created",
      manager: {
        id: messManager._id,
        email: messManager.email,
        name: messManager.name
      },
      password: rawPass
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// NGO: public register (self signup)
export const sendNGOVerificationCode = async (req, res) => {
  try {
    const { email, name } = req.body;

    if (!email || !name)
      return res.status(400).json({ message: "name and email required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const code = crypto.randomInt(100000, 999999).toString();

    // store OTP temporarily (no password yet)
    await User.create({
      name,
      email,
      role: "ngo",
      password: "TEMP",         // placeholder, will update after OTP verification
      emailVerificationCode: code,
      emailVerificationExpiry: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      tempPassword: true,
      emailVerified: false
    });

    // send OTP
    await sendEmail({
      to: email,
      subject: "NGO Verification Code",
      text: `Your NGO verification code is ${code}`
    });

    return res.json({ message: "Verification code sent to email" });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const registerNGO = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const hashed = await bcrypt.hash(password, 10);

    const ngo = await User.create({
      name,
      email,
      phone,
      password: hashed,
      role: "ngo",
    });

    res.status(201).json({ message: "NGO registered", ngo });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const verifyNGOCodeAndRegister = async (req, res) => {
  try {
    const { email, code, password } = req.body;

    if (!email || !code || !password)
      return res.status(400).json({ message: "email, code & password required" });

    const ngo = await User.findOne({ email });
    if (!ngo) return res.status(400).json({ message: "NGO not found" });

    if (!ngo.emailVerificationCode || ngo.emailVerificationExpiry < new Date())
      return res.status(400).json({ message: "OTP expired" });

    if (ngo.emailVerificationCode !== code)
      return res.status(400).json({ message: "Invalid code" });

    // Save real password
    ngo.password = await bcrypt.hash(password, 10);
    ngo.emailVerificationCode = null;
    ngo.emailVerificationExpiry = null;
    ngo.emailVerified = true;
    await ngo.save();

    return res.json({ message: "NGO registered successfully" });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};




// change password (provide oldPassword) - authenticated
export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ message: "oldPassword and newPassword required" });

    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ message: "Old password incorrect" });

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.tempPassword = false;
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// request password change via email OTP: generate code and send
// export const sendPasswordResetCode = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({ message: "Email is required" });
//     }

//     // Find user by email
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ message: "No account found with this email" });
//     }

//     // 6-digit OTP
//     const code = Math.floor(100000 + Math.random() * 900000).toString();

//     // Expiry: 15 minutes
//     const expiryMinutes = Number(process.env.RESET_CODE_EXPIRY_MIN || 15);
//     const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);

//     // Store in database
//     user.emailVerificationCode = code;
//     user.emailVerificationExpiry = expiry;
//     await user.save();

//     // Send email
//     await sendEmail({
//       to: email,
//       subject: "Smart Hostel – Password Reset Code",
//       html: `
//         <p>Hello ${user.name},</p>
//         <p>Your password reset code is:</p>
//         <h2>${code}</h2>
//         <p>This code will expire in ${expiryMinutes} minutes.</p>
//         <p>If you didn't request this, please ignore this email.</p>
//       `
//     });
//
//     return res.json({ message: "Password reset code sent to email" });
//   } catch (err) {
//     console.error("Reset Code Error:", err);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

//seperate send mail
export const sendPasswordResetCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Expiry time
    const expiryMinutes = Number(process.env.RESET_CODE_EXPIRY_MIN || 15);
    const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save OTP
    user.emailVerificationCode = code;
    user.emailVerificationExpiry = expiry;
    await user.save();

    // Email content
    const subject = "Smart Hostel – Password Reset Code";
    const text = `Your password reset code is ${code}. It expires in ${expiryMinutes} minutes.`;
    const html = `
      <p>Hello ${user.name},</p>
      <p>Your password reset code is:</p>
      <h2>${code}</h2>
      <p>This code will expire in ${expiryMinutes} minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    // ✅ Correct API call
    await sendEmail(email, subject, text, html);

    return res.status(200).json({
      message: "Password reset code sent successfully",
    });

  } catch (error) {
    console.error("Reset Code Error:", error.response?.data || error.message);
    return res.status(500).json({ message: "Failed to send reset code" });
  }
};


// GET LOGGED-IN USER DETAILS
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("name email phone role usn hostelId roomId");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ user });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};


// verify code and change password (no oldPassword required)
export const verifyCodeAndChangePassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ message: "Email, code and newPassword are required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "No account found with this email" });
    }

    // Check if code exists
    if (!user.emailVerificationCode || !user.emailVerificationExpiry) {
      return res.status(400).json({ message: "No reset request found" });
    }

    // Check code match
    if (user.emailVerificationCode !== code) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    // Check expiry
    if (new Date() > new Date(user.emailVerificationExpiry)) {
      return res.status(400).json({ message: "Reset code has expired" });
    }

    // Hash new password
    const hashed = await bcrypt.hash(newPassword, 10);

    // Save new password
    user.password = hashed;

    // Clear fields
    user.emailVerificationCode = null;
    user.emailVerificationExpiry = null;
    user.tempPassword = false;

    await user.save();

    return res.json({ message: "Password changed successfully" });

  } catch (err) {
    console.error("Password Reset Error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getStaffList = async (req, res) => {
  try {
    // Get the warden record
    const warden = await User.findById(req.user.id);

    if (!warden) {
      return res.status(404).json({ message: "Warden not found" });
    }

    // Find all staff in the same hostel
    const staff = await User.find({
      role: "staff",
      hostelId: warden.hostelId,   // ⭐ Main filter change
    }).select("name email phone staffType hostelId createdAt");

    return res.json({ staff });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({ message: "Staff not found" });
    }

    return res.status(200).json({ message: "Staff deleted successfully" });
  } catch (err) {
    console.error("Delete Staff Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const getWardenStudents = async (req, res) => {
  try {
    // Base filter: all users with role "student"
    const filter = { role: "student" };

    // Optional: filter students by warden hostelId
    if (req.user && req.user.hostelId) {
      filter.hostelId = req.user.hostelId;
    }

    // Populate actual room number instead of objectId
    const students = await User.find(filter)
      .populate("roomId", "roomNumber") // <- IMPORTANT CHANGE
      .select("name email phone usn year branch status roomId"); // added roomId for mapping

    return res.status(200).json({ students });

  } catch (error) {
    console.error("getWardenStudents error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteStudent = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student first
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const roomId = student.roomId;

    // Delete parent linked to this student
    await User.findOneAndDelete({ linkedStudent: studentId });

    // Delete the student
    await User.findByIdAndDelete(studentId);

    // Update the room if student was assigned
    if (roomId) {
      await Room.findByIdAndUpdate(roomId, {
        $pull: { occupants: studentId }, // remove student Id from array
        $inc: { occupied: -1 } // decrease the count
      });
    }

    return res.status(200).json({ message: "Student & linked parent removed successfully" });

  } catch (error) {
    console.error("deleteStudent error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};



import mongoose from "mongoose";
export const getStudentsByRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ message: "Room ID is required" });
    }

    // Find students assigned to this room
    const students = await User.find({
      role: "student",
      roomId: new mongoose.Types.ObjectId(roomId)   // FIX HERE
    })
    .populate("roomId", "roomNumber floor capacity")
    .select("name email phone usn status roomId");

    return res.status(200).json({
      message: "Students fetched successfully",
      students,
    });

  } catch (error) {
    console.error("Error fetching students by room:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllWardens = async (req, res) => {
  try {
    const wardens = await User.find({ role: "warden" })
      .select("name email phone role hostelId createdAt")
      .populate("hostelId", "name");

    return res.status(200).json({
      message: "Wardens fetched successfully",
      wardens,
    });

  } catch (error) {
    console.error("getAllWardens error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllMessManagers = async (req, res) => {
  try {
    const managers = await User.find({ role: "messManager" })
      .select("name email phone role hostelId createdAt");

    return res.status(200).json({
      message: "Mess Managers fetched successfully",
      managers,
    });

  } catch (error) {
    console.error("getAllMessManagers error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteWarden = async (req, res) => {
  try {
    const { wardenId } = req.params;

    const deleted = await User.findOneAndDelete({
      _id: wardenId,
      role: "warden"
    });

    if (!deleted) return res.status(404).json({ message: "Warden not found" });

    return res.status(200).json({
      message: "Warden deleted successfully",
      deleted
    });

  } catch (error) {
    console.error("deleteWarden error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteMessManager = async (req, res) => {
  try {
    const { messManagerId } = req.params;

    const deleted = await User.findOneAndDelete({
      _id: messManagerId,
      role: "messManager"   // Correct based on your DB
    });
    console.log("DELETE HIT", req.params);
    if (!deleted) {
      return res.status(404).json({ message: "Mess Manager not found" });
    }

    return res.status(200).json({
      message: "Mess Manager deleted successfully",
      deleted,
    });

  } catch (error) {
    console.error("deleteMessManager error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getAllHostels = async (req, res) => {
  try {
    const hostels = await Hostel.find().select("name totalFloors");

    return res.status(200).json({
      message: "Hostels fetched successfully",
      hostels,
    });
  } catch (error) {
    console.error("getAllHostels error:", error);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const parentLogin = async (req, res) => {
  try {
    const { usn, password } = req.body;

    if (!usn || !password) {
      return res.status(400).json({ message: "USN and password are required" });
    }

    // 1️⃣ Find student by USN (or email if needed)
    const student = await User.findOne({
      usn: usn,
      role: "student",
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found for this USN" });
    }

    // 2️⃣ Find parent linked to this student
    const parent = await User.findOne({
      role: "parent",
      linkedStudent: student._id,
    });

    if (!parent) {
      return res.status(404).json({
        message: "Parent account not created for this student",
      });
    }

    // 3️⃣ Validate password
    const isMatch = await bcrypt.compare(password, parent.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // 4️⃣ Issue token
    const token = jwt.sign(
      { id: parent._id, role: "parent" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      message: "Parent login successful",
      token,
      user: {
        id: parent._id,
        name: parent.name,
        studentUsn: student.usn,
        role: "parent",
      },
    });

  } catch (err) {
    console.error("Parent login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


