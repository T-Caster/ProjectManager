import React, { useContext, useEffect, useMemo, useState, useRef } from 'react';
import {
  Container,
  Paper,
  Stack,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Snackbar,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SchoolIcon from '@mui/icons-material/School';
import BadgeIcon from '@mui/icons-material/Badge';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import { DateTimePicker } from '@mui/x-date-pickers';
import { AuthUserContext } from '../contexts/AuthUserContext';
import MeetingCard from '../components/MeetingCard';
import { Grid } from '@mui/material';
import { useMeetings } from '../contexts/MeetingContext';

const ScheduleMeetingPage = () => {
  const { user } = useContext(AuthUserContext);
  const { meetings, proposeMeeting, refetchMeetings } = useMeetings();

  const [project, setProject] = useState(null);
  const [mentor, setMentor] = useState(null);

  const [proposedDate, setProposedDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // UI state for the meetings section
  const [filter, setFilter] = useState('all'); // 'all' | 'pending' | 'accepted' | 'rejected'
  const [listRefreshing, setListRefreshing] = useState(false);

  const formRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    if (user.project) setProject(user.project);
    if (user.mentor) setMentor(user.mentor);
    refetchMeetings();
  }, [user, refetchMeetings]);

  const disabledReason = useMemo(() => {
    if (!user) return 'Loading user…';
    if (!project) return 'You are not assigned to a project.';
    if (!mentor) return 'No mentor is assigned yet.';
    if (!proposedDate) return 'Pick a date and time.';
    // must be in the future
    const picked = new Date(proposedDate);
    if (!(picked instanceof Date) || Number.isNaN(picked.getTime())) return 'Invalid date/time.';
    if (picked.getTime() <= Date.now()) return 'Meeting must be in the future.';
    return '';
  }, [user, project, mentor, proposedDate]);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError('');
    setSuccess('');
    if (disabledReason) return;
    try {
      setSubmitting(true);
      await proposeMeeting({ projectId: project._id, proposedDate });
      setSuccess('Meeting proposed successfully!');
      setProposedDate(null);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to propose meeting.';
      setError(msg);
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setListRefreshing(true);
    try {
      await refetchMeetings();
    } finally {
      setListRefreshing(false);
    }
  };

  const counts = useMemo(() => {
    const base = { all: meetings?.length || 0, pending: 0, accepted: 0, rejected: 0 };
    (meetings || []).forEach((m) => {
      if (m?.status === 'pending') base.pending += 1;
      else if (m?.status === 'accepted') base.accepted += 1;
      else if (m?.status === 'rejected') base.rejected += 1;
    });
    return base;
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    if (filter === 'all') return meetings || [];
    return (meetings || []).filter((m) => m?.status === filter);
  }, [meetings, filter]);

  // Early guard pages
  if (user && !user.project) {
    return (
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Alert severity="warning" variant="outlined">
          You are not assigned to a project.
        </Alert>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container
        maxWidth="sm"
        sx={{ py: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Loading project details…
          </Typography>
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        sx={(theme) => ({
          p: 3,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.background.paper,
        })}
      >
        {/* Header */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack spacing={0.5}>
            <Typography variant="overline" color="text.secondary">
              Scheduling
            </Typography>
            <Typography variant="h4" sx={{ color: 'primary.main' }}>
              Schedule Meeting
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Propose a date and time to your mentor.
            </Typography>
          </Stack>
          <Chip
            color={mentor ? 'success' : 'default'}
            label={mentor ? 'Mentor Assigned' : 'No Mentor'}
            size="small"
          />
        </Stack>

        {/* Context */}
        <Paper elevation={0} sx={{ p: 2, borderRadius: 2, mb: 2, bgcolor: 'background.default' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <BadgeIcon color="primary" />
              <Typography variant="body2">
                <strong>Project:</strong> {project?.name || '—'}
              </Typography>
            </Stack>
            <Divider flexItem orientation="vertical" sx={{ display: { xs: 'none', sm: 'block' } }} />
            <Stack direction="row" spacing={1} alignItems="center">
              <SchoolIcon color="primary" />
              <Typography variant="body2">
                <strong>Mentor:</strong> {mentor ? mentor.fullName : 'Not assigned'}
              </Typography>
            </Stack>
          </Stack>
        </Paper>

        {/* Form */}
        <Stack spacing={2}>
          <DateTimePicker
            label="Proposed Date & Time"
            value={proposedDate}
            onChange={(v) => setProposedDate(v)}
            ampm={false}
            format="DD/MM/YYYY HH:mm"
            disablePast
            fullWidth
          />

          {error && (
            <Alert severity="error" onClose={() => setError('')}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" onClose={() => setSuccess('')}>
              {success}
            </Alert>
          )}

          <Box display="flex" gap={1} justifyContent="flex-end" mt={1}>
            <Button
              type="submit"
              variant="contained"
              startIcon={!submitting ? <EventAvailableIcon /> : undefined}
              disabled={!!disabledReason || submitting}
            >
              {submitting ? <CircularProgress size={18} /> : 'Propose Meeting'}
            </Button>
          </Box>

          {!!disabledReason && !submitting && (
            <Typography variant="caption" color="text.secondary">
              {disabledReason}
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* Meetings Section */}
      <Paper
        elevation={0}
        sx={(theme) => ({
          mt: 4,
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.background.paper,
        })}
      >
        {/* Section header: title + filters + refresh + counts */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h5">Your Meetings</Typography>
            <Chip size="small" label={`All: ${counts.all}`} />
            <Chip size="small" color="warning" label={`Pending: ${counts.pending}`} />
            <Chip size="small" color="success" label={`Scheduled: ${counts.accepted}`} />
            <Chip size="small" color="error" label={`Rejected: ${counts.rejected}`} />
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup
              value={filter}
              exclusive
              onChange={(_, v) => v && setFilter(v)}
              size="small"
              color="primary"
            >
              <ToggleButton value="all">
                <FilterListIcon fontSize="small" sx={{ mr: 0.5 }} />
                All
              </ToggleButton>
              <ToggleButton value="pending">Pending</ToggleButton>
              <ToggleButton value="accepted">Scheduled</ToggleButton>
              <ToggleButton value="rejected">Rejected</ToggleButton>
            </ToggleButtonGroup>

            <IconButton
              onClick={handleRefresh}
              title="Refresh"
              aria-label="Refresh meetings"
              size="small"
              disabled={listRefreshing}
            >
              {listRefreshing ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Content */}
        {filteredMeetings.length === 0 ? (
          <Paper
            elevation={0}
            sx={(theme) => ({
              p: 4,
              borderRadius: 2,
              border: '1px dashed',
              borderColor: 'sidebar?.active' || 'divider',
              textAlign: 'center',
              background: theme.palette.background.default,
            })}
          >
            <Stack spacing={1.5} alignItems="center">
              <EventAvailableIcon color="primary" sx={{ fontSize: 36 }} />
              <Typography variant="h6" color="text.secondary">
                {filter === 'all'
                  ? 'No meetings yet.'
                  : `No ${filter} meetings.`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Propose a date and time to get started.
              </Typography>
            </Stack>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {filteredMeetings.map((meeting) => (
              <Grid item xs={12} sm={6} md={4} key={meeting._id}>
                <MeetingCard meeting={meeting} />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      {/* Bottom snackbars for brief success messages */}
      <Snackbar open={!!success} autoHideDuration={2500} onClose={() => setSuccess('')} message={success} />
    </Container>
  );
};

export default ScheduleMeetingPage;
