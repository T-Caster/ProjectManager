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
import { forgotPassword } from "../services/authService";

export default function ForgotPasswordPage() {
  const [idError, setIdError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    const data = new FormData(event.currentTarget);
    const idNumber = data.get('idNumber')?.trim();

    setIdError('');
    if (!idNumber || idNumber.length !== 9 || !/^\d+$/.test(idNumber)) {
      setIdError('ID Number must be exactly 9 digits.');
      return;
    }

    setLoading(true);
    try {
      const response = await forgotPassword(idNumber);
      if (response.message) {
        setEmailSent(true);
      }
    } catch (err) {
      setFormError(err.error || 'Failed to send recovery email');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <AuthWrapper title="Email Sent" icon={<LockResetOutlinedIcon />}>
        <Typography variant="body2" align="center">
          An email has been sent to the address associated with your account with further instructions.
        </Typography>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper title="Forgot Password" icon={<LockResetOutlinedIcon />}>
      <Typography variant="body2" align="center" sx={{ mb: 2 }}>
        Enter your ID number and we'll send a recovery link to the email address associated with your account.
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
          {loading ? 'Sending...' : 'Send Recovery Email'}
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
