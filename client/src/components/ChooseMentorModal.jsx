import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Grid,
  Avatar,
  Divider,
  Fade,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { getMentors, getMyMentorRequest } from '../services/mentorService';
import { emitEvent, onEvent, offEvent } from '../services/socketService';

const ChooseMentorModal = ({ open, handleClose, onMentorRequested }) => {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const theme = useTheme();

  useEffect(() => {
    if (open) {
      setLoading(true);
      const fetchMentorsAndRequest = async () => {
        try {
          const [{ data: mentorsData }, { data: requestData }] = await Promise.all([
            getMentors(),
            getMyMentorRequest(),
          ]);
          setMentors(mentorsData);
          if (requestData && requestData.status !== 'rejected') {
            setRequestStatus(`You already have a ${requestData.status} request.`);
          }
        } catch (err) {
          setError('Failed to fetch data');
        } finally {
          setLoading(false);
        }
      };
      fetchMentorsAndRequest();
    }
  }, [open]);

  const handleCloseModal = () => {
    setError(null);
    setRequestStatus(null);
    handleClose();
  };

  const handleRequestMentor = (mentorId) => {
    emitEvent('mentor:request', { mentorId });
  };

  useEffect(() => {
    const handleRequestSent = (newRequest) => {
      setRequestStatus('Request sent successfully');
      onMentorRequested();
      setTimeout(() => handleCloseModal(), 1200);
    };

    const handleError = (error) => {
      setRequestStatus(error.message);
    };

    onEvent('request:sent', handleRequestSent);
    onEvent('error', handleError);

    return () => {
      offEvent('request:sent', handleRequestSent);
      offEvent('error', handleError);
    };
  }, [onMentorRequested, handleCloseModal]);

  return (
    <Modal open={open} onClose={handleCloseModal} closeAfterTransition>
      <Fade in={open}>
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            maxHeight: '80vh',
            bgcolor: 'background.paper',
            boxShadow: 24,
            borderRadius: 2,
            p: 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Typography variant="h6" sx={{ mb: 2, color: theme.palette.primary.main }}>
            Choose a Mentor
          </Typography>

          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px">
              <CircularProgress color="primary" />
            </Box>
          )}

          {error && (
            <Typography color="error" sx={{ mb: 2 }}>
              {error}
            </Typography>
          )}

          {requestStatus && (
            <Typography
              sx={{
                mb: 2,
                color: requestStatus.includes('successfully')
                  ? theme.palette.success.main
                  : theme.palette.error.main,
              }}
            >
              {requestStatus}
            </Typography>
          )}

          {!loading && mentors.length > 0 ? (
            <List
              sx={{
                overflowY: 'auto',
                maxHeight: '60vh',
                pr: 1,
              }}
            >
              {mentors.map((mentor, index) => (
                <React.Fragment key={mentor._id}>
                  <ListItem
                    sx={{
                      borderRadius: 1,
                      py: 1.5,
                      px: 1,
                      '&:hover': {
                        backgroundColor: theme.palette.sidebar?.hover || 'rgba(0,0,0,0.04)',
                      },
                    }}
                    secondaryAction={
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        onClick={() => handleRequestMentor(mentor._id)}
                        disabled={!!requestStatus}
                      >
                        Request
                      </Button>
                    }
                  >
                    <Grid container alignItems="center" spacing={2}>
                      <Grid item>
                        <Avatar
                          src={`http://localhost:5000/${mentor.profilePic}`}
                          alt={mentor.fullName}
                          sx={{ width: 50, height: 50 }}
                        />
                      </Grid>
                      <Grid item xs>
                        <ListItemText
                          primary={mentor.fullName}
                          primaryTypographyProps={{ fontWeight: 500 }}
                          secondary={`Students: ${mentor.students}`}
                        />
                      </Grid>
                    </Grid>
                  </ListItem>
                  {index < mentors.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            !loading && <Typography>No mentors available at this time.</Typography>
          )}

          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Button onClick={handleCloseModal} variant="outlined" color="secondary">
              Close
            </Button>
          </Box>
        </Box>
      </Fade>
    </Modal>
  );
};

export default ChooseMentorModal;
