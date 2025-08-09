import React, { useState, useEffect } from 'react';
import {
  CircularProgress,
  Typography,
  Paper,
  Grid,
  Box,
} from '@mui/material';
import { getMyStudents } from '../services/mentorService';
import { getAllStudents } from '../services/hodService';
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
        const { data } =
          user.role === 'hod' ? await getAllStudents() : await getMyStudents();
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

    const handleNewStudent = (newStudent) => {
      setStudents((prevStudents) => [newStudent, ...prevStudents]);
    };

    const handleStudentUpdate = (updatedStudent) => {
      setStudents((prevStudents) =>
        prevStudents.map((student) =>
          student._id === updatedStudent._id ? updatedStudent : student
        )
      );
    };

    onEvent('student:new', handleNewStudent);
    onEvent('student:updated', handleStudentUpdate);

    return () => {
      offEvent('student:new', handleNewStudent);
      offEvent('student:updated', handleStudentUpdate);
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
            <Grid item xs={12} md={6} key={student._id}>
              <StudentCard student={student} userRole={user?.role} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyStudentsPage;