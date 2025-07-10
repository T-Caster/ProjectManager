const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  idNumber: { type: String, unique: true },
  password: String,
  recoveryCode: String
});

module.exports = mongoose.model('User', userSchema);