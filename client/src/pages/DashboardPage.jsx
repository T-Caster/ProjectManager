import React from 'react';
import { Typography, Paper, Box, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthUser } from '../contexts/AuthUserContext';

const DashboardPage = () => {
  const { user } = useAuthUser();

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, {user?.fullName || 'User'}!
      </Typography>
      <Typography>
        This is your dashboard. You can use the sidebar to navigate to different parts of the application.
      </Typography>

      {user?.role === 'student' && user.mentor && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6">Your Mentor</Typography>
          <Typography>
            You are being mentored by{' '}
            <Link component={RouterLink} to={`/profile/${user.mentor._id}`}>
              {user.mentor.fullName}
            </Link>
            .
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default DashboardPage;