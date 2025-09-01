import React from 'react';
import {
  Grid,
  Paper,
  Typography,
  Stack,
  CircularProgress,
  Button,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import ProjectCard from './ProjectCard';
import { useAuthUser } from '../contexts/AuthUserContext';

const ProjectsGrid = ({ projects, loading, error, onRefresh }) => {
  const { user } = useAuthUser();

  if (loading) {
    return (
      <Stack alignItems="center" py={6} spacing={2}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading projects…
        </Typography>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack alignItems="center" py={6} spacing={1.5}>
        <EventAvailableIcon color="error" sx={{ fontSize: 36 }} />
        <Typography color="error">Failed to load projects.</Typography>
        <Button onClick={onRefresh} variant="outlined" size="small">
          Try again
        </Button>
      </Stack>
    );
  }

  if (projects.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 4,
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          textAlign: 'center',
          background: theme.palette.background.default,
        })}
      >
        <EventAvailableIcon color="primary" sx={{ fontSize: 36 }} />
        <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
          No projects match your filters.
        </Typography>
      </Paper>
    );
  }

  return (
    <Grid container spacing={2}>
      {projects.map((p) => (
        <Grid key={p._id} item xs={12} sm={6} md={4}>
          <ProjectCard project={p} currentUserRole={user?.role} />
        </Grid>
      ))}
    </Grid>
  );
};

export default ProjectsGrid;
