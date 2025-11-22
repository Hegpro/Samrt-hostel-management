import "./config/env.js";
import express from "express";

import connectDB from "./config/db.js";
import cors from "cors";
import routes from "./routes/index.js";
import "./cron/surplusExpiry.js";


// debug: check env variables
console.log("===== ENV VARIABLES =====");
console.log("PORT:", process.env.PORT);
console.log("MONGO_URI:", process.env.MONGO_URI ? "********" : null);
console.log("JWT_SECRET:", process.env.JWT_SECRET ? "********" : null);
console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "********" : null);
console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "********" : null);
console.log("=========================");
connectDB();

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

// API routes
app.use("/api", routes);

// default route
app.get("/", (req, res) => res.send("Smart Hostel Backend Running "));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
