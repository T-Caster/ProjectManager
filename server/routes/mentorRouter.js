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
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Mentor/HOD gets their students
router.get("/my-students", authMiddleware, roleMiddleware(["mentor", "hod"]), async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("-password -recoveryCode -resetPasswordToken -resetPasswordExpires");

    const baseQuery = me.role === "hod" ? { role: "student" } : { mentor: req.user.id, role: "student" };

    const students = await User.find(baseQuery)
      .select("-password -recoveryCode -resetPasswordToken -resetPasswordExpires")
      .populate("mentor", "fullName profilePic")
      .populate({
        path: "project",
        select: "mentor students name",
        populate: [
          { path: "mentor", select: "fullName profilePic" },
          { path: "students", select: "fullName profilePic idNumber" },
        ],
      })
      .lean();

    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
