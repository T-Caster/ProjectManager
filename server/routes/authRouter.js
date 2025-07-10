const express = require('express');
const {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'Access granted' });
});

module.exports = router;