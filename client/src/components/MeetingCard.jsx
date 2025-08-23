import React, { useMemo, useState } from 'react';
import {
  Card, CardHeader, CardContent, CardActions,
  Chip, Stack, Typography, Divider, Box, Avatar, AvatarGroup,
  Button, Link as MuiLink,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import MoreTimeIcon from '@mui/icons-material/MoreTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import dayjs from 'dayjs';
import { Link, Link as RouterLink } from 'react-router-dom';
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
  // NEW: optional precomputed tasks count (fallback to showing chip without number)
  tasksCount,
  compact = false,
}) => {
  const { _id, status, proposedDate, proposer, mentor, attendees = [], project } = meeting || {};
  const [loading, setLoading] = useState(false);
  const [isRescheduleOpen, setRescheduleOpen] = useState(false);

  const isPending = status === 'pending';
  const isDateInPast = dayjs(proposedDate).isBefore(dayjs());

  const needsMyApproval = useMemo(() => {
    if (!isPending || !proposer?._id || !currentUserId || !mentor?._id) {
      return false;
    }
    const isMyRoleMentor = role === 'mentor';
    const isProposerTheMentor = proposer._id === mentor._id;
    if (isMyRoleMentor && !isProposerTheMentor) return true;
    if (!isMyRoleMentor && isProposerTheMentor) return true;
    return false;
  }, [isPending, proposer?._id, currentUserId, mentor?._id, role]);

  const statusConfig = useMemo(() => {
    const map = {
      pending: { color: 'warning', label: 'Pending Approval' },
      accepted: { color: 'success', label: 'Scheduled' },
      rejected: { color: 'error', label: 'Rejected' },
      held: { color: 'default', label: 'Held' },
      expired: { color: 'warning', label: 'Expired – not approved' },
    };
    if (status === 'pending') {
      if (needsMyApproval) map.pending.label = 'Awaiting your approval';
      else {
        const waitingFor = role === 'student' ? 'mentor' : 'student(s)';
        map.pending.label = `Pending ${waitingFor}'s approval`;
      }
    }
    return map[status] || { color: 'default', label: status || '—' };
  }, [status, needsMyApproval, role]);

  const dateStr = useMemo(
    () => (proposedDate ? dayjs(proposedDate).format('DD/MM/YYYY HH:mm') : '—'),
    [proposedDate]
  );

  const caption = useMemo(() => {
    if (status === 'held' && proposedDate) return `Took place on ${dayjs(proposedDate).format('DD/MM/YYYY HH:mm')}`;
    if (status === 'expired') return 'Request expired. Propose a new time.';
    return '';
  }, [status, proposedDate]);

  const showApproveDecline = status === 'pending' && needsMyApproval;

  const showReschedule =
    (status === 'pending' || status === 'accepted') ? !isDateInPast
      : status === 'expired' ? true
        : false;

  const showTasksButton = status === 'held'; // only allow navigation to tasks when the meeting is accepted and its time has passed

  const handleAction = async (fn) => {
    if (!fn) return;
    try {
      setLoading(true);
      await fn();
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
                {project?.name ? `Meeting: ${project.name}` : 'Meeting'}
              </Typography>
              <Chip size="small" label={statusConfig.label} color={statusConfig.color} variant="outlined" />
              {/* NEW: Tasks chip */}
              <Chip
                size="small"
                icon={<AssignmentTurnedInIcon />}
                component={RouterLink}
                clickable
                to={`/tasks?meetingId=${_id}`}
                label={Number.isInteger(tasksCount) ? `Tasks: ${tasksCount}` : 'Tasks'}
                variant="outlined"
                sx={{ ml: 0.5 }}
              />
            </Stack>
          }
          subheader={
            <Stack spacing={0.25}>
              <Typography variant="body2" color="text.secondary">
                Proposed by{' '}
                {proposer?._id ? (
                  <MuiLink component={Link} to={PROFILE_ROUTE(proposer._id)} underline="hover">
                    {proposer.fullName}
                  </MuiLink>
                ) : (
                  proposer?.fullName || '—'
                )}
              </Typography>
              {!!caption && (
                <Typography variant="caption" color="text.secondary">
                  {caption}
                </Typography>
              )}
            </Stack>
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
            <Typography variant="body2" noWrap>
              {attendees
                .map((a) =>
                  a._id ? (
                    <MuiLink key={a._id} component={Link} to={PROFILE_ROUTE(a._id)} underline="hover">
                      {a.fullName}
                    </MuiLink>
                  ) : (
                    a.fullName
                  )
                )
                .reduce((prev, curr) => [prev, ', ', curr])}
            </Typography>
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
          {showTasksButton && (
            <Button
              component={RouterLink}
              to={`/tasks?meetingId=${_id}`}
              size="small"
              variant="outlined"
            >
              {role === 'mentor' ? 'Manage tasks' : 'View tasks'}
            </Button>
          )}

          {showReschedule && (
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

          {showApproveDecline && role === 'mentor' && (
            <>
              <Button variant="outlined" color="error" disabled={loading} onClick={() => handleAction(onDecline)}>
                Decline
              </Button>
              <Button variant="contained" color="primary" disabled={loading} onClick={() => handleAction(onApprove)}>
                Approve
              </Button>
            </>
          )}

          {showApproveDecline && role === 'student' && (
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
