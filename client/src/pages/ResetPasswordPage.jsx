import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
} from '@mui/material';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import AuthWrapper from "../components/AuthWrapper";
import { resetPassword } from "../services/authService";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [errors, setErrors] = useState({
    recoveryCode: '',
    password: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Try to get idNumber from navigation state (from forgot password)
  const idNumber = location.state?.idNumber || '';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
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

    setLoading(true);
    try {
      await resetPassword(idNumber, recoveryCode, password);
      navigate('/login');
    } catch (err) {
      setFormError(err.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
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
        {formError && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {formError}
          </Typography>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
          disabled={loading}
        >
          {loading ? 'Updating...' : 'Update Password'}
        </Button>
      </Box>
    </AuthWrapper>
  );
}
