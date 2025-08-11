import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
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
import { register } from "../services/authService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [profilePic, setProfilePic] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const data = new FormData(event.currentTarget);
    const fullName = data.get('fullName')?.trim();
    const email = data.get('email')?.trim();
    const idNumber = data.get('idNumber')?.trim();
    const password = data.get('password');
    const confirmPassword = data.get('confirmPassword');
    const phoneNumber = data.get('phoneNumber')?.trim();

    const newErrors = {
      fullName: '',
      email: '',
      idNumber: '',
      password: '',
      confirmPassword: '',
      phoneNumber: '',
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
    if (!phoneNumber) newErrors.phoneNumber = 'Phone number is required.';


    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(e => e !== '');
    if (hasErrors) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("fullName", fullName);
      formData.append("email", email);
      formData.append("idNumber", idNumber);
      formData.append("password", password);
      formData.append("phoneNumber", phoneNumber);
      if (profilePic) {
        formData.append("profilePic", profilePic);
      }
      await register(formData); // pass FormData directly
      navigate('/login');
    } catch (err) {
      setFormError(err.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper title="Sign Up" icon={<HowToRegOutlinedIcon />}>
      <Box component="form" onSubmit={handleSubmit} noValidate encType="multipart/form-data">
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
            id="phoneNumber"
            label="Phone Number"
            name="phoneNumber"
            error={!!errors.phoneNumber}
            helperText={errors.phoneNumber}
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
          <Button
            variant="outlined"
            component="label"
          >
            {profilePic ? profilePic.name : "Upload Profile Picture (optional)"}
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={e => setProfilePic(e.target.files[0])}
            />
          </Button>
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
          {loading ? 'Signing Up...' : 'Sign Up'}
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
