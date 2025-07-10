const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mailClient = require('../services/mail');

const registerUser = async (req, res) => {
  const { fullName, email, idNumber, password } = req.body;
  try {
    const existing = await User.findOne({ idNumber });
    if (existing) return res.status(400).json({ error: 'User already exists' });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ fullName, email, idNumber, password: hashedPassword });
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const loginUser = async (req, res) => {
  const { idNumber, password } = req.body;
  try {
    const user = await User.findOne({ idNumber });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  const { idNumber } = req.body;
  try {
    const user = await User.findOne({ idNumber });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    user.recoveryCode = code;
    await user.save();

    await mailClient.post('send', { version: 'v3.1' }).request({
      Messages: [
        {
          From: { Email: 'your@email.com', Name: 'Smart Queue System' },
          To: [{ Email: user.email, Name: user.fullName }],
          Subject: 'Password Reset Code',
          TextPart: `Your recovery code is: ${code}`
        }
      ]
    });

    res.json({ message: 'Recovery code sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email' });
  }
};

const resetPassword = async (req, res) => {
  const { idNumber, recoveryCode, password } = req.body;
  try {
    const user = await User.findOne({ idNumber });
    if (!user || user.recoveryCode !== recoveryCode) {
      return res.status(400).json({ error: 'Invalid recovery code' });
    }
    user.password = await bcrypt.hash(password, 10);
    user.recoveryCode = undefined;
    await user.save();
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword
};
