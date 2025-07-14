import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Link,
  Stack,
  Typography
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import AuthWrapper from '../components/AuthWrapper';
import { login } from '../services/authService'; // <-- Import login

export default function LoginPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({
    idNumber: '',
    password: ''
  });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const data = new FormData(event.currentTarget);
    const idNumber = data.get('idNumber')?.trim();
    const password = data.get('password');

    const newErrors = {
      idNumber: '',
      password: ''
    };

    if (!idNumber || idNumber.length !== 9 || !/^\d+$/.test(idNumber)) {
      newErrors.idNumber = 'ID must be 9 digits.';
    }
    if (!password) newErrors.password = 'Password is required.';

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(e => e !== '');
    if (hasErrors) return;

    setLoading(true);
    try {
      const result = await login(idNumber, password);
      localStorage.setItem('token', result.token); // Store JWT
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper title="Sign In" icon={<LockOutlinedIcon />}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            required
            fullWidth
            id="idNumber"
            label="ID Number"
            name="idNumber"
            autoComplete="username"
            autoFocus
            error={!!errors.idNumber}
            helperText={errors.idNumber}
          />
          <TextField
            required
            fullWidth
            name="password"
            label="Password"
            type="password"
            id="password"
            autoComplete="current-password"
            error={!!errors.password}
            helperText={errors.password}
          />
          {formError && (
            <Typography color="error" variant="body2">
              {formError}
            </Typography>
          )}
        </Stack>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 1.5 }}
          disabled={loading}
        >
          {loading ? 'Signing In...' : 'Sign In'}
        </Button>
        <Stack direction="column" alignItems="center" spacing={0.5}>
          <Link component={RouterLink} to="/forgot-password" variant="body2">
            Forgot password?
          </Link>
          <Link component={RouterLink} to="/register" variant="body2">
            Don't have an account? Sign Up
          </Link>
        </Stack>
      </Box>
    </AuthWrapper>
  );
}
