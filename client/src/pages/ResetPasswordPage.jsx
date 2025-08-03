import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
} from '@mui/material';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import AuthWrapper from "../components/AuthWrapper";
import { resetPassword, validateResetToken } from "../services/authService";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { token } = useParams();
  const [errors, setErrors] = useState({
    password: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      try {
        await validateResetToken(token);
        setIsValidToken(true);
      } catch (err) {
        setFormError(err.error || 'Invalid or expired token.');
        setIsValidToken(false);
      } finally {
        setLoading(false);
      }
    };
    checkToken();
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const data = new FormData(event.currentTarget);
    const password = data.get('password');
    const confirmPassword = data.get('confirmPassword');

    const newErrors = {
      password: '',
      confirmPassword: ''
    };

    if (!password) newErrors.password = 'Password is required.';
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    const hasErrors = Object.values(newErrors).some(e => e !== '');
    if (hasErrors) return;

    setLoading(true);
    try {
      await resetPassword(token, password);
      navigate('/login');
    } catch (err) {
      setFormError(err.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <AuthWrapper title="Verifying..."><Typography>Loading...</Typography></AuthWrapper>;
  }

  if (!isValidToken) {
    return (
      <AuthWrapper title="Error" icon={<LockResetOutlinedIcon />}>
        <Typography color="error" variant="h6" align="center">
          {formError}
        </Typography>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper title="Reset Password" icon={<LockResetOutlinedIcon />}>
      <Typography variant="body2" align="center" sx={{ mb: 2 }}>
        Please enter your new password.
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
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
