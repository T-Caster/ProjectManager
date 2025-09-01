import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Box,
  Container,
  Stack,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Avatar,
  AvatarGroup,
  IconButton,
  Tooltip,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  CircularProgress,
  useTheme,
} from '@mui/material';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import RefreshIcon from '@mui/icons-material/Refresh';
import FlagIcon from '@mui/icons-material/Flag';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupIcon from '@mui/icons-material/Group';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';

import projectService from '../../services/projectService';
import { onEvent, offEvent } from '../../services/socketService';
import { AuthUserContext } from '../../contexts/AuthUserContext';
import { useProjects } from '../../contexts/ProjectContext';
import { useMeetings } from '../../contexts/MeetingContext';

// small pieces
import { Section, InfoPill, EmptyInline } from '../../components/SmallComponents';

const statusMeta = {
  proposal: { label: 'Proposal', color: 'warning' },
  specification: { label: 'Specification', color: 'info' },
  code: { label: 'Code', color: 'primary' },
  presentation: { label: 'Presentation', color: 'secondary' },
  done: { label: 'Done', color: 'success' },
};
const STAGES = ['proposal', 'specification', 'code', 'presentation', 'done'];

const StudentDashboard = () => {
  const theme = useTheme();
  const { user } = useContext(AuthUserContext);
  const projectId = user?.project?._id;

  const { updateProjectStatus } = useProjects();
  const { meetings: allMeetings, refetchMeetings } = useMeetings();

  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [meetingFilter, setMeetingFilter] = useState('all'); // reserved for parity
  const [savingStatus, setSavingStatus] = useState(false);
  const [error, setError] = useState(null);
  const [noProject, setNoProject] = useState(false);

  const canEditStatus = false; // students can’t edit

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

  const meetings = useMemo(
    () => (allMeetings || []).filter((m) => m.project?._id === projectId),
    [allMeetings, projectId]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    const handleProjectUpdate = (updatedProject) => {
      if (updatedProject._id === projectId) setProject(updatedProject);
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

  const stageIndex = project ? STAGES.indexOf(project.status) : 0;
  const stagePct = project ? ((stageIndex + 1) / STAGES.length) * 100 : 0;
  const sMeta = project ? statusMeta[project.status] ?? { label: project.status, color: 'info' } : null;

  // -------- states
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Card elevation={0} sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, p: 4 }}>
          <Stack alignItems="center" spacing={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Loading your dashboard…</Typography>
          </Stack>
        </Card>
      </Container>
    );
  }

  if (noProject) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Card
          elevation={0}
          sx={{
            borderRadius: 3,
            border: `1px dashed ${theme.palette.divider}`,
            bgcolor: theme.palette.background.default,
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              px: { xs: 3, md: 4 },
              py: { xs: 4, md: 5 },
              background: `linear-gradient(140deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 60%, ${theme.palette.primary.dark} 100%)`,
              color: theme.palette.primary.contrastText,
            }}
          >
            <Stack spacing={1}>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>No project… yet ✨</Typography>
              <Typography variant="body1" sx={{ opacity: 0.95, maxWidth: 700 }}>
                Submit a proposal and, once approved, your project hub will appear here with tasks, meetings, and progress.
              </Typography>
              <Stack direction="row" spacing={1.5} sx={{ pt: 1 }}>
                <Button component={Link} to="/propose-project" variant="contained" color="secondary" startIcon={<TaskAltIcon />}>
                  Propose a Project
                </Button>
                <Button component={Link} to="/profile" variant="outlined" color="inherit" startIcon={<PersonOutlineIcon />}>
                  My Profile
                </Button>
              </Stack>
            </Stack>
          </Box>

          <Box sx={{ px: { xs: 3, md: 4 }, py: 3 }}>
            <Alert icon={<InfoOutlinedIcon />} severity="info" variant="outlined">
              You’ll be able to schedule meetings only after your project is created.
            </Alert>
          </Box>
        </Card>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Card elevation={0} sx={{ p: 3, borderRadius: 3, border: `1px solid ${theme.palette.divider}` }}>
          <Alert
            severity="error"
            action={<Button size="small" variant="outlined" onClick={load}>Try again</Button>}
          >
            Failed to load your project. Please try again.
          </Alert>
        </Card>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="warning">Project not found.</Alert>
      </Container>
    );
  }

  // -------- main
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Hero */}
      <Box
        sx={{
          mb: 3,
          p: { xs: 2.5, md: 3 },
          borderRadius: 3,
          overflow: 'hidden',
          background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
          border: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
        >
          <Stack spacing={1}>
            <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
              <Typography variant="h4" sx={{ fontWeight: 700 }}>{project.name}</Typography>
              <Chip size="small" color={sMeta.color} label={sMeta.label} />
              {!!project.snapshots?.approvedAt && (
                <Chip size="small" variant="outlined" color="success" icon={<FlagIcon />} label="Approved" />
              )}
            </Stack>

            <Box sx={{ mt: 0.5, width: '100%', maxWidth: 420 }}>
              <LinearProgress
                variant="determinate"
                value={((STAGES.indexOf(project.status) + 1) / STAGES.length) * 100}
                sx={{ height: 8, borderRadius: 999, backgroundColor: theme.palette.action.focus }}
              />
              <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.75 }}>
                {STAGES.map((s) => (
                  <Typography key={s} variant="caption" color={project.status === s ? 'text.primary' : 'text.secondary'} sx={{ textTransform: 'capitalize' }}>
                    {statusMeta[s]?.label || s}
                  </Typography>
                ))}
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <span>
                <IconButton onClick={load} disabled={loading}>
                  {loading ? <CircularProgress size={18} /> : <RefreshIcon />}
                </IconButton>
              </span>
            </Tooltip>
            <Button component={Link} to={`/tasks?projectId=${project._id}`} variant="contained" startIcon={<AssignmentTurnedInIcon />}>
              View Tasks
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Content */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} alignItems="stretch">
        {/* Left */}
        <Stack flex={1} spacing={2.5}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardHeader title="Overview" />
            <Divider />
            <CardContent>
              <Section title="Background" text={project.background} />
              <Section title="Objectives" text={project.objectives} />
              <Divider sx={{ my: 2 }} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <InfoPill icon={<PersonOutlineIcon />} label="Mentor" value={project.mentor?.fullName || '—'} />
                <InfoPill
                  icon={<GroupIcon />}
                  label="Students"
                  value={(project.students || []).length ? (project.students || []).map((s) => s.fullName).join(', ') : '—'}
                />
              </Stack>
              {!!(project.students || []).length && (
                <AvatarGroup max={6} sx={{ mt: 1 }}>
                  {(project.students || []).map((s) => (
                    <Avatar key={s._id} src={s.profilePic}>{s.fullName?.[0]}</Avatar>
                  ))}
                </AvatarGroup>
              )}
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardHeader
              title="Meetings"
              // Students may schedule meetings only when they have a project — which we do here.
              action={
                <Button component={Link} to="/schedule-meeting" size="small" variant="outlined" startIcon={<CalendarMonthIcon />}>
                  New Meeting
                </Button>
              }
            />
            <Divider />
            <CardContent>
              {meetings.length === 0 ? (
                <EmptyInline icon={<InfoOutlinedIcon />} text="No meetings yet. Schedule one to kick things off." />
              ) : (
                <List dense disablePadding>
                  {meetings.slice(0, 5).map((m) => (
                    <ListItem
                      key={m._id}
                      sx={{ px: 0, py: 1, '&:not(:last-of-type)': { borderBottom: `1px dashed ${theme.palette.divider}` } }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CalendarMonthIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={m.title || 'Meeting'}
                        secondary={new Date(m.when).toLocaleString()}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        secondaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                      />
                      <Chip
                        size="small"
                        label={m.status}
                        color={
                          m.status === 'accepted' ? 'success'
                            : m.status === 'pending' ? 'warning'
                            : m.status === 'rejected' ? 'error'
                            : 'default'
                        }
                        variant="outlined"
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Stack>

        {/* Right */}
        <Stack sx={{ width: { xs: '100%', md: 360 }, flexShrink: 0 }} spacing={2.5}>
          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardHeader title="Status" />
            <Divider />
            <CardContent>
              <Stack spacing={1}>
                <Chip color={sMeta.color} label={sMeta.label} size="small" sx={{ width: 'fit-content' }} />
                <Typography variant="caption" color="text.secondary">Your overall progress through stages</Typography>
                <LinearProgress
                  variant={savingStatus ? 'indeterminate' : 'determinate'}
                  value={savingStatus ? undefined : stagePct}
                  sx={{ height: 8, borderRadius: 999 }}
                />
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined" sx={{ borderRadius: 3 }}>
            <CardHeader title="Quick Links" />
            <Divider />
            <CardContent>
              <Stack spacing={1}>
                <Button component={Link} to={`/tasks?projectId=${project._id}`} fullWidth variant="outlined" startIcon={<AssignmentTurnedInIcon />}>
                  Open Tasks
                </Button>
                <Button component={Link} to="/profile" fullWidth variant="outlined" startIcon={<PersonOutlineIcon />}>
                  My Profile
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {!!project.snapshots?.approvedAt && (
            <Card variant="outlined" sx={{ borderRadius: 3 }}>
              <CardHeader title="Approval" />
              <Divider />
              <CardContent>
                <Stack direction="row" spacing={1} alignItems="center">
                  <FlagIcon color="success" />
                  <Typography variant="body2">
                    Approved on <strong>{new Date(project.snapshots.approvedAt).toLocaleDateString()}</strong>
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      </Stack>
    </Container>
  );
};

export default StudentDashboard;
