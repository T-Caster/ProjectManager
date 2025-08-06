const express = require("express");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const emailjs = require("../services/mail");
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

    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const resetLink = `http://localhost:5173/reset-password/${token}`;

    const templateParams = {
      email: user.email,
      link: resetLink,
    };

    try {
      await emailjs.send("service_p1o7zyh", "template_o4gix3b", templateParams);
      console.log("Email sent successfully");
      res.json({ message: "Recovery email sent" });
    } catch (err) {
      console.error("Error sending password reset email:", err);
      res.status(500).json({ error: "Failed to send email" });
    }
  } catch (err) {
    console.error("Error sending password reset email:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to send email" });
  }
});

router.get("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Password reset token is invalid or has expired." });
    }

    res.json({ message: "Token is valid." });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const user = await User.findOne({
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ error: "Password reset token is invalid or has expired." });
    }

    const { password } = req.body;
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.recoveryCode = undefined; // Also clear the old recovery code if it exists
    await user.save();

    res.json({ message: "Password has been updated." });
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
    const user = await User.findById(req.user.id).populate("mentor", "fullName").select("-password -recoveryCode -resetPasswordToken -resetPasswordExpires");
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

// Get user by ID
router.get("/user/:id", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password -recoveryCode -resetPasswordToken -resetPasswordExpires -idNumber");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
