import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Stack,
  Button,
} from '@mui/material';
import projectService from '../../services/projectService';
import { onEvent, offEvent } from '../../services/socketService';
import { AuthUserContext } from '../../contexts/AuthUserContext';
import { useProjects } from '../../contexts/ProjectContext';
import { useMeetings } from '../../contexts/MeetingContext';
import ProjectDetails from '../../components/ProjectDetails';

const StudentDashboard = () => {
  const { user } = useContext(AuthUserContext);
  const projectId = user?.project?._id;
  const { updateProjectStatus } = useProjects();
  const { meetings: allMeetings, refetchMeetings } = useMeetings();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingFilter, setMeetingFilter] = useState('all');
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState(null);
  const [noProject, setNoProject] = useState(false);

  const canEditStatus = false; // Students cannot edit project status

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setNoProject(false);

      if (!projectId) {
        setProject(null);
        setNoProject(true);
        return;
      }

      const projectData = await projectService.getProject(projectId);
      setProject(projectData);
      refetchMeetings();
    } catch (err) {
      const status = err?.response?.status || err?.status;
      if (status === 404) {
        setProject(null);
        setNoProject(true);
      } else {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const meetings = useMemo(() => {
    return (allMeetings || []).filter((m) => m.project?._id === projectId);
  }, [allMeetings, projectId]);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const handleProjectUpdate = (updatedProject) => {
      if (updatedProject._id === projectId) {
        setProject(updatedProject);
      }
    };

    onEvent('project:updated', handleProjectUpdate);
    return () => offEvent('project:updated', handleProjectUpdate);
  }, [projectId]);

  const handleStatusChange = async (event) => {
    const newStatus = event.target.value;
    try {
      setSavingStatus(true);
      await updateProjectStatus(projectId, newStatus);
      setProject((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (err) {
      setError(err);
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (noProject) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          You don't have a project yet. Once your proposal is approved, your project will appear here.
        </Alert>
        <Stack direction="row" spacing={1.5}>
          <Button component={Link} to="/propose-project" variant="contained">
            Propose a Project
          </Button>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load your project. Please try again later.</Alert>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Project not found.</Alert>
      </Container>
    );
  }

  return (
    <ProjectDetails
      project={project}
      meetings={meetings}
      loading={loading}
      onStatusChange={handleStatusChange}
      savingStatus={savingStatus}
      canEditStatus={canEditStatus}
      meetingFilter={meetingFilter}
      onMeetingFilterChange={setMeetingFilter}
      onRefresh={load}
    />
  );
};

export default StudentDashboard;
