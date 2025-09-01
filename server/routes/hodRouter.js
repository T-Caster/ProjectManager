const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");
const User = require("../models/User");

const { getIo } = require("../services/socketManager");
const router = express.Router();

// HOD gets all users
router.get("/users", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// HOD updates a user's profile
router.put("/users/:id", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const { email, idNumber, role } = req.body;
    const updates = {};

    // Prevent a HOD from changing their own role
    if (String(req.params.id) === String(req.user._id) && role && role !== "hod") {
      return res.status(403).json({ error: "HODs cannot change their own role" });
    }

    if (email) updates.email = email;
    if (idNumber) updates.idNumber = idNumber;
    if (role) {
      if (!["student", "mentor", "hod"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      updates.role = role;
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Emit a socket event to notify clients of the user update
    getIo().emit("userUpdated", user);

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// HOD gets all students
router.get("/students", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const students = await User.find({ role: "student" }).populate("mentor", "fullName profilePic");
    res.json(students);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.put("/users/:id/role", authMiddleware, roleMiddleware(["hod"]), async (req, res) => {
  try {
    const { role } = req.body;
    if (!["student", "mentor", "hod"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    // Prevent a HOD from demoting themselves
    if (String(req.params.id) === String(req.user._id) && role !== "hod") {
      return res.status(403).json({ error: "HODs cannot change their own role" });
    }
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
