import React, { useEffect, useState, useContext, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Chip,
  Stack,
  Divider,
  Avatar,
  AvatarGroup,
  Button,
  Grid,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
} from '@mui/material';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import FlagIcon from '@mui/icons-material/Flag';
import RefreshIcon from '@mui/icons-material/Refresh';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import projectService from '../services/projectService';
import meetingService from '../services/meetingService';
import MeetingsSection from '../components/MeetingsSection';
import { AuthUserContext } from '../contexts/AuthUserContext';
import { useProjects } from '../contexts/ProjectContext';

dayjs.extend(relativeTime);

const statusMeta = {
  proposal: { label: 'Proposal', color: 'warning' },
  specification: { label: 'Specification', color: 'info' },
  code: { label: 'Code', color: 'primary' },
  presentation: { label: 'Presentation', color: 'secondary' },
  done: { label: 'Done', color: 'success' },
};

const ProjectPage = () => {
  const { projectId } = useParams();
  const { user } = useContext(AuthUserContext);
  const { updateProjectStatus } = useProjects();

  const [project, setProject] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meetingFilter, setMeetingFilter] = useState('all');
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState(null);

  const canEditStatus = user?.role === 'mentor' && user?._id === project?.mentor?._id;

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectData = await projectService.getProject(projectId);
      const meetingsData = await meetingService.getMeetingsByProject(projectId);
      setProject(projectData);
      setMeetings(Array.isArray(meetingsData) ? meetingsData : []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const meetingCounts = useMemo(() => {
    const base = { all: 0, pending: 0, accepted: 0, held: 0, expired: 0, rejected: 0 };
    (meetings || []).forEach((m) => {
      base.all += 1;
      if (base[m.status] != null) base[m.status] += 1;
    });
    return base;
  }, [meetings]);

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

  const sMeta = statusMeta[project.status] || { label: project.status, color: 'default' };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header / Title row */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="h4" sx={{ lineHeight: 1.2 }}>{project.name}</Typography>
          <Chip size="small" color={sMeta.color} label={sMeta.label} variant="outlined" />
          {!!project.snapshots?.approvedAt && (
            <Chip
              size="small"
              icon={<FlagIcon />}
              label={`Approved ${dayjs(project.snapshots.approvedAt).fromNow()}`}
              variant="outlined"
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Refresh">
            <span>
              <IconButton onClick={load} disabled={loading}>
                {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>
          <Button
            component={Link}
            to={`/tasks?projectId=${project._id}`}
            variant="contained"
            startIcon={<AssignmentTurnedInIcon />}
          >
            {user?.role === 'mentor' ? 'Manage Tasks' : 'View Tasks'}
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={3} alignItems="stretch">
        {/* Left: Details card */}
        <Grid item size={{ xs: 12, md: 8 }} sx={{ display: 'flex' }}>
          <Card
            elevation={0}
            sx={(theme) => ({
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: theme.palette.background.paper,
            })}
          >
            <CardHeader
              title="Project Overview"
              subheader={project.proposal ? 'Created from an approved proposal' : ''}
              action={
                <Chip
                  size="small"
                  color={sMeta.color}
                  label={sMeta.label}
                  variant="outlined"
                />
              }
            />
            <Divider />
            <CardContent sx={{ flexGrow: 1 }}>
              <Stack spacing={2}>
                <Box>
                  <Typography variant="overline" color="text.secondary">Background</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {project.background}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="overline" color="text.secondary">Objectives</Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {project.objectives}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">Mentor</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <Avatar
                        src={project.mentor?.avatarUrl}
                        alt={project.mentor?.fullName}
                        sx={{ width: 28, height: 28 }}
                      />
                      <Typography variant="body2">{project.mentor?.fullName || '—'}</Typography>
                    </Stack>
                  </Grid>
                  <Grid item size={{ xs: 12, md: 6 }}>
                    <Typography variant="overline" color="text.secondary">Students</Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28 } }}>
                        {(project.students || []).map((s) => (
                          <Avatar key={s._id} src={s.avatarUrl} alt={s.fullName}>
                            {s.fullName?.[0]}
                          </Avatar>
                        ))}
                      </AvatarGroup>
                      <Typography variant="body2" noWrap>
                        {(project.students || []).map((s) => s.fullName).join(', ') || '—'}
                      </Typography>
                    </Stack>
                  </Grid>
                </Grid>
              </Stack>
            </CardContent>
            {/* Optional footer space (kept empty so Actions align if added later) */}
          </Card>
        </Grid>

        {/* Right: Status + quick stats */}
        <Grid item size={{ xs: 12, md: 4 }} sx={{ display: 'flex' }}>
          <Card
            elevation={0}
            sx={(theme) => ({
              flex: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: theme.palette.background.paper,
            })}
          >
            <CardHeader title="Status & Insights" />
            <Divider />
            <CardContent sx={{ flexGrow: 1 }}>
              {/* Editable status (mentor only) */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="overline" color="text.secondary">Project Status</Typography>
                {canEditStatus ? (
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                      label="Status"
                      value={project.status}
                      onChange={handleStatusChange}
                      disabled={savingStatus}
                      size="small"
                    >
                      <MenuItem value="proposal">Proposal</MenuItem>
                      <MenuItem value="specification">Specification</MenuItem>
                      <MenuItem value="code">Code</MenuItem>
                      <MenuItem value="presentation">Presentation</MenuItem>
                      <MenuItem value="done">Done</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Box>
                    <Chip sx={{ mt: 1 }} size="small" color={sMeta.color} label={sMeta.label} />
                  </Box>
                )}
              </Box>

              {/* Quick meeting stats */}
              <Typography variant="overline" color="text.secondary">Meetings</Typography>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  mt: 1,
                }}
              >
                <Chip size="small" icon={<EventNoteIcon />} label={`All: ${meetingCounts.all}`} />
                <Chip size="small" color="warning" label={`Pending: ${meetingCounts.pending}`} />
                <Chip size="small" color="success" label={`Scheduled: ${meetingCounts.accepted}`} />
                <Chip size="small" label={`Held: ${meetingCounts.held}`} />
                <Chip size="small" color="warning" variant="outlined" label={`Expired: ${meetingCounts.expired}`} />
                <Chip size="small" color="error" label={`Rejected: ${meetingCounts.rejected}`} />
              </Box>
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, mt: 'auto' }}>
              <Button
                component={Link}
                to={`/tasks?projectId=${project._id}`}
                variant="outlined"
                size="small"
                startIcon={<AssignmentTurnedInIcon />}
              >
                {user?.role === 'mentor' ? 'Manage Tasks' : 'View Tasks'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Meetings list */}
      <Box sx={{ mt: 3 }}>
        <MeetingsSection
          title="Project Meetings"
          meetings={meetings}
          loading={false}
          role={user.role}
          currentUserId={user?._id}
          filter={meetingFilter}
          onFilterChange={setMeetingFilter}
          onRefresh={load}
          emptyStateTitle="No meetings yet."
          emptyStateMessage="When a meeting is proposed, it will appear here."
        />
      </Box>
    </Container>
  );
};

export default ProjectPage;
