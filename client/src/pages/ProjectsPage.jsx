import React from 'react';
import { Container, Grid, Typography, CircularProgress, Alert } from '@mui/material';
import { useProjects } from '../contexts/ProjectContext';
import ProjectCard from '../components/ProjectCard';

const ProjectsPage = () => {
  const { projects, loading, error } = useProjects();

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load projects. Please try again later.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Projects
      </Typography>
      {projects.length === 0 ? (
        <Typography>No projects found.</Typography>
      ) : (
        <Grid container spacing={4}>
          {projects.map((project) => (
            <Grid item key={project._id} xs={12} sm={6} md={4}>
              <ProjectCard project={project} />
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default ProjectsPage;
