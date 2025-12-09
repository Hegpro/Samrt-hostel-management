// import "./config/env.js";
// import express from "express";

// import connectDB from "./config/db.js";
// import cors from "cors";
// import routes from "./routes/index.js";
// import "./cron/surplusExpiry.js";


// // debug: check env variables
// // console.log("===== ENV VARIABLES =====");
// // console.log("PORT:", process.env.PORT);
// // console.log("MONGO_URI:", process.env.MONGO_URI ? "********" : null);
// // console.log("JWT_SECRET:", process.env.JWT_SECRET ? "********" : null);
// // console.log("CLOUDINARY_CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
// // console.log("CLOUDINARY_API_KEY:", process.env.CLOUDINARY_API_KEY ? "********" : null);
// // console.log("CLOUDINARY_API_SECRET:", process.env.CLOUDINARY_API_SECRET ? "********" : null);
// // console.log("=========================");
// connectDB();

// const app = express();
// const allowedOrigin = [process.env.FRONTEND_URL, "https://smart-hostel-management-frontend-three.vercel.app"];
// app.use(cors({
//   origin: allowedOrigin,
//   credentials: true, // if you ever send cookies
// }));


// app.use(express.json());

// app.use((req, res, next) => {
//   console.log("REQUEST:", req.method, req.url);
//   next();
// });

// // API routes
// app.use("/api", routes);

// // default route
// app.get("/", (req, res) => res.send("Smart Hostel Backend Running "));

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
import "./config/env.js";
import express from "express";
import connectDB from "./config/db.js";
import cors from "cors";
import routes from "./routes/index.js";
import "./cron/surplusExpiry.js";

connectDB();

const app = express();

// Allowed frontend domains
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://smart-hostel-management-frontend-three.vercel.app",
  "http://localhost:3000"
];

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, server-to-server etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: "GET,POST,PUT,DELETE,PATCH,OPTIONS",
    allowedHeaders: "Content-Type,Authorization"
  })
);

// Preflight (OPTIONS) handling
app.options("*", cors());

app.use(express.json());

app.use((req, res, next) => {
  console.log("REQUEST:", req.method, req.url);
  next();
});

// All API routes
app.use("/api", routes);

// Default route
app.get("/", (req, res) => res.send("Smart Hostel Backend Running"));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
