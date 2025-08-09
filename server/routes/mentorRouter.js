const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");
const Request = require("../models/Request");

const router = express.Router();

// Get all mentors (for students to choose from)
router.get("/", authMiddleware, roleMiddleware(["student"]), async (req, res) => {
  try {
    const mentors = await User.find({ role: "mentor" }).select("-password -recoveryCode -resetPasswordToken -resetPasswordExpires -idNumber").lean();
    for (let mentor of mentors) {
      const studentCount = await User.countDocuments({ mentor: mentor._id });
      mentor.students = studentCount;
    }
    res.json(mentors);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Get all requests for a mentor
router.get("/requests", authMiddleware, roleMiddleware(["mentor"]), async (req, res) => {
    try {
        const requests = await Request.find({ mentor: req.user.id }).populate("student", "fullName");
        res.json(requests);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Student gets their own request
router.get("/my-request", authMiddleware, roleMiddleware(["student"]), async (req, res) => {
    try {
        const request = await Request.findOne({ student: req.user.id }).sort({ date: -1 }).populate("mentor", "fullName");
        res.json(request);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// Mentor gets their students
router.get("/my-students", authMiddleware, roleMiddleware(["mentor"]), async (req, res) => {
    try {
        const students = await User.find({ mentor: req.user.id }).select("-password -recoveryCode -resetPasswordToken -resetPasswordExpires");
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;