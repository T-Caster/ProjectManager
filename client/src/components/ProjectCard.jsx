import React, { useMemo, useState, useContext } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Chip,
  Stack,
  Typography,
  Divider,
  Box,
  Avatar,
  AvatarGroup,
  Button,
  MenuItem,
  TextField,
  Tooltip,
  IconButton,
  useTheme,
} from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import LaunchIcon from '@mui/icons-material/Launch';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

import { useProjects } from '../contexts/ProjectContext';
import { AuthUserContext } from '../contexts/AuthUserContext';

const STATUS_ORDER = ['proposal', 'specification', 'code', 'presentation', 'done'];
const STATUS_LABELS = {
  proposal: 'Proposal',
  specification: 'Specification',
  code: 'Code',
  presentation: 'Presentation',
  done: 'Done',
};
const STATUS_COLORS = {
  proposal: 'warning',
  specification: 'info',
  code: 'secondary',
  presentation: 'primary',
  done: 'success',
};

const ProjectCard = ({ project, currentUserRole }) => {
  const theme = useTheme();
  const { updateProjectStatus } = useProjects();
  const { user } = useContext(AuthUserContext);
  const isMentor = (currentUserRole || user?.role) === 'mentor';

  const {
    _id,
    name,
    status,
    background,
    objectives,
    students = [],
    mentor,
    snapshots,
    createdAt,
    updatedAt,
  } = project || {};

  const [updating, setUpdating] = useState(false);
  const statusColor = STATUS_COLORS[status] || 'default';
  const statusLabel = STATUS_LABELS[status] || status;

  const nextStatuses = useMemo(() => {
    const idx = STATUS_ORDER.indexOf(status);
    const opts = new Set();
    if (idx > 0) opts.add(STATUS_ORDER[idx - 1]);
    opts.add(STATUS_ORDER[idx]);
    if (idx < STATUS_ORDER.length - 1) opts.add(STATUS_ORDER[idx + 1]);
    if (status !== 'done') opts.add('done');
    return STATUS_ORDER.filter((s) => opts.has(s));
  }, [status]);

  const handleStatusChange = async (newStatus) => {
    if (!newStatus || newStatus === status) return;
    try {
      setUpdating(true);
      await updateProjectStatus(_id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const leftRailColor = theme.palette[statusColor]?.main || theme.palette.divider;

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        background: theme.palette.background.paper,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Status rail */}
      <Box
        sx={{
          position: 'absolute',
          insetInlineStart: 0,
          top: 0,
          bottom: 0,
          width: 4,
          bgcolor: leftRailColor,
          borderTopLeftRadius: 12,
          borderBottomLeftRadius: 12,
        }}
      />

      {/* FULL-WIDTH HEADER ROW */}
      <Box sx={{ pt: 2, px: 2.5 }}>
        <Stack spacing={0.75}>
          <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
            <FolderOpenIcon color={statusColor} />
            <Typography
              variant="h6"
              sx={{
                lineHeight: 1.25,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,      // wrap title to two lines max
                WebkitBoxOrient: 'vertical',
              }}
            >
              {name}
            </Typography>
            <Chip size="small" label={statusLabel} color={statusColor} variant="outlined" />
          </Stack>

          <Typography variant="body2" color="text.secondary">
            Updated {updatedAt ? dayjs(updatedAt).fromNow() : dayjs(createdAt).fromNow()}
          </Typography>
        </Stack>
      </Box>

      <Divider sx={{ mt: 1.25 }} />

      {/* BODY */}
      <CardContent
        sx={{
          display: 'grid',
          gap: 1.25,
          py: 1.75,
          px: 2.5,
        }}
      >
        {/* Mentor */}
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 76 }}>
            Mentor:
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar src={mentor?.avatarUrl} alt={mentor?.fullName} sx={{ width: 24, height: 24 }}>
              {mentor?.fullName?.[0]}
            </Avatar>
            <Typography variant="body2" noWrap>
              {mentor?.fullName || snapshots?.mentorName || '—'}
            </Typography>
          </Stack>
        </Stack>

        {/* Students */}
        <Stack direction="row" spacing={1.25} alignItems="center" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 76 }}>
            Students:
          </Typography>
          <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 26, height: 26 } }}>
            {students.map((s) => (
              <Avatar key={s._id} src={s.avatarUrl} alt={s.fullName}>
                {s.fullName?.[0]}
              </Avatar>
            ))}
          </AvatarGroup>
          <Typography variant="body2" sx={{ minWidth: 0, flex: 1 }}>
            {students.map((s, i) => (
              <React.Fragment key={s._id || i}>
                {i > 0 ? ', ' : ''}
                {s.fullName}
              </React.Fragment>
            ))}
          </Typography>
        </Stack>

        {/* Summary */}
        <Stack direction="row" spacing={1.25} alignItems="flex-start" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 76 }}>
            Summary:
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.45, flex: 1 }}>
            {(background || '').slice(0, 160) || '—'}
            {(background || '').length > 160 ? '…' : ''}
          </Typography>
        </Stack>

        {/* Objectives */}
        <Stack direction="row" spacing={1.25} alignItems="flex-start" flexWrap="wrap">
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 76 }}>
            Objectives:
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.45, flex: 1 }}>
            {(objectives || '').slice(0, 160) || '—'}
            {(objectives || '').length > 160 ? '…' : ''}
          </Typography>
        </Stack>
      </CardContent>

      {/* ACTIONS */}
      <Divider />
      <CardActions
        sx={{
          px: 2.5,
          py: 1.5,
          gap: 1,
          justifyContent: 'space-between',
          flexWrap: 'wrap',
        }}
      >
        <Button
          size="small"
          variant="text"
          endIcon={<LaunchIcon />}
          component={Link}
          to={`/projects/${_id}`}
        >
          View Details
        </Button>

        {isMentor ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            <Tooltip title="Change status">
              <TextField
                size="small"
                select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={updating}
                sx={{ minWidth: 180 }}
              >
                {STATUS_ORDER.map((s) => (
                  <MenuItem key={s} value={s} disabled={s === status}>
                    {STATUS_LABELS[s]}
                  </MenuItem>
                ))}
              </TextField>
            </Tooltip>
            {status !== 'done' && (
              <Tooltip title="Advance to next stage">
                <span>
                  <IconButton
                    size="small"
                    color="primary"
                    disabled={updating || status === 'done'}
                    onClick={() => {
                      const idx = STATUS_ORDER.indexOf(status);
                      const next = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
                      if (next !== status) handleStatusChange(next);
                    }}
                  >
                    <ArrowForwardIcon />
                  </IconButton>
                </span>
              </Tooltip>
            )}
          </Stack>
        ) : null}
      </CardActions>
    </Card>
  );
};

export default ProjectCard;
