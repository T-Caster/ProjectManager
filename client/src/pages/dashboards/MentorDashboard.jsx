import React, { useContext, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import InsightsIcon from '@mui/icons-material/Insights';

import { useMeetings } from '../../contexts/MeetingContext';
import { useProjects } from '../../contexts/ProjectContext';
import { AuthUserContext } from '../../contexts/AuthUserContext';

import MeetingsSection from '../../components/MeetingsSection';
import ProjectsGrid from '../../components/ProjectsGrid';
import ProjectStatusPieChart from '../../components/ProjectStatusPieChart';
import { EmptyInline, KpiCard } from '../../components/SmallComponents';

const MentorDashboard = () => {
  const { user } = useContext(AuthUserContext);
  const { meetings, loading: meetingsLoading, refetchMeetings } = useMeetings();
  const { projects, loading: projectsLoading, refetchProjects } = useProjects();

  // My projects only
  const mentorProjects = useMemo(
    () => (projects || []).filter((p) => p.mentor?._id === user?._id),
    [projects, user]
  );

  const totalMyProjects = mentorProjects.length;
  const totalUpcoming = useMemo(() => {
    return (meetings || []).filter((m) => {
      console.log(m.status)
      return m.status === 'accepted'
    }).length;
  }, [meetings]);
  const totalPending = (meetings || []).filter((m) => m.status === 'pending').length;
  const anyLoading = meetingsLoading || projectsLoading;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={3}>
        {/* Row 1: Header/KPIs (wide) + Project Status chart (compact) */}
        <Grid item size={{ xs: 12, md: 8 }}>
          <Card
            elevation={0}
            sx={(t) => ({
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: `linear-gradient(135deg, ${t.palette.background.paper} 0%, ${t.palette.background.default} 100%)`,
              height: '100%',
            })}
          >
            <CardContent sx={{ p: 3 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1.5}
              >
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    Mentor Overview
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Quick stats & actions
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1}>
                  <IconButton title="Refresh" onClick={() => { refetchProjects(); refetchMeetings(); }}>
                    {anyLoading ? <CircularProgress size={18} /> : <RefreshIcon />}
                  </IconButton>
                  <Button
                    component={RouterLink}
                    to="/meetings"
                    variant="contained"
                    startIcon={<CalendarMonthIcon />}
                    sx={{ whiteSpace: 'nowrap' }}
                  >
                    All Meetings
                  </Button>
                </Stack>
              </Stack>

              <Grid container spacing={1.5} sx={{ mt: 1 }}>
                <Grid item size={{ xs: 12 }}>
                  <KpiCard
                    icon={<FolderSpecialIcon />}
                    label="My Projects"
                    value={totalMyProjects}
                    chipColor="primary"
                    to="/projects"
                  />
                </Grid>
                <Grid item size={{ xs: 6 }}>
                  <KpiCard
                    icon={<CalendarMonthIcon />}
                    label="Upcoming"
                    value={totalUpcoming}
                    chipColor="success"
                    to="/meetings"
                  />
                </Grid>
                <Grid item size={{ xs: 6 }}>
                  <KpiCard
                    icon={<PendingActionsIcon />}
                    label="Pending"
                    value={totalPending}
                    chipColor="warning"
                    to="/meetings"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item size={{ xs: 12, md: 4 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <InsightsIcon fontSize="small" />
                  <Typography variant="h6">Project Status</Typography>
                </Stack>
              }
              sx={{ pb: 1 }}
            />
            <Divider />
            <CardContent>
              {mentorProjects.length === 0 ? (
                <EmptyInline icon={<InsightsIcon />} text="No projects to analyze yet." />
              ) : (
                <Box sx={{ height: 360 }}>
                  <ProjectStatusPieChart projects={mentorProjects} />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Row 2: Upcoming Meetings (full width) */}
        <Grid item size={{ xs: 12 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <CalendarMonthIcon fontSize="small" />
                  <Typography variant="h6">My Meetings</Typography>
                </Stack>
              }
              sx={{ pb: 1 }}
            />
            <Divider />
            <CardContent sx={{ pt: 2 }}>
              <MeetingsSection
                title=""
                emptyStateTitle="No meetings found."
                emptyStateMessage="Your meetings will appear here."
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Row 3: My Projects (full width) */}
        <Grid item size={{ xs: 12 }}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <FolderSpecialIcon fontSize="small" />
                  <Typography variant="h6">My Projects</Typography>
                  <Chip size="small" variant="outlined" label={totalMyProjects} />
                </Stack>
              }
              action={
                <IconButton title="Refresh" onClick={refetchProjects}>
                  {projectsLoading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              }
              sx={{ pb: 1 }}
            />
            <Divider />
            <CardContent sx={{ pt: 2 }}>
              <ProjectsGrid
                projects={mentorProjects}
                loading={projectsLoading}
                onRefresh={refetchProjects}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MentorDashboard;
