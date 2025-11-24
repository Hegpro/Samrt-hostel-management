// controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";
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
export const sendPasswordResetCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "No user with that email" });

    const code = crypto.randomInt(100000, 999999).toString();
    user.emailVerificationCode = code;
    user.emailVerificationExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await user.save();

    await sendEmail({ to: email, subject: "Password change verification code", text: `Your code is ${code}` });

    return res.json({ message: "Verification code sent to email" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// verify code and change password (no oldPassword required)
export const verifyCodeAndChangePassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) return res.status(400).json({ message: "email, code and newPassword required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "No user with that email" });

    if (!user.emailVerificationCode || user.emailVerificationExpiry < new Date())
      return res.status(400).json({ message: "Code expired or not present" });

    if (user.emailVerificationCode !== code) return res.status(400).json({ message: "Invalid code" });

    user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    user.emailVerificationCode = null;
    user.emailVerificationExpiry = null;
    user.tempPassword = false;
    await user.save();

    return res.json({ message: "Password changed via email verification" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
