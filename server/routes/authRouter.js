const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const mailClient = require("../services/mail");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

const router = express.Router();

const upload = multer({
  dest: path.join(__dirname, "../uploads"),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  }
});

// Register route with optional profile picture
router.post("/register", upload.single("profilePic"), async (req, res) => {
  const { fullName, email, idNumber, password } = req.body;
  try {
    const existing = await User.findOne({ idNumber });
    if (existing) return res.status(400).json({ error: "User already exists" });
    const hashedPassword = await bcrypt.hash(password, 10);

    let profilePic = "uploads/default.png";
    if (req.file) {
      profilePic = path.join("uploads", req.file.filename);
    }

    const user = await User.create({ fullName, email, idNumber, password: hashedPassword, profilePic });
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  const { idNumber, password } = req.body;
  try {
    const user = await User.findOne({ idNumber });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/forgot-password", async (req, res) => {
  const { idNumber } = req.body;
  try {
    const user = await User.findOne({ idNumber });
    if (!user) return res.status(404).json({ error: "User not found" });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.recoveryCode = code;
    await user.save();

    await mailClient.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: { Email: process.env.EMAIL, Name: "Project Manager" },
          To: [{ Email: user.email, Name: user.fullName }],
          Subject: "Password Reset Code",
          TextPart: `Your recovery code is: ${code}`,
        },
      ],
    });

    res.json({ message: "Recovery code sent" });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email" });
  }
});

router.post("/reset-password", async (req, res) => {
  const { idNumber, recoveryCode, password } = req.body;
  try {
    const user = await User.findOne({ idNumber });
    if (!user || user.recoveryCode !== recoveryCode) {
      return res.status(400).json({ error: "Invalid recovery code" });
    }
    user.password = await bcrypt.hash(password, 10);
    user.recoveryCode = undefined;
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.delete("/delete-user", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  try {
    await User.findByIdAndDelete(userId);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user", error: err.message });
  }
});

// Get current user info (without sensitive data)
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password -recoveryCode");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/protected", authMiddleware, (req, res) => {
  res.json({ message: "Access granted" });
});

// Route to upload/update profile picture
router.post("/upload-profile-pic", authMiddleware, upload.single("profilePic"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const profilePic = path.join("uploads", req.file.filename);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic },
      { new: true }
    ).select("-password -recoveryCode");
    res.json({ message: "Profile picture updated", profilePic: user.profilePic });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile picture" });
  }
});

// Reset profile picture to default
router.post("/reset-profile-pic", authMiddleware, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic: "uploads/default.png" },
      { new: true }
    ).select("-password -recoveryCode");
    res.json({ message: "Profile picture reset", profilePic: user.profilePic });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset profile picture" });
  }
});

// Edit profile (except role)
router.put("/edit-profile", authMiddleware, async (req, res) => {
  try {
    const updates = {};
    const allowedFields = ["fullName", "email", "idNumber", "password"];
    allowedFields.forEach(field => {
      if (req.body[field]) updates[field] = req.body[field];
    });

    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true }
    ).select("-password -recoveryCode");

    res.json({ message: "Profile updated", user });
  } catch (err) {
    res.status(500).json({ error: "Failed to update profile" });
  }
});

module.exports = router;
