import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Link,
  Stack,
  Typography
} from '@mui/material';
import HowToRegOutlinedIcon from '@mui/icons-material/HowToRegOutlined';
import AuthWrapper from "../components/AuthWrapper";

export default function RegisterPage() {
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const fullName = data.get('fullName')?.trim();
    const email = data.get('email')?.trim();
    const idNumber = data.get('idNumber')?.trim();
    const password = data.get('password');
    const confirmPassword = data.get('confirmPassword');

    const newErrors = {
      fullName: '',
      email: '',
      idNumber: '',
      password: '',
      confirmPassword: '',
    };

    if (!fullName) newErrors.fullName = 'Full name is required.';
    if (!email || !/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      newErrors.email = 'Enter a valid email address.';
    }
    if (!idNumber || idNumber.length !== 9 || !/^\d+$/.test(idNumber)) {
      newErrors.idNumber = 'ID must be 9 digits.';
    }
    if (!password) newErrors.password = 'Password is required.';
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(e => e !== '');
    if (hasErrors) return;

    // TODO: Implement registration logic
    console.log('Registering...');
  };

  return (
    <AuthWrapper title="Sign Up" icon={<HowToRegOutlinedIcon />}>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <TextField
            required
            fullWidth
            id="fullName"
            label="Full Name"
            name="fullName"
            error={!!errors.fullName}
            helperText={errors.fullName}
          />
          <TextField
            required
            fullWidth
            id="email"
            label="Email Address"
            name="email"
            error={!!errors.email}
            helperText={errors.email}
          />
          <TextField
            required
            fullWidth
            id="idNumber"
            label="ID Number (9 digits)"
            name="idNumber"
            inputProps={{ maxLength: 9 }}
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
            error={!!errors.password}
            helperText={errors.password}
          />
          <TextField
            required
            fullWidth
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            id="confirmPassword"
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword}
          />
        </Stack>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 1.5 }}
        >
          Sign Up
        </Button>
        <Typography align="center" variant="body2">
          <Link component={RouterLink} to="/login">
            Already have an account? Sign in
          </Link>
        </Typography>
      </Box>
    </AuthWrapper>
  );
}
