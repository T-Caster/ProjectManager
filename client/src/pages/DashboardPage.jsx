import React from 'react';
import { Typography, Box, CircularProgress, Divider } from '@mui/material';
import { useAuthUser } from '../contexts/AuthUserContext';
import StudentDashboard from './dashboards/StudentDashboard';
import MentorDashboard from './dashboards/MentorDashboard';
import HodDashboard from './dashboards/HodDashboard';

const DashboardPage = () => {
  const { user, loading } = useAuthUser();

  const renderDashboard = () => {
    if (loading) {
      return <CircularProgress />;
    }

    switch (user?.role) {
      case 'student':
        return <StudentDashboard />;
      case 'mentor':
        return <MentorDashboard />;
      case 'hod':
        return <HodDashboard />;
      default:
        return <Typography>Unknown user role. Please contact support.</Typography>;
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, {user?.fullName || 'User'}!
      </Typography>
      <Divider sx={{ my: 2 }} />
      {renderDashboard()}
    </Box>
  );
};

export default DashboardPage;