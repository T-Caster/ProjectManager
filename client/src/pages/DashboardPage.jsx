import React, { useState, useEffect } from 'react';
import { Typography, Paper, CircularProgress, Box, Alert, Button, Link } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { getMyMentorRequest } from '../services/mentorService';
import { useAuthUser } from '../contexts/AuthUserContext';
import ChooseMentorModal from '../components/ChooseMentorModal';
import { onEvent, offEvent, initSocket, disconnectSocket } from '../services/socketService';
const DashboardPage = () => {
  const { user, setUser } = useAuthUser();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const handleOpenModal = () => setModalOpen(true);
  const handleCloseModal = () => setModalOpen(false);

  const fetchRequest = async () => {
    if (user?.role === 'student') {
      try {
        const { data } = await getMyMentorRequest();
        setRequest(data);
      } catch (error) {
        console.error('Failed to fetch request status', error);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchRequest();

      const handleStatusUpdate = (updatedRequest) => {
        if (user.role === 'student') {
          setRequest(updatedRequest);
          if (updatedRequest.status === 'approved') {
            setUser(prevUser => ({ ...prevUser, mentor: updatedRequest.mentor }));
          }
        }
      };

      onEvent('status:update', handleStatusUpdate);

      return () => {
        offEvent('status:update', handleStatusUpdate);
      };
    }
  }, [user]);

  if (loading) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Welcome, {user?.fullName || 'User'}!
      </Typography>
      <Typography>
        This is your dashboard. You can use the sidebar to navigate to different parts of the application.
      </Typography>

      {user?.role === 'student' && !user.mentor && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6">Mentor Request Status</Typography>
          {request && request.status !== 'approved' ? (
            <Box>
              <Alert severity={request.status === 'rejected' ? 'error' : 'info'}>
                Your request to be mentored by {request.mentor.fullName} is {request.status}.
              </Alert>
              {request.status === 'rejected' && (
                <Button variant="contained" onClick={handleOpenModal} sx={{ mt: 2 }}>
                  Choose a Different Mentor
                </Button>
              )}
            </Box>
          ) : !user.mentor && (
            <Box>
              <Alert severity="warning">You have not requested a mentor yet.</Alert>
              <Button variant="contained" onClick={handleOpenModal} sx={{ mt: 2 }}>
                Choose a Mentor
              </Button>
            </Box>
          )}
        </Paper>
      )}
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
      <ChooseMentorModal open={modalOpen} handleClose={handleCloseModal} onMentorRequested={fetchRequest} />
    </Box>
  );
};

export default DashboardPage;