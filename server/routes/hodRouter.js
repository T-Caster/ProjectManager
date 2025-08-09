const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");
const Request = require("../models/Request");

const router = express.Router();

// HOD gets all requests
router.get("/requests", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const requests = await Request.find().populate("student", "fullName").populate("mentor", "fullName");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// HOD gets all students
router.get('/students', authMiddleware, roleMiddleware(['hod']), async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).populate('mentor', 'fullName');
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
module.exports = router;