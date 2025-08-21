import React, { useMemo } from 'react';
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
import MeetingsIcon from '@mui/icons-material/VideoChat';
import MeetingCard from './MeetingCard';

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
      switch (m.status) {
        case 'pending':
          base.pending += 1; break;
        case 'accepted':
          base.accepted += 1; break;
        case 'rejected':
          base.rejected += 1; break;
        case 'held':
          base.held += 1; break;
        case 'expired':
          base.expired += 1; break;
        default:
          break;
      }
    });
    return base;
  }, [meetings]);

  const filteredMeetings = useMemo(() => {
    if (!filter || filter === 'all') return meetings;
    return meetings.filter((m) => m.status === filter);
  }, [meetings, filter]);

  const prettyFilter = (f) => {
    switch (f) {
      case 'pending': return 'Pending';
      case 'accepted': return 'Scheduled';
      case 'rejected': return 'Rejected';
      case 'held': return 'Held';
      case 'expired': return 'Expired';
      default: return 'All';
    }
  };

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
      {/* Section header: title + counts + filters + refresh */}
      <Stack spacing={1.25}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h5">{title}</Typography>
            <Chip size="small" label={`All: ${counts.all}`} />
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
              <ToggleButton value="rejected">Rejected</ToggleButton>
              <ToggleButton value="held">Held</ToggleButton>
              <ToggleButton value="expired">Expired</ToggleButton>
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

        {/* Compact legend row so all labels are visible at a glance */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip size="small" color="warning" label={`Pending: ${counts.pending}`} />
          <Chip size="small" color="success" label={`Scheduled: ${counts.accepted}`} />
          <Chip size="small" color="error" label={`Rejected: ${counts.rejected}`} />
          <Chip size="small" variant="outlined" label={`Held: ${counts.held}`} />
          <Chip size="small" color="warning" variant="outlined" label={`Expired: ${counts.expired}`} />
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
            {filter === 'held' ? (
              <MeetingsIcon color="action" sx={{ fontSize: 36 }} />
            ) : (
              <EventAvailableIcon color="primary" sx={{ fontSize: 36 }} />
            )}
            <Typography variant="h6" color="text.secondary">
              {emptyStateTitle || (filter === 'all' ? 'No meetings yet.' : `No ${prettyFilter(filter)} meetings.`)}
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
            <Grid item xs={12} sm={6} md={4} key={meeting._id}>
              <MeetingCard
                meeting={meeting}
                role={role}
                currentUserId={currentUserId}
                onApprove={onApprove ? () => onApprove(meeting._id) : undefined}
                onDecline={onDecline ? () => onDecline(meeting._id) : undefined}
                onStudentApprove={onStudentApprove ? () => onStudentApprove(meeting._id) : undefined}
                onStudentDecline={onStudentDecline ? () => onStudentDecline(meeting._id) : undefined}
                onReschedule={onReschedule ? (payload) => onReschedule(meeting._id, payload) : undefined}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Paper>
  );
};

export default MeetingsSection;
