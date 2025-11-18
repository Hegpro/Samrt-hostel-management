// middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Protect routes - requires logged-in user
export const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ message: "Invalid token" });

    // Attach user to request
    req.user = { id: user._id.toString(), role: user.role };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorized" });
  }
};

// Allow only specific roles
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    console.log("Allowed roles:", roles);
    console.log("User role:", req.user.role);
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "You don't have permission" });
    }
    next();
  };
};
