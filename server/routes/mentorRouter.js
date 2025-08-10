const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");

const router = express.Router();

// Get all mentors (for students to choose from)
router.get("/", authMiddleware, roleMiddleware(["student", "hod"]), async (req, res) => {
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