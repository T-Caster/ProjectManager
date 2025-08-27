import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import projectService from '../services/projectService';
import meetingService from '../services/meetingService';
import MeetingsSection from '../components/MeetingsSection';
import { AuthUserContext } from '../contexts/AuthUserContext';
import { useProjects } from '../contexts/ProjectContext';

const ProjectPage = () => {
  const { projectId } = useParams();
  const { user } = useContext(AuthUserContext);
  const { updateProjectStatus } = useProjects();
  const [project, setProject] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjectAndMeetings = async () => {
      try {
        setLoading(true);
        setError(null);
        const projectData = await projectService.getProject(projectId);
        setProject(projectData);
        const meetingsData = await meetingService.getMeetingsByProject(projectId);
        setMeetings(meetingsData);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectAndMeetings();
  }, [projectId]);

  const handleStatusChange = async (event) => {
    const newStatus = event.target.value;
    try {
      await updateProjectStatus(projectId, newStatus);
      setProject((prevProject) => ({ ...prevProject, status: newStatus }));
    } catch (err) {
      console.error('Failed to update project status', err);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error || !project) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">Failed to load project details. Please try again later.</Alert>
      </Container>
    );
  }

  const canEditStatus = user?.role === 'mentor' && user?._id === project.mentor?._id;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        {project.name}
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6">Project Details</Typography>
              <Typography variant="body1">
                <strong>Background:</strong> {project.background}
              </Typography>
              <Typography variant="body1">
                <strong>Objectives:</strong> {project.objectives}
              </Typography>
              <Typography variant="body1">
                <strong>Mentor:</strong> {project.mentor?.fullName}
              </Typography>
              <Typography variant="body1">
                <strong>Students:</strong> {project.students.map((s) => s.fullName).join(', ')}
              </Typography>
              <Button
                component={Link}
                to={`/tasks?projectId=${project._id}`}
                variant="contained"
                sx={{ mt: 2 }}
              >
                View Tasks
              </Button>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6">Project Status</Typography>
              {canEditStatus ? (
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select value={project.status} label="Status" onChange={handleStatusChange}>
                    <MenuItem value="proposal">Proposal</MenuItem>
                    <MenuItem value="specification">Specification</MenuItem>
                    <MenuItem value="code">Code</MenuItem>
                    <MenuItem value="presentation">Presentation</MenuItem>
                    <MenuItem value="done">Done</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Typography variant="body1">{project.status}</Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <MeetingsSection
        title="Project Meetings"
        meetings={meetings}
        loading={false}
        role={user.role}
        currentUserId={user?._id}
      />
    </Container>
  );
};

export default ProjectPage;
