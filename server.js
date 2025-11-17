import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import cors from "cors";
import routes from "./routes/index.js";

dotenv.config();
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// API routes
app.use("/api", routes);

// default route
app.get("/", (req, res) => res.send("Smart Hostel Backend Running ✅"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
