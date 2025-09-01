const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  idNumber: { type: String, unique: true, maxLength: 9, minLength: 9 },
  phoneNumber: { type: String },
  role: { type: String, enum: ['student', 'mentor', 'hod'], default: 'student' },
  password: String,
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Project status
  isInProject: { type: Boolean, default: false },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },

  // System fields
  recoveryCode: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  profilePic: { type: String, default: 'uploads/default.png' },
});

// Modify the toJSON method to customize the JSON output
userSchema.set('toJSON', {
  transform: (doc, ret) => {
    // Do not send password hash to client
    delete ret.password;

    // Prepend server URL to profilePic
    if (ret.profilePic) {
      const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
      const picPath = ret.profilePic.replace(/\\/g, '/');
      ret.profilePic = `${serverUrl}/${picPath}`;
    }
    return ret;
  },
});

module.exports = mongoose.model('User', userSchema);
