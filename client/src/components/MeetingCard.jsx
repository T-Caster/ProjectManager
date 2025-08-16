import React, { useMemo, useState } from 'react';
import {
  Card, CardHeader, CardContent, CardActions,
  Chip, Stack, Typography, Divider, Box, Avatar, AvatarGroup,
  Button, Link as MuiLink, IconButton,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import RescheduleDialog from './RescheduleDialog';

const PROFILE_ROUTE = (id) => `/profile/${id}`;

const MeetingCard = ({
  role = 'student',
  meeting,
  currentUserId,
  // Mentor actions
  onApprove,
  onDecline,
  // Student actions
  onStudentApprove,
  onStudentDecline,
  // Shared actions
  onReschedule,
  compact = false,
}) => {
  const { _id, status, proposedDate, proposer, mentor, attendees = [], project } = meeting || {};
  const [loading, setLoading] = useState(false);
  const [isRescheduleOpen, setRescheduleOpen] = useState(false);

  const isPending = status === 'pending';
  const isAccepted = status === 'accepted';
  const isDateInPast = dayjs(proposedDate).isBefore(dayjs());

  const canReschedule = (isPending || isAccepted) && !isDateInPast;

  // Determine if the current user is the one who needs to approve the meeting
  const needsMyApproval = useMemo(() => {
    if (!isPending || !proposer?._id || !currentUserId || !mentor?._id) {
      return false;
    }
    const isMyRoleMentor = role === 'mentor';
    const isProposerTheMentor = proposer._id === mentor._id;

    // Mentor needs to approve if a student proposed.
    if (isMyRoleMentor && !isProposerTheMentor) {
      return true;
    }
    // Student needs to approve if the mentor proposed.
    if (!isMyRoleMentor && isProposerTheMentor) {
      return true;
    }
    return false;
  }, [isPending, proposer?._id, currentUserId, mentor?._id, role]);

  const statusConfig = useMemo(() => {
    if (isAccepted && isDateInPast) {
      return { color: 'grey', label: 'Passed' };
    }
    const base = {
      pending: { color: 'warning', label: 'Pending Approval' },
      accepted: { color: 'success', label: 'Scheduled' },
      rejected: { color: 'error', label: 'Rejected' },
    };
    if (needsMyApproval) {
      base.pending.label = 'Awaiting your approval';
    } else if (isPending) {
      // Differentiate between who is waiting
      const waitingFor = role === 'student' ? 'mentor' : 'student(s)';
      base.pending.label = `Pending ${waitingFor}'s approval`;
    }
    return base[status] || { color: 'default', label: status || '—' };
  }, [status, needsMyApproval, isPending, role, isAccepted, isDateInPast]);

  const dateStr = useMemo(
    () => (proposedDate ? dayjs(proposedDate).format('DD/MM/YYYY HH:mm') : '—'),
    [proposedDate]
  );

  const handleAction = async (fn) => {
    if (!fn) return;
    try {
      setLoading(true);
      await fn();
      // No need to set loading to false if component unmounts or state changes,
      // but it's good practice for graceful error handling.
    } finally {
      setLoading(false);
    }
  };

  const handleRescheduleSubmit = async (payload) => {
    await handleAction(() => onReschedule(payload));
    setRescheduleOpen(false);
  };

  return (
    <>
      <Card
        elevation={0}
        sx={(theme) => ({
          position: 'relative',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: theme.palette.background.paper,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        })}
      >
        <Box
          sx={(theme) => ({
            position: 'absolute',
            insetInlineStart: 0,
            top: 0,
            bottom: 0,
            width: 4,
            bgcolor: theme.palette[statusConfig.color]?.main || theme.palette.divider,
            borderTopLeftRadius: 12,
            borderBottomLeftRadius: 12,
          })}
        />

        <CardHeader
          avatar={<EventIcon color={statusConfig.color} />}
          title={
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                {project?.name ? `Project: ${project.name}` : 'Meeting'}
              </Typography>
              <Chip
                size="small"
                label={statusConfig.label}
                color={statusConfig.color}
                variant="outlined"
              />
            </Stack>
          }
          subheader={
            <Typography variant="body2" color="text.secondary">
              Proposed by:{' '}
              {proposer?._id ? (
                <MuiLink component={Link} to={PROFILE_ROUTE(proposer._id)} underline="hover">
                  {proposer.fullName}
                </MuiLink>
              ) : (
                proposer?.fullName || '—'
              )}
            </Typography>
          }
          sx={{ pb: compact ? 1 : 1.25 }}
        />

        <Divider />

        <CardContent sx={{ flexGrow: 1, pt: 1.5, pb: 0, display: 'grid', gap: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
              Date & Time:
            </Typography>
            <Typography variant="body2">{dateStr}</Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
              Mentor:
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar src={mentor?.avatarUrl} alt={mentor?.fullName} sx={{ width: 24, height: 24 }} />
              <Typography variant="body2">{mentor?.fullName || '—'}</Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
             <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90 }}>
              Attendees:
            </Typography>
            <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 28, height: 28 } }}>
              {attendees.map((a) => (
                <Avatar key={a._id} src={a.avatarUrl} alt={a.fullName}>
                  {a.fullName?.[0]}
                </Avatar>
              ))}
            </AvatarGroup>
          </Stack>

          {meeting.lastRescheduleReason && (
            <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ mt: 1 }}>
              <InfoOutlinedIcon fontSize="small" color="action" sx={{ mt: 0.25 }} />
              <Typography variant="caption" color="text.secondary">
                <strong>Reschedule reason:</strong> {meeting.lastRescheduleReason}
              </Typography>
            </Stack>
          )}
        </CardContent>

        <CardActions sx={{ px: 2, py: 1.25, justifyContent: 'flex-end', gap: 1 }}>
          {canReschedule && (
            <Button
              variant="text"
              size="small"
              startIcon={<MoreTimeIcon />}
              onClick={() => setRescheduleOpen(true)}
              disabled={loading}
            >
              Reschedule
            </Button>
          )}

          {/* Mentor actions */}
          {needsMyApproval && role === 'mentor' && (
            <>
              <Button variant="outlined" color="error" disabled={loading} onClick={() => handleAction(onDecline)}>
                Decline
              </Button>
              <Button variant="contained" color="primary" disabled={loading} onClick={() => handleAction(onApprove)}>
                Approve
              </Button>
            </>
          )}

          {/* Student actions */}
          {needsMyApproval && role === 'student' && (
            <>
              <Button variant="outlined" color="error" disabled={loading} onClick={() => handleAction(onStudentDecline)}>
                Decline
              </Button>
              <Button variant="contained" color="primary" disabled={loading} onClick={() => handleAction(onStudentApprove)}>
                Approve
              </Button>
            </>
          )}
        </CardActions>
      </Card>

      {onReschedule && (
        <RescheduleDialog
          open={isRescheduleOpen}
          onClose={() => setRescheduleOpen(false)}
          onSubmit={handleRescheduleSubmit}
          meeting={meeting}
        />
      )}
    </>
  );
};

export default MeetingCard;
