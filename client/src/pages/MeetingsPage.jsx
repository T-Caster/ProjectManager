// pages/MeetingsPage.jsx (mentor)
import React, { useEffect, useMemo, useState } from 'react';
import {
  Container, Paper, Stack, Typography, Chip, Divider, Grid,
  IconButton, CircularProgress, ToggleButton, ToggleButtonGroup, Snackbar, Alert, Button,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import MeetingCard from '../components/MeetingCard';
import meetingService from '../services/meetingService';
import dayjs from 'dayjs';
import { onEvent, offEvent } from '../services/socketService';

const normalize = (m) => ({
  ...m,
  ts: dayjs(m?.proposedDate).valueOf(),
});

const byTs = (a, b) => a.ts - b.ts;

const MeetingsPage = () => {
  const [meetings, setMeetings] = useState([]);
  const [filter, setFilter] = useState('all'); // default to all
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');

  const fetchMeetings = async () => {
    setLoading(true);
    try {
      const arr = await meetingService.getMeetingsForMentor();
      setMeetings((Array.isArray(arr) ? arr : []).map(normalize).sort(byTs));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const refreshMeetings = async () => {
    setRefreshing(true);
    try {
      await fetchMeetings();
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMeetings();

    const handleNew = (m) => {
      // Only add if this mentor is the mentor (server already ensures)
      setMeetings((prev) => {
        const next = [...prev];
        const idx = next.findIndex(x => x._id === m._id);
        const nm = normalize(m);
        if (idx >= 0) next[idx] = nm; else next.push(nm);
        next.sort(byTs);
        return next;
      });
    };

    const handleUpdated = (m) => {
      setMeetings((prev) => {
        const next = [...prev];
        const idx = next.findIndex(x => x._id === m._id);
        const nm = normalize(m);
        if (idx >= 0) next[idx] = nm; else next.push(nm);
        next.sort(byTs);
        return next;
      });
    };

    onEvent('newMeeting', handleNew);
    onEvent('meetingUpdated', handleUpdated);
    return () => {
      offEvent('newMeeting', handleNew);
      offEvent('meetingUpdated', handleUpdated);
    };
  }, []);

  const counts = useMemo(() => {
    const base = { all: meetings.length, pending: 0, accepted: 0, rejected: 0 };
    meetings.forEach((m) => {
      if (m.status === 'pending') base.pending += 1;
      else if (m.status === 'accepted') base.accepted += 1;
      else if (m.status === 'rejected') base.rejected += 1;
    });
    return base;
  }, [meetings]);

  const filtered = useMemo(() => {
    if (filter === 'all') return meetings;
    return meetings.filter((m) => m.status === filter);
  }, [meetings, filter]);

  const approve = async (id) => {
    // optimistic
    setMeetings((prev) =>
      prev.map((m) => (m._id === id ? { ...m, status: 'accepted' } : m))
    );
    try {
      const res = await meetingService.approveMeeting(id);
      setToast('Meeting approved');
      // server emits meetingUpdated; local state already updated
    } catch (e) {
      // revert on failure
      await fetchMeetings();
    }
  };

  const decline = async (id) => {
    // optimistic
    setMeetings((prev) =>
      prev.map((m) => (m._id === id ? { ...m, status: 'rejected' } : m))
    );
    try {
      const res = await meetingService.declineMeeting(id);
      setToast('Meeting declined');
    } catch (e) {
      await fetchMeetings();
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper
        elevation={0}
        sx={(theme) => ({
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.background.paper,
        })}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h4" sx={{ color: 'primary.main' }}>
              Meetings
            </Typography>
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
              onClick={refreshMeetings}
              title="Refresh"
              aria-label="Refresh meetings"
              size="small"
              disabled={refreshing}
            >
              {refreshing ? <CircularProgress size={18} /> : <RefreshIcon />}
            </IconButton>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {loading ? (
          <Stack alignItems="center" py={6} spacing={2}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">Loading meetings…</Typography>
          </Stack>
        ) : filtered.length === 0 ? (
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
            <Typography variant="h6" color="text.secondary">
              {filter === 'all' ? 'No meetings.' : `No ${filter} meetings.`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              New meeting requests will appear here.
            </Typography>
            <Button sx={{ mt: 2 }} variant="outlined" onClick={refreshMeetings}>
              Refresh
            </Button>
          </Paper>
        ) : (
          <Grid container spacing={2}>
            {filtered.map((m) => (
              <Grid item xs={12} sm={6} md={4} key={m._id}>
                <MeetingCard
                  role="mentor"
                  meeting={m}
                  onApprove={() => approve(m._id)}
                  onDecline={() => decline(m._id)}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Paper>

      <Snackbar
        open={!!toast}
        autoHideDuration={2000}
        onClose={() => setToast('')}
        message={toast}
      />
    </Container>
  );
};

export default MeetingsPage;
