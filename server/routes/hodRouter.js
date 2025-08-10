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

router.put('/users/:id/role', authMiddleware, roleMiddleware(['hod']), async (req, res) => {
  try {
    const { role } = req.body;
    if (!['student', 'mentor', 'hod'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;