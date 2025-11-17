import express from "express";
const router = express.Router();

// example route
router.post("/login", (req, res) => {
  res.send("Login works");
});

export default router;   // Export the router to be used in other parts of the application
