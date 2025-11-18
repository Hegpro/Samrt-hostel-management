// scripts/seedChief.js
import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

const run = async () => {
  try {
    await connectDB();

    const email = process.env.CHEIF_EMAIL;
    const password = process.env.CHEIF_PASSWORD;
    const name = process.env.CHEIF_NAME || "Chief Warden";

    if (!email || !password) {
      console.log(" CHEIF_EMAIL or CHEIF_PASSWORD missing in .env");
      process.exit(1);
    }

    const exists = await User.findOne({ email });

    if (exists) {
      console.log("✔ Chief already exists:", email);
      process.exit(0);
    }

    const hashed = await bcrypt.hash(password, 10);

    const chief = await User.create({
      name,
      email,
      password: hashed,
      role: "chiefWarden",
      emailVerified: true,
      tempPassword: false
    });

    console.log(" Chief Warden Created Successfully");
    console.log("Login Email:", chief.email);
    console.log("Password:", password);

    process.exit(0);
  } catch (err) {
    console.error(" Error:", err.message);
    process.exit(1);
  }
};

run();
