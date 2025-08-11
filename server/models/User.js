const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  idNumber: { type: String, unique: true, maxLength: 9, minLength: 9 },
  phoneNumber: { type: String },
  role: { type: String, enum: ['student', 'mentor', 'hod'], default: 'student' },
  password: String,
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Removed: address, mobilePhone, endOfStudies
  // Contact/date info now lives on Proposal only

  // Project status
  isInProject: { type: Boolean, default: false },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

  // System fields
  recoveryCode: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePic: { type: String, default: 'uploads/default.png' },
});

module.exports = mongoose.model('User', userSchema);
