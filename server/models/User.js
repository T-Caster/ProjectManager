const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  idNumber: { type: String, unique: true, maxLength: 9, minLength: 9 },
  role: { type: String, enum: ["student", "mentor", "hod"], default: 'student' },
  password: String,
  recoveryCode: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePic: { type: String, default: "uploads/default.png" }
});

module.exports = mongoose.model('User', userSchema);