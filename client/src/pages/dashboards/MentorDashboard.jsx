import React, { useContext, useMemo, useState } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
} from '@mui/material';
import { useMeetings } from '../../contexts/MeetingContext';
import { useProjects } from '../../contexts/ProjectContext';
import { AuthUserContext } from '../../contexts/AuthUserContext';
import MeetingsSection from '../../components/MeetingsSection';
import ProjectsGrid from '../../components/ProjectsGrid';
import ProjectStatusPieChart from '../../components/ProjectStatusPieChart';

const MentorDashboard = () => {
  const { user } = useContext(AuthUserContext);
  const { meetings, loading: meetingsLoading, refetchMeetings } = useMeetings();
  const { projects, loading: projectsLoading, refetchProjects } = useProjects();

  const [meetingFilter, setMeetingFilter] = useState('accepted');

  const mentorProjects = useMemo(() => {
    return projects.filter(p => p.mentor?._id === user?._id);
  }, [projects, user]);

  const upcomingMeetings = useMemo(() => {
    return meetings.filter(m => m.status === 'accepted' && new Date(m.date) > new Date());
  }, [meetings]);

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Upcoming Meetings */}
        <Grid item xs={12}>
          <MeetingsSection
            title="Upcoming Meetings"
            meetings={upcomingMeetings}
            loading={meetingsLoading}
            onRefresh={refetchMeetings}
            filter={meetingFilter}
            onFilterChange={setMeetingFilter}
            role={user.role}
            currentUserId={user._id}
            emptyStateTitle="No upcoming meetings."
            emptyStateMessage="Scheduled meetings will appear here."
          />
        </Grid>

        {/* My Projects */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              My Projects
            </Typography>
            <ProjectsGrid
              projects={mentorProjects}
              loading={projectsLoading}
              onRefresh={refetchProjects}
            />
          </Paper>
        </Grid>

        {/* Project Status Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Project Status
            </Typography>
            <ProjectStatusPieChart projects={mentorProjects} />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MentorDashboard;
