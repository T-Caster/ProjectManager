import React, { useState, useEffect, useMemo } from 'react';
import {
  CircularProgress,
  Typography,
  Paper,
  Box,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  Alert,
  Stack,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import SchoolIcon from '@mui/icons-material/School';
import { getMyStudents } from '../services/mentorService';
import { useAuthUser } from '../contexts/AuthUserContext';
import { onEvent, offEvent } from '../services/socketService';
import StudentCard from '../components/StudentCard';

const MyStudentsPage = () => {
  const { user } = useAuthUser();
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'assigned' | 'unassigned'
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data } = await getMyStudents();
      setStudents(Array.isArray(data) ? data : []);
      setError('');
    } catch {
      setError('Failed to fetch students.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchStudents();

    const handleNewAssignment = () => {
      if (user?.role === 'mentor' || user?.role === 'hod') fetchStudents();
    };

    onEvent('new_student_assigned', handleNewAssignment);
    return () => offEvent('new_student_assigned', handleNewAssignment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return students.filter((s) => {
      if (filter === 'assigned' && !s.isInProject) return false;
      if (filter === 'unassigned' && s.isInProject) return false;
      if (!term) return true;
      const hay = [
        s.fullName,
        s.idNumber,
        s?.mentor?.fullName,
        ...(s?.project?.students?.map((p) => p?.fullName) || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    });
  }, [students, filter, q]);

  const totalLabel = useMemo(() => {
    if (filter === 'assigned') return 'in project';
    if (filter === 'unassigned') return 'unassigned';
    return 'total';
  }, [filter]);

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" mt={8}>
        <CircularProgress color="primary" />
        <Typography variant="body2" mt={2} color="text.secondary">
          Loading students…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ py: 3 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 3,
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.background.paper,
        })}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              {user?.role === 'hod' ? 'Students Directory' : 'Mentor Dashboard'}
            </Typography>
            <Typography variant="h4" sx={{ color: 'primary.main' }}>
              {user?.role === 'hod' ? 'All Students' : 'My Students'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {filtered.length} {totalLabel}
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, ID, mentor, co-student"
              size="small"
              sx={{ minWidth: 260 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />

            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={(_, v) => v && setFilter(v)}
              size="small"
              color="primary"
            >
              <ToggleButton value="all">All</ToggleButton>
              <ToggleButton value="assigned">
                <SchoolIcon fontSize="small" sx={{ mr: 0.5 }} /> In Project
              </ToggleButton>
              <ToggleButton value="unassigned">
                <PeopleIcon fontSize="small" sx={{ mr: 0.5 }} /> Unassigned
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {filtered.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px dashed',
            borderColor: 'sidebar.active',
            backgroundColor: 'background.paper',
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            {q ? 'No students match your search.' : 'No students to display.'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {q
              ? 'Try adjusting your keywords or filters.'
              : user?.role === 'hod'
              ? 'Students will appear here as they register.'
              : 'You’ll see your assigned students here.'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((student) => (
            <Grid key={student._id} size={{ xs: 12, md: 6 }}>
              <StudentCard student={student} userRole={user?.role} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default MyStudentsPage;
