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

export default function LoginPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({
    idNumber: '',
    password: ''
  });

  const handleSubmit = (event) => {
    event.preventDefault();
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

    // TODO: Implement login logic
    console.log('Logging in...');
    navigate('/dashboard');
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
        </Stack>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 1.5 }}
        >
          Sign In
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
