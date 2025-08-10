const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");

const router = express.Router();

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