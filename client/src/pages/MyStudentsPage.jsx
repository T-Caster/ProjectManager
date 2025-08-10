import React, { useState, useEffect } from 'react';
import {
  CircularProgress,
  Typography,
  Paper,
  Grid,
  Box,
} from '@mui/material';
import { getMyStudents } from '../services/mentorService';
import { useAuthUser } from '../contexts/AuthUserContext';
import { onEvent, offEvent } from '../services/socketService';
import StudentCard from '../components/StudentCard';

const MyStudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuthUser();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        const { data } =
          await getMyStudents();
        setStudents(data);
      } catch (err) {
        setError('Failed to fetch students');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchStudents();
    }

    // Listen for the event that indicates a new student has been assigned to this mentor
    const handleNewAssignment = () => {
      if (user.role === 'mentor') {
        fetchStudents();
      }
    };

    onEvent('new_student_assigned', handleNewAssignment);

    return () => {
      offEvent('new_student_assigned', handleNewAssignment);
    };
  }, [user]);

  if (loading)
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={5}>
        <CircularProgress color="primary" />
        <Typography variant="body1" mt={2}>
          Loading students...
        </Typography>
      </Box>
    );

  if (error) return <Typography color="error">{error}</Typography>;

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
        {user?.role === 'hod' ? 'All Students' : 'My Students'}
      </Typography>

      {students.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            borderRadius: 2,
            backgroundColor: 'background.paper',
          }}
        >
          <Typography variant="h6" color="text.secondary">
            {user?.role === 'hod'
              ? 'There are no students in the system.'
              : 'You have no students at the moment.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {students.map((student) => (
            <Grid size={{ xs: 12, md: 6}} key={student._id}>
              <StudentCard student={student} userRole={user?.role} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyStudentsPage;