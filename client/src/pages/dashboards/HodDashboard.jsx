import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Link,
  Button,
} from '@mui/material';
import { useProjects } from '../../contexts/ProjectContext';
import { useProposals } from '../../contexts/useProposals';
import { getUsers } from '../../services/hodService';
import ProjectStatusBarChart from '../../components/ProjectStatusBarChart';
import ProjectStatusPieChart from '../../components/ProjectStatusPieChart';

const HodDashboard = () => {
  const { projects, loading: projectsLoading } = useProjects();
  const { pendingProposals: proposals, loading: proposalsLoading } = useProposals();
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        const response = await getUsers();
        setUsers(response.data);
      } catch (err) {
        setError(err);
      } finally {
        setUsersLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const students = Array.isArray(users) ? users.filter(u => u.role === 'student') : [];
  const pendingProposals = proposals.filter(p => p.status === 'pending');

  const loading = projectsLoading || proposalsLoading || usersLoading;

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load dashboard data. Please try again later.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Pending Proposals */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h6">Pending Proposals</Typography>
              <Typography variant="h4">{pendingProposals.length}</Typography>
            </Box>
            <Button
              component={RouterLink}
              to="/proposals-queue"
              variant="contained"
            >
              View Proposals
            </Button>
          </Paper>
        </Grid>

        {/* Student Project Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Student Project Progress
            </Typography>
            <ProjectStatusBarChart projects={projects} students={students} />
          </Paper>
        </Grid>

        {/* Overall Project Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Overall Project Status
            </Typography>
            <ProjectStatusPieChart projects={projects} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default HodDashboard;
