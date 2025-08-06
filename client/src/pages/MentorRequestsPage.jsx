import React, { useState, useEffect } from 'react';
import {
  Button,
  CircularProgress,
  Typography,
  Paper,
  Grid,
  Chip,
  Stack,
  Box,
} from '@mui/material';
import { getHodRequests } from '../services/hodService';
import { emitEvent, onEvent, offEvent } from '../services/socketService';

const MentorRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const { data } = await getHodRequests();

        // ✅ Sort requests by date (newest first)
        const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
        setRequests(sortedData);
      } catch (err) {
        setError('Failed to fetch requests');
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const handleApprove = (requestId) => {
    setUpdating(requestId);
    emitEvent('request:approve', { requestId });
  };

  const handleReject = (requestId) => {
    setUpdating(requestId);
    emitEvent('request:reject', { requestId });
  };

  useEffect(() => {
    const handleNewRequest = (newRequest) => {
      setRequests((prevRequests) => [newRequest, ...prevRequests]);
    };

    const handleRequestUpdated = (updatedRequest) => {
      setRequests((prevRequests) =>
        prevRequests.map((req) =>
          req._id === updatedRequest._id ? updatedRequest : req
        )
      );
      setUpdating(null);
    };

    onEvent('request:new', handleNewRequest);
    onEvent('request:updated', handleRequestUpdated);

    return () => {
      offEvent('request:new', handleNewRequest);
      offEvent('request:updated', handleRequestUpdated);
    };
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    const date = new Date(dateString);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading)
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={5}>
        <CircularProgress color="primary" />
        <Typography variant="body1" mt={2}>
          Loading mentor requests...
        </Typography>
      </Box>
    );

  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
        Mentor Requests
      </Typography>

      {requests.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            backgroundColor: 'background.paper',
          }}
        >
          <Typography variant="h6" color="text.secondary">
            No mentor requests at the moment.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {requests.map((request) => (
            <Grid item xs={12} md={6} key={request._id}>
              <Paper
                elevation={2}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0.5,
                  backgroundColor: 'background.paper',
                  transition: '0.2s',
                  '&:hover': { boxShadow: 4 },
                }}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  Student: {request.student.fullName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Mentor: {request.mentor.fullName}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Requested on: {formatDate(request.date)}
                </Typography>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  spacing={2}
                  mt={2}
                >
                  <Chip
                    label={request.status}
                    color={
                      request.status === 'approved'
                        ? 'success'
                        : request.status === 'rejected'
                        ? 'error'
                        : 'warning'
                    }
                    variant="outlined"
                    sx={{
                      textTransform: 'capitalize',
                      minWidth: 90,
                      textAlign: 'center',
                      fontWeight: 500,
                    }}
                  />

                  {request.status === 'pending' && (
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => handleApprove(request._id)}
                        disabled={updating === request._id}
                      >
                        {updating === request._id ? <CircularProgress size={20} /> : 'Approve'}
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleReject(request._id)}
                        disabled={updating === request._id}
                      >
                        {updating === request._id ? <CircularProgress size={20} /> : 'Reject'}
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MentorRequestsPage;
