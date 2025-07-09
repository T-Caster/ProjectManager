import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Link,
} from '@mui/material';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import AuthWrapper from "../components/AuthWrapper";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [idError, setIdError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const idNumber = data.get('idNumber')?.trim();

    setIdError('');
    if (!idNumber || idNumber.length !== 9 || !/^\d+$/.test(idNumber)) {
      setIdError('ID Number must be exactly 9 digits.');
      return;
    }

    // TODO: Backend logic to send code to user's email
    console.log("Requesting password reset...");
    navigate('/reset-password');
  };

  return (
    <AuthWrapper title="Forgot Password" icon={<LockResetOutlinedIcon />}>
      <Typography variant="body2" align="center" sx={{ mb: 2 }}>
        Enter your ID number and we'll send a recovery code to the email address associated with your account.
      </Typography>
      <Box component="form" onSubmit={handleSubmit} noValidate>
        <TextField
          margin="normal"
          required
          fullWidth
          id="idNumber"
          label="ID Number"
          name="idNumber"
          autoFocus
          error={!!idError}
          helperText={idError}
        />
        <Button
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3, mb: 2 }}
        >
          Send Recovery Code
        </Button>
        <Grid container justifyContent="flex-end">
          <Grid item>
            <Link component={RouterLink} to="/login" variant="body2">
              Back to Sign In
            </Link>
          </Grid>
        </Grid>
      </Box>
    </AuthWrapper>
  );
}
