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
} from '@mui/material';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SchoolIcon from '@mui/icons-material/School';
import BadgeIcon from '@mui/icons-material/Badge';
import { DateTimePicker } from '@mui/x-date-pickers';
import { AuthUserContext } from '../contexts/AuthUserContext';
import { useMeetings } from '../contexts/MeetingContext';
import MeetingsSection from '../components/MeetingsSection';

const ScheduleMeetingPage = () => {
  const { user } = useContext(AuthUserContext);
  const {
    meetings,
    proposeMeeting,
    refetchMeetings,
    postponeMeeting,
    studentApproveMeeting,
    studentDeclineMeeting,
  } = useMeetings();

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

      <MeetingsSection
        title="Your Meetings"
        meetings={meetings}
        loading={!meetings}
        refreshing={listRefreshing}
        onRefresh={handleRefresh}
        filter={filter}
        onFilterChange={setFilter}
        // MeetingCard props
        role="student"
        currentUserId={user?._id}
        onReschedule={postponeMeeting}
        onStudentApprove={studentApproveMeeting}
        onStudentDecline={studentDeclineMeeting}
        // Custom empty state text
        emptyStateTitle={filter === 'all' ? 'No meetings yet.' : `No ${filter} meetings.`}
        emptyStateMessage="Propose a date and time above to get started."
      />

      {/* Bottom snackbars for brief success messages */}
      <Snackbar open={!!success} autoHideDuration={2500} onClose={() => setSuccess('')} message={success} />
    </Container>
  );
};

export default ScheduleMeetingPage;
