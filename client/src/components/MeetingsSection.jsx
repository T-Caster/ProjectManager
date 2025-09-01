import React, { useEffect, useMemo, useState } from 'react';
import {
  Paper,
  Stack,
  Typography,
  Chip,
  Divider,
  Grid,
  IconButton,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import MeetingCard from './MeetingCard';
import { useTasks } from '../contexts/TaskContext';

const MeetingsSection = ({
  title,
  meetings = [],
  loading = false,
  refreshing = false,
  onRefresh,
  filter,
  onFilterChange,
  // MeetingCard props
  role,
  currentUserId,
  onApprove,
  onDecline,
  onStudentApprove,
  onStudentDecline,
  onReschedule,
  // Custom empty state text
  emptyStateTitle,
  emptyStateMessage,
}) => {
  const counts = useMemo(() => {
    const base = { all: meetings.length, pending: 0, accepted: 0, rejected: 0, held: 0, expired: 0 };
    meetings.forEach((m) => {
      if (m.status === 'pending') base.pending += 1;
      else if (m.status === 'accepted') base.accepted += 1;
      else if (m.status === 'rejected') base.rejected += 1;
      else if (m.status === 'held') base.held += 1;
      else if (m.status === 'expired') base.expired += 1;
    });
    return base;
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    if (!filter || filter === 'all') return meetings;
    return meetings.filter((m) => m.status === filter);
  }, [meetings, filter]);

  // per-meeting tasks count (uses context helper)
  const { countTasksForMeeting } = useTasks();
  const [taskCounts, setTaskCounts] = useState({}); // { [meetingId]: number }

  useEffect(() => {
    let cancelled = false;
    const loadCounts = async () => {
      const ids = filteredMeetings.map((m) => m._id);
      const promises = ids.map(async (id) => {
        try {
          const n = await countTasksForMeeting(id);
          return [id, n];
        } catch {
          return [id, 0];
        }
      });
      const pairs = await Promise.all(promises);
      if (!cancelled) {
        const next = {};
        pairs.forEach(([id, n]) => { next[id] = n; });
        setTaskCounts(next);
      }
    };
    if (filteredMeetings.length) loadCounts();
    else setTaskCounts({});
    return () => { cancelled = true; };
  }, [filteredMeetings, countTasksForMeeting]);

  return (
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
          <Typography variant="h5">{title}</Typography>
          <Chip size="small" label={`All: ${counts.all}`} />
          <Chip size="small" color="warning" label={`Pending: ${counts.pending}`} />
          <Chip size="small" color="success" label={`Scheduled: ${counts.accepted}`} />
          <Chip size="small" color="error" label={`Rejected: ${counts.rejected}`} />
          <Chip size="small" color="default" variant="outlined" label={`Held: ${counts.held}`} />
          <Chip size="small" color="warning" variant="outlined" label={`Expired: ${counts.expired}`} />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(_, v) => v && onFilterChange(v)}
            size="small"
            color="primary"
          >
            <ToggleButton value="all">
              <FilterListIcon fontSize="small" sx={{ mr: 0.5 }} />
              All
            </ToggleButton>
            <ToggleButton value="pending">Pending</ToggleButton>
            <ToggleButton value="accepted">Scheduled</ToggleButton>
            <ToggleButton value="held">Held</ToggleButton>
            <ToggleButton value="expired">Expired</ToggleButton>
            <ToggleButton value="rejected">Rejected</ToggleButton>
          </ToggleButtonGroup>

          {onRefresh && (
            <IconButton
              onClick={onRefresh}
              title="Refresh"
              aria-label="Refresh meetings"
              size="small"
              disabled={refreshing}
            >
              {refreshing ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          )}
        </Stack>
      </Stack>

      <Divider sx={{ my: 2 }} />

      {/* Content */}
      {loading ? (
        <Stack alignItems="center" py={6} spacing={2}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">Loading meetings…</Typography>
        </Stack>
      ) : filteredMeetings.length === 0 ? (
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
          <Stack spacing={1.5} alignItems="center">
            <EventAvailableIcon color="primary" sx={{ fontSize: 36 }} />
            <Typography variant="h6" color="text.secondary">
              {emptyStateTitle || (filter === 'all' ? 'No meetings yet.' : `No ${filter} meetings.`)}
            </Typography>
            {emptyStateMessage && (
              <Typography variant="body2" color="text.secondary">
                {emptyStateMessage}
              </Typography>
            )}
            {onRefresh && (
              <Button sx={{ mt: 2 }} variant="outlined" onClick={onRefresh} disabled={refreshing}>
                Refresh
              </Button>
            )}
          </Stack>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {filteredMeetings.map((meeting) => (
            <Grid item size={{xs: 12, sm: 6, md: 4}} key={meeting._id}>
              <MeetingCard
                meeting={meeting}
                role={role}
                currentUserId={currentUserId}
                onApprove={onApprove ? () => onApprove(meeting._id) : undefined}
                onDecline={onDecline ? () => onDecline(meeting._id) : undefined}
                onStudentApprove={onStudentApprove ? () => onStudentApprove(meeting._id) : undefined}
                onStudentDecline={onStudentDecline ? () => onStudentDecline(meeting._id) : undefined}
                onReschedule={onReschedule ? (payload) => onReschedule(meeting._id, payload) : undefined}
                tasksCount={taskCounts[meeting._id]}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default MeetingsSection;
