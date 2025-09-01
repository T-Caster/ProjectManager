import React, { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Grid,
  Skeleton,
  Stack,
  Typography,
  Alert,
} from '@mui/material';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import RefreshIcon from '@mui/icons-material/Refresh';

import { useProjects } from '../../contexts/ProjectContext';
import { useProposals } from '../../contexts/useProposals';
import { getUsers } from '../../services/hodService';
import { KpiCard, SectionCard} from "../../components/SmallComponents"
import ProjectStatusBarChart from '../../components/ProjectStatusBarChart';
import ProjectStatusPieChart from '../../components/ProjectStatusPieChart';

const HodDashboard = () => {
  // ----- existing data flow (unchanged)
  const { projects, loading: projectsLoading } = useProjects();
  const { pendingProposals: proposals, loading: proposalsLoading } = useProposals();

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState(null);

  // local “soft” refresh flag for button spinner
  const [refreshing, setRefreshing] = useState(false);

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

  const students = Array.isArray(users) ? users.filter((u) => u.role === 'student') : [];
  const pendingProposals = proposals.filter((p) => p.status === 'pending');

  const loading = projectsLoading || proposalsLoading || usersLoading;

  const handleRefresh = async () => {
    // keeps UI snappy without changing your existing data flow
    setRefreshing(true);
    try {
      const response = await getUsers();
      setUsers(response.data);
      // charts re-render automatically via existing contexts
    } catch (err) {
      setError(err);
    } finally {
      setRefreshing(false);
    }
  };

  // ----- loading state
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack spacing={2}>
          <Skeleton variant="rounded" height={120} />
          <Grid container spacing={2}>
            <Grid item size={{xs: 12, md: 6}}>
              <Skeleton variant="rounded" height={340} />
            </Grid>
            <Grid item size={{xs: 12, md: 6}}>
              <Skeleton variant="rounded" height={340} />
            </Grid>
          </Grid>
        </Stack>
      </Container>
    );
  }

  // ----- error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert
          severity="error"
          action={
            <Button size="small" variant="outlined" onClick={handleRefresh} startIcon={<RefreshIcon />}>
              Retry
            </Button>
          }
        >
          Failed to load dashboard data. Please try again later.
        </Alert>
      </Container>
    );
  }

  // derived totals
  const totalProjects = Array.isArray(projects) ? projects.length : 0;
  const totalStudents = students.length;
  const totalPending = pendingProposals.length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero / KPIs */}
      <Card
        elevation={0}
        sx={(theme) => ({
          mb: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
        })}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                HOD Overview
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Monitor proposals, student progress, and overall project health.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              <Button
                component={RouterLink}
                to="/proposals-queue"
                variant="contained"
                endIcon={<ChevronRightIcon />}
              >
                View Proposals
              </Button>
              <Button
                onClick={handleRefresh}
                variant="outlined"
                startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshIcon />}
                disabled={refreshing}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item size={{xs: 12, md: 4}}>
              <KpiCard
                icon={<PendingActionsIcon />}
                label="Pending Proposals"
                value={totalPending}
                chipColor="warning"
                to="/proposals-queue"
              />
            </Grid>
            <Grid item size={{xs: 12, md: 4}}>
              <KpiCard
                icon={<PeopleAltIcon />}
                label="Students"
                value={totalStudents}
                chipColor="info"
              />
            </Grid>
            <Grid item size={{xs: 12, md: 4}}>
              <KpiCard
                icon={<AssignmentTurnedInIcon />}
                label="Projects"
                value={totalProjects}
                chipColor="primary"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <Grid container spacing={3}>
        <Grid item size={{xs: 12, md: 6}}>
          <SectionCard title="Student Project Progress" subtitle="Breakdown by stage across enrolled students">
            <Box sx={{ height: 360 }}>
              <ProjectStatusBarChart projects={projects} students={students} />
            </Box>
          </SectionCard>
        </Grid>

        <Grid item size={{xs: 12, md: 6}}>
          <SectionCard title="Overall Project Status" subtitle="Distribution of all active projects">
            <Box sx={{ height: 360 }}>
              <ProjectStatusPieChart projects={projects} />
            </Box>
          </SectionCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default HodDashboard;
