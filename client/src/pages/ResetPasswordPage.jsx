import { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
} from '@mui/material';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import AuthWrapper from "../components/AuthWrapper";

export default function ResetPasswordPage() {
  const [errors, setErrors] = useState({
    recoveryCode: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const recoveryCode = data.get('recoveryCode')?.trim();
    const password = data.get('password');
    const confirmPassword = data.get('confirmPassword');

    const newErrors = {
      recoveryCode: '',
      password: '',
      confirmPassword: ''
    };

    if (!recoveryCode) newErrors.recoveryCode = 'Recovery code is required.';
    if (!password) newErrors.password = 'Password is required.';
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    const hasErrors = Object.values(newErrors).some(e => e !== '');
    if (hasErrors) return;

    // TODO: Implement password update logic
    console.log("Password has been reset.");
  };

  return (
    <AuthWrapper title="Reset Password" icon={<LockResetOutlinedIcon />}>
      <Typography variant="body2" align="center" sx={{ mb: 2 }}>
        Please enter the recovery code sent to your email and your new password.
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          id="recoveryCode"
          label="Recovery Code"
          name="recoveryCode"
          error={!!errors.recoveryCode}
          helperText={errors.recoveryCode}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="password"
          label="New Password"
          type="password"
          id="password"
          error={!!errors.password}
          helperText={errors.password}
        />
        <TextField
          margin="normal"
          required
          fullWidth
          name="confirmPassword"
          label="Confirm New Password"
          type="password"
          id="confirmPassword"
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Update Password
        </Button>
      </Box>
    </AuthWrapper>
  );
}
