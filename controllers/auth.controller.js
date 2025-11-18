// controllers/auth.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/user.model.js";
import { generatePassword } from "../utils/password.js";
import { sendEmail } from "../utils/email.js";

const SALT_ROUNDS = 10;
const JWT_EXP = "7d";

const signToken = (user) => jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: JWT_EXP });

// PUBLIC: login by email or USN (student)
export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or USN
    if (!identifier || !password) return res.status(400).json({ message: "Provide identifier and password" });

    let user = await User.findOne({ email: identifier });
    if (!user) user = await User.findOne({ usn: identifier });

    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Invalid credentials" });

    const token = signToken(user);
    return res.json({ message: "Login successful", token, user: { id: user._id, name: user.name, role: user.role } });
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

// WARDEN: create staff (no email required)
export const createStaff = async (req, res) => {
  try {
    const { name, phone, designation } = req.body;
    if (!name) return res.status(400).json({ message: "name required" });

    const rawPass = generatePassword(8);
    const hashed = await bcrypt.hash(rawPass, SALT_ROUNDS);

    const staff = await User.create({
      name, phone, role: "staff", password: hashed, createdBy: req.user.id, tempPassword: true
    });

    return res.status(201).json({ message: "Staff created", staff: { id: staff._id, name: staff.name }, password: rawPass });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// CHIEF: create student (with USN + room)
export const createStudent = async (req, res) => {
  try {
    const { name, usn, email, phone, hostelId, roomId } = req.body;
    if (!name || !usn || !hostelId || !roomId) return res.status(400).json({ message: "name, usn, hostelId and roomId required" });

    // ensure usn unique
    const existsUSN = await User.findOne({ usn });
    if (existsUSN) return res.status(400).json({ message: "USN already used" });

    const rawPass = generatePassword(10);
    const hashed = await bcrypt.hash(rawPass, SALT_ROUNDS);

    const student = await User.create({
      name, usn, email: email || null, phone, hostelId, roomId, role: "student", password: hashed, createdBy: req.user.id, tempPassword: true
    });

    // create parent user linked to student with same credentials (parent has same password and maybe email provided)
    let parent = null;
    if (req.body.parentName) {
      parent = await User.create({
        name: req.body.parentName,
        email: req.body.parentEmail || null,
        phone: req.body.parentPhone || null,
        role: "parent",
        password: hashed,
        createdBy: req.user.id,
        linkedStudent: student._id,
        tempPassword: true
      });
    }

    return res.status(201).json({
      message: "Student created",
      student: { id: student._id, usn: student.usn },
      password: rawPass,
      parent: parent ? { id: parent._id } : null
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

// NGO: public register (self signup)
export const registerNGO = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: "name, email, password required" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: "Email already exists" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const ngo = await User.create({ name, email, password: hashed, role: "ngo", createdBy: null, tempPassword: false, emailVerified: true });

    return res.status(201).json({ message: "NGO registered", ngo: { id: ngo._id, email: ngo.email } });
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
