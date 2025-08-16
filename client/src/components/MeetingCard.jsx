// components/MeetingCard.jsx
import React, { useMemo, useState } from 'react';
import {
  Card, CardHeader, CardContent, CardActions,
  Chip, Stack, Typography, Divider, Box, Avatar, AvatarGroup,
  Button, Link as MuiLink,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

const PROFILE_ROUTE = (id) => `/profile/${id}`;

/**
 * MeetingCard (unified for student & mentor)
 *
 * Props:
 * - role: 'student' | 'mentor'
 * - meeting: {
 *     _id: string,
 *     status: 'pending'|'accepted'|'rejected',
 *     proposedDate: string|Date,
 *     proposer: { _id?: string, fullName: string, avatarUrl?: string },
 *     mentor: { _id?: string, fullName: string, avatarUrl?: string },
 *     attendees: Array<{ _id: string, fullName: string, avatarUrl?: string }>,
 *     project?: { _id?: string, name?: string }
 *   }
 * - onApprove?: () => Promise<any> | void   // used when role === 'mentor'
 * - onDecline?: () => Promise<any> | void   // used when role === 'mentor'
 * - compact?: boolean
 */
const MeetingCard = ({ role = 'student', meeting, onApprove, onDecline, compact = false }) => {
  const { status, proposedDate, proposer, mentor, attendees = [], project } = meeting || {};
  const [loading, setLoading] = useState(false);

  const statusCfg = {
    pending:  { color: 'warning', label: role === 'mentor' ? 'Awaiting your decision' : 'Pending mentor decision' },
    accepted: { color: 'success', label: 'Scheduled' },
    rejected: { color: 'error',   label: 'Rejected' },
  };
  const s = statusCfg[status] || { color: 'default', label: status || '—' };

  const dateStr = useMemo(
    () => (proposedDate ? dayjs(proposedDate).format('DD/MM/YYYY HH:mm') : '—'),
    [proposedDate]
  );

  const maxAvatars = 3;
  const visible = (attendees || []).slice(0, maxAvatars);
  const extra = Math.max((attendees || []).length - maxAvatars, 0);

  const handle = async (fn) => {
    if (!fn) return;
    try {
      setLoading(true);
      await fn();
    } finally {
      setLoading(false);
    }
  };

  const showActions = role === 'mentor';

  return (
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
        transition: 'none',
        '&:hover': { boxShadow: 'none' },
      })}
    >
      {/* Status accent */}
      <Box
        sx={(theme) => ({
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: theme.palette[s.color]?.main || theme.palette.divider,
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
        })}
      />

      <CardHeader
        avatar={<EventIcon color={s.color} />}
        title={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {project?.name ? `Project: ${project.name}` : 'Meeting'}
            </Typography>
            <Chip
              size="small"
              label={s.label}
              color={s.color}
              variant="outlined"
              sx={{ px: 0.75, '& .MuiChip-label': { fontWeight: 600 } }}
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

      <CardContent
        sx={{
          flexGrow: 1,
          pt: compact ? 1.25 : 1.5,
          pb: 0,
          display: 'grid',
          gap: 1,
          gridTemplateRows: 'auto auto auto',
        }}
      >
        {/* Date */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
            Date & Time:
          </Typography>
          <Typography variant="body2">{dateStr}</Typography>
        </Stack>

        {/* Mentor */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
            Mentor:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar src={mentor?.avatarUrl} alt={mentor?.fullName} sx={{ width: 24, height: 24 }} />
            {mentor?._id ? (
              <MuiLink component={Link} to={PROFILE_ROUTE(mentor._id)} underline="hover">
                {mentor.fullName}
              </MuiLink>
            ) : (
              <Typography variant="body2">{mentor?.fullName || '—'}</Typography>
            )}
          </Stack>
        </Stack>

        {/* Attendees */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="nowrap">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 110 }}>
            Attendees:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ overflow: 'hidden' }}>
            <AvatarGroup max={maxAvatars} sx={{ '& .MuiAvatar-root': { width: 28, height: 28 } }}>
              {visible.map((a) => (
                <Avatar key={a._id} src={a.avatarUrl} alt={a.fullName}>
                  {a.fullName?.[0]}
                </Avatar>
              ))}
            </AvatarGroup>
            <Typography variant="body2" noWrap>
              {visible
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
              {extra > 0 ? ` +${extra} more` : ''}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>

      {/* Actions (mentor only) */}
      {showActions && (
        <>
          <Divider sx={{ mt: 1 }} />
          <CardActions sx={{ px: 2, py: compact ? 1 : 1.25, justifyContent: 'flex-end', gap: 1 }}>
            <Button
              variant="outlined"
              color="error"
              disabled={loading || status !== 'pending'}
              onClick={() => handle(onDecline)}
            >
              Decline
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={loading || status !== 'pending'}
              onClick={() => handle(onApprove)}
            >
              Approve
            </Button>
          </CardActions>
        </>
      )}
    </Card>
  );
};

export default MeetingCard;
